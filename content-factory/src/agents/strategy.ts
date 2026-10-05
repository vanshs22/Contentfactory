import { chatJson } from "../services/llm.js";
import { env } from "../config/index.js";
import {
  StrategyResultSchema,
  type CampaignInput,
  type ResearchResult,
  type StrategyResult,
} from "../types/index.js";
import { logger } from "../utils/logger.js";

const SYSTEM = `You are the Strategy Agent for a content factory.
Convert research into a single high-leverage content strategy for short-form video (Reels/TikTok/Shorts).
Choose one clear topic, one angle, one primary format, and a timed structure in seconds that sums to ~25-35s.
Return only JSON.`;

export async function runStrategy(
  input: CampaignInput,
  research: ResearchResult
): Promise<StrategyResult> {
  logger.info("Strategy Agent starting");
  const user = `Brief:
${JSON.stringify(input, null, 2)}

Research:
${JSON.stringify(research, null, 2)}

Produce strategy with topic, angle, format (reel|carousel|short|thread|post),
platform_priority ordered list, objective, cta, expected_outcome,
and structure { hook_sec, problem_sec, value_sec, payoff_sec, cta_sec }.`;

  const result = await chatJson(
    env.DIRECTOR_MODEL,
    SYSTEM,
    user,
    StrategyResultSchema,
    { temperature: 0.35 }
  );
  logger.info({ topic: result.topic }, "Strategy complete");
  return result;
}
