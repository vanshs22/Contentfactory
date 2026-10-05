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

const SYSTEM = `You are the Script Agent for short-form video.
Write a tight spoken script that matches the exact requested duration in seconds.
Be concise for very short videos; do not force a 25-35 second structure.
Beats must cover the full duration without gaps and should use conversational spoken language, not essay prose.
Return only JSON.`;

function normalizeBeats(result: ScriptResult, target: number): ScriptResult {
  const sourceTotal = Math.max(0.1, result.duration_sec || result.beats.reduce((max, beat) => Math.max(max, beat.end), 0));
  let previous = 0;
  const beats = result.beats.map((beat, index) => {
    const start = index === 0 ? 0 : previous;
    const end = index === result.beats.length - 1 ? target : Math.max(start + 0.1, (beat.end / sourceTotal) * target);
    previous = end;
    return { ...beat, start, end };
  });
  return { ...result, beats, duration_sec: target };
}

export async function runScript(input: CampaignInput, strategy: StrategyResult, hook: Hook): Promise<ScriptResult> {
  logger.info("Script Agent starting");
  const user = `Brand voice: ${input.brand.voice ?? "professional, clear, confident"}
Audience: ${input.audience}
Exact requested duration: ${input.video_duration_sec} seconds
Strategy: ${JSON.stringify(strategy)}
Selected hook: ${hook.text}

Write the full script and timed beats. duration_sec must be ${input.video_duration_sec} and the last beat must end at ${input.video_duration_sec}.`;

  const result = await chatJson(env.SCRIPT_MODEL, SYSTEM, user, ScriptResultSchema, { temperature: 0.5 });
  const normalized = normalizeBeats(result, input.video_duration_sec);
  logger.info({ duration: normalized.duration_sec, words: normalized.word_count }, "Script complete");
  return normalized;
}
