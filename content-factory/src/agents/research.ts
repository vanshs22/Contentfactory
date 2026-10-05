import { chatJson } from "../services/llm.js";
import { env } from "../config/index.js";
import {
  ResearchResultSchema,
  type CampaignInput,
  type ResearchResult,
} from "../types/index.js";
import { logger } from "../utils/logger.js";

const SYSTEM = `You are the Research Agent for a professional content factory.
Your job is to produce structured, actionable research for short-form social video content.
Return only JSON matching the schema. Prefer concrete statistics, real questions audiences ask, and defensible sources.
Do not invent fake URLs; if you lack a real source, omit the source field or mark as "industry knowledge".
Focus on the niche and audience provided.`;

export async function runResearch(input: CampaignInput): Promise<ResearchResult> {
  logger.info({ niche: input.niche }, "Research Agent starting");
  const user = `Campaign brief:
Goal: ${input.goal}
Niche: ${input.niche}
Audience: ${input.audience}
Platforms: ${input.platforms.join(", ")}
Content goal: ${input.content_goal}

Produce research with:
- trends (5-8 current trends)
- statistics (4-8 claims with optional sources)
- stories (3-5 narrative angles)
- questions (5-10 questions the audience actually asks)
- competitors (3-6 competitor content patterns or accounts)
- sources (list of source names or domains)
- summary (2-4 sentence research brief for the strategy agent)`;

  const result = await chatJson(
    env.RESEARCH_MODEL,
    SYSTEM,
    user,
    ResearchResultSchema,
    { temperature: 0.3 }
  );
  logger.info({ trends: result.trends.length }, "Research complete");
  return result;
}
