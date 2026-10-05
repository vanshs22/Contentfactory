import { chatJson } from "../services/llm.js";
import { env } from "../config/index.js";
import {
  VisualSpecSchema,
  type CampaignInput,
  type StrategyResult,
  type ScriptResult,
  type SceneSpec,
  type StyleBible,
  type StyleId,
  type VisualSpec,
} from "../types/index.js";
import { selectStyle } from "../styles/catalog.js";
import { buildStyleBible, lockSceneMediaPrompt } from "../styles/prompt.js";
import { logger } from "../utils/logger.js";

const SYSTEM = `You are the Visual Director for a HyperFrames-based content factory.
Convert a spoken script into a deterministic scene specification for HTML video and prompt-guided media generation.
The user style prompt may be any visual style: realistic, 3D, cinematic, animation, cartoon, stick figure, or a completely custom description.
Create exactly one style_bible for the whole video. Every scene must follow that bible and include a media_prompt plus media_status "prompt-only".
Never change character identity, palette, lens, lighting, materials, line weight, or rendering method between scenes.
Choose a catalog template only as a stable composition fallback; the style prompt controls the visual direction.
Animations may be fade|slide|scale|reveal|counter|kinetic-type. Keep text short enough for mobile safe areas.
Scenes must cover the requested duration. Never invent external media URLs. Return only JSON matching the visual spec schema.`;

type SceneDraft = Omit<SceneSpec, "media_prompt" | "media_status"> & Partial<Pick<SceneSpec, "media_prompt" | "media_status">>;

function normalizeScenes(result: { scenes: SceneDraft[] }, targetDuration: number, bible: StyleBible): SceneSpec[] {
  if (!result.scenes.length) return [];
  const sourceTotal = result.scenes.reduce((total, scene) => total + Math.max(0.1, scene.duration), 0);
  let elapsed = 0;
  return result.scenes.map((scene, index) => {
    const duration = index === result.scenes.length - 1
      ? Math.max(0.1, targetDuration - elapsed)
      : Math.max(0.1, (Math.max(0.1, scene.duration) / sourceTotal) * targetDuration);
    elapsed += duration;
    return {
      ...scene,
      duration,
      media_prompt: lockSceneMediaPrompt(bible, scene.media_prompt || scene.visual),
      media_status: "prompt-only" as const,
    };
  });
}

export async function runVisualDirector(
  input: CampaignInput,
  strategy: StrategyResult,
  script: ScriptResult,
  revisionNotes: string[] = [],
  lockedBible?: StyleBible
): Promise<VisualSpec> {
  logger.info("Visual Director starting");
  const selectedStyle = selectStyle(input);
  const bible = lockedBible ?? buildStyleBible(input, selectedStyle);
  const targetDuration = input.video_duration_sec;
  const user = `Brand: ${JSON.stringify(input.brand)}
User style prompt: ${input.style_prompt ?? "Use the selected catalog recipe as the visual direction"}
Locked style bible: ${JSON.stringify(bible)}
Strategy: ${JSON.stringify(strategy)}
Script: ${JSON.stringify(script)}
Fallback composition recipe: ${JSON.stringify(selectedStyle)}
${revisionNotes.length ? `Revision notes from QC (keep the locked bible unchanged):\n${revisionNotes.join("\n")}` : ""}

Produce VisualSpec with style_id "${input.style_prompt ? "custom" : selectedStyle.id}", template "${selectedStyle.template}", theme "${selectedStyle.theme}", duration ${targetDuration}, aspect "9:16", the locked style_bible, and scenes array. Every scene needs a specific media_prompt describing subject, action, camera, lighting, and composition while repeating the locked continuity rules. Set every media_status to "prompt-only".`;

  const result = await chatJson(env.VISUAL_MODEL, SYSTEM, user, VisualSpecSchema, { temperature: 0.4 });
  const normalizedBible = lockedBible ?? {
    ...bible,
    source_prompt: input.style_prompt ?? bible.source_prompt,
  };
  const resolvedStyleId = (input.style_prompt ? "custom" : input.viral_style ?? result.style_id ?? selectedStyle.id) as StyleId;
  const normalized: VisualSpec = {
    ...result,
    style_id: resolvedStyleId,
    style_bible: normalizedBible,
    template: result.template || selectedStyle.template,
    theme: result.theme || selectedStyle.theme,
    aspect: result.aspect ?? "9:16",
    duration: targetDuration,
    scenes: normalizeScenes(result, targetDuration, normalizedBible),
    brand_colors: result.brand_colors ?? input.brand.colors,
    logo_url: result.logo_url ?? input.brand.logoUrl,
  };
  logger.info({ template: normalized.template, style: normalized.style_id, profile: normalized.style_bible.profile, scenes: normalized.scenes.length }, "Visual spec ready");
  return normalized;
}
