import { chatJson } from "../services/llm.js";
import { env } from "../config/index.js";
import {
  QCScoreSchema,
  type VisualSpec,
  type ScriptResult,
  type QCScore,
} from "../types/index.js";
import { logger } from "../utils/logger.js";

const SYSTEM = `You are the Quality Control Agent.
Score a content package before publish. Scores are 0-100 integers.
overall is the average of the eight dimensions.
pass is true only if overall >= ${env.QC_MIN_SCORE} and technical_validity >= 90.
Be strict on readability and hook strength for short-form vertical video.
Return only JSON.`;

export async function runQC(
  script: ScriptResult,
  visual: VisualSpec,
  lintNotes: string[] = []
): Promise<QCScore> {
  logger.info("QC Agent starting");
  const user = `Script:
${JSON.stringify(script, null, 2)}

Visual:
${JSON.stringify(visual, null, 2)}

HyperFrames lint notes:
${lintNotes.length ? lintNotes.join("\n") : "none"}

Score visual_quality, typography, readability, composition, brand_consistency,
storytelling, hook_strength, technical_validity, overall, notes[], pass.`;

  const result = await chatJson(env.QC_MODEL, SYSTEM, user, QCScoreSchema, {
    temperature: 0.2,
  });
  logger.info({ overall: result.overall, pass: result.pass }, "QC complete");
  return result;
}
