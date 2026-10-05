import { env } from "../config/index.js";
import { logger } from "../utils/logger.js";
import type { Platform } from "../types/index.js";

const ENDPOINT = "https://api.buffer.com";

async function gql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  if (!env.BUFFER_API_KEY) {
    throw new Error("BUFFER_API_KEY is not set");
  }
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.BUFFER_API_KEY}`,
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join("; "));
  }
  if (!json.data) throw new Error("Empty Buffer response");
  return json.data;
}

export async function listOrganizations() {
  return gql<{
    account: {
      id: string;
      organizations: { id: string; name: string }[];
    };
  }>(`query { account { id organizations { id name } } }`);
}

export async function listChannels(organizationId: string) {
  return gql<{
    channels: {
      id: string;
      name: string;
      service: string;
      avatar?: string;
    }[];
  }>(
    `query($input: ChannelsInput!) {
      channels(input: $input) { id name service avatar }
    }`,
    { input: { organizationId } }
  );
}

/** Map our platform names to Buffer service strings */
const SERVICE_MAP: Record<Platform, string[]> = {
  instagram: ["instagram"],
  tiktok: ["tiktok"],
  youtube: ["youtube"],
  x: ["twitter", "x"],
  linkedin: ["linkedin"],
  facebook: ["facebook"],
  threads: ["threads"],
};

export async function resolveChannelIds(
  orgId: string,
  platforms: Platform[]
): Promise<Record<Platform, string | null>> {
  const { channels } = await listChannels(orgId);
  const out: Record<string, string | null> = {};
  for (const p of platforms) {
    const services = SERVICE_MAP[p] ?? [p];
    const match = channels.find((c) =>
      services.some((s) => c.service.toLowerCase().includes(s))
    );
    out[p] = match?.id ?? null;
  }
  return out as Record<Platform, string | null>;
}

export interface CreatePostInput {
  channelId: string;
  text: string;
  scheduledAt?: string; // ISO
  videoUrl?: string;
  imageUrl?: string;
  saveToDraft?: boolean;
}

/**
 * Create a post via Buffer GraphQL.
 * Media must be a publicly reachable URL at publish time.
 */
export async function createPost(input: CreatePostInput) {
  const assets: unknown[] = [];
  if (input.videoUrl) {
    assets.push({ video: { url: input.videoUrl } });
  } else if (input.imageUrl) {
    assets.push({ image: { url: input.imageUrl } });
  }

  const mutation = `
    mutation CreatePost($input: CreatePostInput!) {
      createPost(input: $input) {
        ... on CreatePostSuccess {
          post { id text dueAt channelId status }
        }
        ... on CreatePostError {
          message
        }
      }
    }
  `;

  // Schema field names evolve; this follows Buffer's 2026 GraphQL patterns.
  // If the live schema differs, adjust input shape using the API explorer.
  const variables = {
    input: {
      channelId: input.channelId,
      text: input.text,
      dueAt: input.scheduledAt ?? null,
      saveToDraft: input.saveToDraft ?? false,
      assets: assets.length ? assets : undefined,
    },
  };

  logger.info({ channelId: input.channelId }, "Creating Buffer post");
  const data = await gql<{ createPost: any }>(mutation, variables);
  return data.createPost;
}

export function hasBuffer(): boolean {
  return Boolean(env.BUFFER_API_KEY && env.BUFFER_ORG_ID);
}
