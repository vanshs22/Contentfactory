import { chatJson } from "../services/llm.js";
import { env } from "../config/index.js";
import { z } from "zod";
import {
  HookSchema,
  type CampaignInput,
  type StrategyResult,
  type Hook,
} from "../types/index.js";
import { logger } from "../utils/logger.js";

const HooksArraySchema = z.object({
  hooks: z.array(HookSchema).min(5).max(20),
});

const SYSTEM = `You are the Hook Agent. Generate scroll-stopping opening lines for short-form video.
Score each hook 0-100 on: curiosity, clarity, novelty, emotional_impact, audience_relevance, scroll_stop.
total = average of the six scores.
Prefer concrete numbers, tension, or pattern interrupts. No clickbait lies.
Return JSON { "hooks": [ ... ] }.`;

export async function runHooks(
  input: CampaignInput,
  strategy: StrategyResult
): Promise<{ hooks: Hook[]; selected: Hook }> {
  logger.info("Hook Agent starting");
  const user = `Audience: ${input.audience}
Niche: ${input.niche}
Topic: ${strategy.topic}
Angle: ${strategy.angle}
CTA: ${strategy.cta}

Generate 12 strong hooks. Rank by total.`;

  const result = await chatJson(
    env.SCRIPT_MODEL,
    SYSTEM,
    user,
    HooksArraySchema,
    { temperature: 0.7 }
  );
  const sorted = [...result.hooks].sort((a, b) => b.total - a.total);
  const selected = sorted[0];
  logger.info({ selected: selected.text, score: selected.total }, "Hook selected");
  return { hooks: sorted, selected };
}
