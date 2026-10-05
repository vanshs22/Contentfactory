import { chatJson } from "../services/llm.js";
import { env } from "../config/index.js";
import {
  ScriptResultSchema,
  type CampaignInput,
  type StrategyResult,
  type Hook,
  type ScriptResult,
} from "../types/index.js";
import { logger } from "../utils/logger.js";

const SYSTEM = `You are the Script Agent for short-form video (25-35 seconds spoken).
Write a tight spoken script that matches the strategy structure timings.
beats must cover the full duration without gaps.
Use conversational spoken language, not essay prose.
Return only JSON.`;

export async function runScript(
  input: CampaignInput,
  strategy: StrategyResult,
  hook: Hook
): Promise<ScriptResult> {
  logger.info("Script Agent starting");
  const user = `Brand voice: ${input.brand.voice ?? "professional, clear, confident"}
Audience: ${input.audience}
Strategy: ${JSON.stringify(strategy)}
Selected hook: ${hook.text}

Write the full script and timed beats. duration_sec should match the sum of structure seconds.`;

  const result = await chatJson(
    env.SCRIPT_MODEL,
    SYSTEM,
    user,
    ScriptResultSchema,
    { temperature: 0.5 }
  );
  logger.info({ duration: result.duration_sec, words: result.word_count }, "Script complete");
  return result;
}
