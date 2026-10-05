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
Use the exact requested duration in seconds; do not default to 25-35 seconds when the brief specifies another duration.
Choose one clear topic, one angle, one primary format, and a timed structure whose parts sum to the exact requested duration.
Return only JSON.`;

function normalizeStructure(strategy: StrategyResult, target: number): StrategyResult {
  const values = strategy.structure;
  const total = Object.values(values).reduce((sum, value) => sum + Math.max(0.1, value), 0);
  const keys = ["hook_sec", "problem_sec", "value_sec", "payoff_sec", "cta_sec"] as const;
  let elapsed = 0;
  const structure = Object.fromEntries(keys.map((key, index) => {
    const value = index === keys.length - 1
      ? Math.max(0.1, target - elapsed)
      : Math.max(0.1, (Math.max(0.1, values[key]) / total) * target);
    elapsed += value;
    return [key, value];
  })) as StrategyResult["structure"];
  return { ...strategy, structure };
}

export async function runStrategy(input: CampaignInput, research: ResearchResult): Promise<StrategyResult> {
  logger.info("Strategy Agent starting");
  const user = `Brief:
${JSON.stringify(input, null, 2)}
Requested exact video duration: ${input.video_duration_sec} seconds

Research:
${JSON.stringify(research, null, 2)}

Produce strategy with topic, angle, format (reel|carousel|short|thread|post),
platform_priority ordered list, objective, cta, expected_outcome,
and structure { hook_sec, problem_sec, value_sec, payoff_sec, cta_sec } summing to exactly ${input.video_duration_sec}.`;

  const result = await chatJson(env.DIRECTOR_MODEL, SYSTEM, user, StrategyResultSchema, { temperature: 0.35 });
  const normalized = normalizeStructure(result, input.video_duration_sec);
  logger.info({ topic: normalized.topic, duration: input.video_duration_sec }, "Strategy complete");
  return normalized;
}
