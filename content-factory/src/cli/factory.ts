#!/usr/bin/env node
/**
 * CLI entry: create + run a campaign synchronously.
 * Usage:
 *   npx tsx src/cli/factory.ts --niche "luxury real estate" --audience "US investors"
 */
import { createCampaign, runCampaign } from "../core/director.js";
import { jobs } from "../db/index.js";
import { logger } from "../utils/logger.js";
import { CampaignInputSchema } from "../types/index.js";

function arg(name: string, fallback?: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1];
  return fallback;
}

async function main() {
  const input = CampaignInputSchema.parse({
    goal: arg("goal", "Create high-performing short-form content"),
    niche: arg("niche", "luxury real estate"),
    audience: arg("audience", "US investors"),
    platforms: (arg("platforms", "instagram,tiktok,youtube") || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    content_goal: arg("content_goal", "growth"),
    viral_style: arg("viral_style"),
    style_prompt: arg("style_prompt"),
    video_duration_sec: Number(arg("video_duration_sec", "30")),
    brand: {
      name: arg("brand", "Apex Estates"),
      voice: arg("voice", "confident, data-driven, premium"),
    },
    volume: 1,
    duration_days: 1,
  });

  logger.info({ input }, "Creating campaign");
  const campaign = await createCampaign(input);
  const result = await runCampaign(campaign.id);
  const jobList = jobs.listByCampaign(result.id);
  console.log(JSON.stringify({ campaign: result, jobs: jobList }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
