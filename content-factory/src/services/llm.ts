import OpenAI from "openai";
import { env } from "../config/index.js";
import { logger } from "../utils/logger.js";
import { z } from "zod";

const client = env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: env.OPENAI_API_KEY,
      baseURL: env.OPENAI_BASE_URL,
    })
  : null;

export async function chatJson<T>(
  model: string,
  system: string,
  user: string,
  schema: z.ZodType<T>,
  opts?: { temperature?: number; maxTokens?: number }
): Promise<T> {
  if (!client) {
    throw new Error(
      "OPENAI_API_KEY is not set. Set it in .env to run agents against a real model."
    );
  }

  const response = await client.chat.completions.create({
    model,
    temperature: opts?.temperature ?? 0.4,
    max_tokens: opts?.maxTokens ?? 4096,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      {
        role: "user",
        content:
          user +
          "\n\nRespond with a single valid JSON object only. No markdown fences.",
      },
    ],
  });

  const raw = response.choices[0]?.message?.content ?? "{}";
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    logger.error({ raw }, "LLM returned non-JSON");
    throw new Error("LLM returned invalid JSON");
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    logger.error({ errors: result.error.flatten(), parsed }, "Schema validation failed");
    throw new Error(`Schema validation failed: ${result.error.message}`);
  }
  return result.data;
}

export async function chatText(
  model: string,
  system: string,
  user: string,
  opts?: { temperature?: number; maxTokens?: number }
): Promise<string> {
  if (!client) {
    throw new Error("OPENAI_API_KEY is not set.");
  }
  const response = await client.chat.completions.create({
    model,
    temperature: opts?.temperature ?? 0.5,
    max_tokens: opts?.maxTokens ?? 2048,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  return response.choices[0]?.message?.content ?? "";
}

export function hasLLM(): boolean {
  return Boolean(client);
}
