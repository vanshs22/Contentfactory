import { chatJson } from "../services/llm.js";
import { env } from "../config/index.js";
import {
  VisualSpecSchema,
  type CampaignInput,
  type StrategyResult,
  type ScriptResult,
  type VisualSpec,
} from "../types/index.js";
import { selectStyle } from "../styles/catalog.js";
import { logger } from "../utils/logger.js";

const SYSTEM = `You are the Visual Director for a HyperFrames-based content factory.
Convert a spoken script into a deterministic scene specification for HTML video.
Choose a style_id from: kinetic-captions, pattern-interrupt, listicle-countdown, bold-stat, split-screen, before-after, news-alert, storytime-confessional, cinematic-broll, podcast-clip, product-demo.
Choose a theme from: luxury, modern, editorial, finance, minimal, energetic.
Each scene needs: scene number, duration (seconds), purpose, visual description, animation (fade|slide|scale|reveal|counter|kinetic-type), text on screen, optional emphasis and background.
Scenes must sum to the script duration. Never invent external image URLs. Keep on-screen text short enough for mobile safe areas.
Return only JSON matching the visual spec schema.`;

export async function runVisualDirector(
  input: CampaignInput,
  strategy: StrategyResult,
  script: ScriptResult,
  revisionNotes: string[] = []
): Promise<VisualSpec> {
  logger.info("Visual Director starting");
  const selectedStyle = selectStyle(input);
  const user = `Brand: ${JSON.stringify(input.brand)}
Strategy: ${JSON.stringify(strategy)}
Script: ${JSON.stringify(script)}
Preferred viral style recipe: ${JSON.stringify(selectedStyle)}
${revisionNotes.length ? `Revision notes from QC:\n${revisionNotes.join("\n")}` : ""}

Produce VisualSpec with style_id "${selectedStyle.id}", template "${selectedStyle.template}", theme "${selectedStyle.theme}", duration ${script.duration_sec}, aspect "9:16", and scenes array.`;

  const result = await chatJson(
    env.VISUAL_MODEL,
    SYSTEM,
    user,
    VisualSpecSchema,
    { temperature: 0.4 }
  );
  const normalized: VisualSpec = {
    ...result,
    style_id: input.viral_style ?? result.style_id ?? selectedStyle.id,
    template: result.template || selectedStyle.template,
    theme: result.theme || selectedStyle.theme,
    aspect: result.aspect ?? "9:16",
    duration: script.duration_sec,
    brand_colors: result.brand_colors ?? input.brand.colors,
    logo_url: result.logo_url ?? input.brand.logoUrl,
  };
  logger.info({ template: normalized.template, style: normalized.style_id, scenes: normalized.scenes.length }, "Visual spec ready");
  return normalized;
}
