import { randomUUID as uuid } from "node:crypto";
import { CampaignInputSchema, type CampaignInput, type ContentJob, type Campaign, type Platform } from "../types/index.js";
import { campaigns, jobs } from "../db/index.js";
import { runResearch } from "../agents/research.js";
import { runStrategy } from "../agents/strategy.js";
import { runHooks } from "../agents/hook.js";
import { runScript } from "../agents/script.js";
import { runVisualDirector } from "../agents/visual.js";
import { runQC } from "../agents/qc.js";
import { renderVisualSpec, publicAssetUrl } from "../services/hyperframes.js";
import { createPost, hasBuffer, resolveChannelIds } from "../services/buffer.js";
import { env } from "../config/index.js";
import { selectStyle } from "../styles/catalog.js";
import { logger } from "../utils/logger.js";
import { hasLLM } from "../services/llm.js";
import fs from "node:fs";
import path from "node:path";

const activeJobs = new Set<string>();

function now() {
  return new Date().toISOString();
}

export async function createCampaign(raw: unknown): Promise<Campaign> {
  const input = CampaignInputSchema.parse(raw);
  const id = uuid();
  const jobIds: string[] = [];
  campaigns.create({ id, input, status: "planning", job_ids: [], created_at: now(), updated_at: now() });

  for (let index = 0; index < input.volume; index += 1) {
    const jobId = uuid();
    const job: ContentJob = {
      id: jobId,
      campaign_id: id,
      status: "pending",
      input,
      selected_style: input.style_prompt ? "custom" : selectStyle(input).id,
      revision_count: 0,
      created_at: now(),
      updated_at: now(),
    };
    jobs.create(job);
    jobIds.push(jobId);
  }
  campaigns.update(id, { job_ids: jobIds, status: "producing" });
  logger.info({ campaignId: id, jobCount: jobIds.length }, "Campaign created");
  return campaigns.get(id)!;
}

function platformCaption(platform: Platform, job: ContentJob): string {
  const hook = job.selected_hook?.text ?? "";
  const script = job.script?.full_script?.slice(0, 360) ?? "";
  const cta = job.strategy?.cta ?? "";
  const style = job.selected_style ?? "short-form";
  if (platform === "linkedin") return `${hook}\n\n${script}\n\nLesson: ${cta}\n\n#${style}`.trim();
  if (platform === "x" || platform === "threads") return `${hook}\n\n${script}\n\n${cta}`.trim();
  if (platform === "youtube") return `${hook}\n\n${script}\n\n${cta}\n\n#Shorts #${style}`.trim();
  return `${hook}\n\n${script}\n\n${cta}\n\n#${style}`.trim();
}

export async function runJob(jobId: string): Promise<ContentJob> {
  let job = jobs.get(jobId);
  if (!job) throw new Error(`Job ${jobId} not found`);
  if (activeJobs.has(jobId)) return job;
  if (job.status === "completed") return job;

  activeJobs.add(jobId);
  try {
    if (!hasLLM()) {
      return jobs.update(jobId, { status: "failed", error: "OPENAI_API_KEY not configured" });
    }

    job = jobs.update(jobId, { status: "researching", error: undefined });
    const research = await runResearch(job.input);
    job = jobs.update(jobId, { research });

    job = jobs.update(jobId, { status: "strategizing" });
    const strategy = await runStrategy(job.input, research);
    job = jobs.update(jobId, { strategy });

    const { hooks, selected } = await runHooks(job.input, strategy);
    job = jobs.update(jobId, { hooks, selected_hook: selected });

    job = jobs.update(jobId, { status: "scripting" });
    const script = await runScript(job.input, strategy, selected);
    job = jobs.update(jobId, { script });

    job = jobs.update(jobId, { status: "visualizing" });
    let visual = await runVisualDirector(job.input, strategy, script);
    job = jobs.update(jobId, { visual, selected_style: visual.style_id });

    let pass = false;
    while (!pass && job.revision_count <= env.MAX_REVISIONS) {
      job = jobs.update(jobId, { status: "rendering" });
      const render = await renderVisualSpec(jobId, visual);
      if (!render.renderOk || !render.lintOk) {
        return jobs.update(jobId, {
          status: "failed",
          error: `${render.renderOk ? "HyperFrames lint failed" : "Render failed"}: ${render.renderOutput.slice(0, 800)}`,
        });
      }

      const publicDir = path.join(env.STORAGE_ROOT, "assets");
      fs.mkdirSync(publicDir, { recursive: true });
      const publicPath = path.join(publicDir, `${jobId}.mp4`);
      fs.copyFileSync(render.outputPath, publicPath);
      job = jobs.update(jobId, {
        status: "qc",
        render_path: render.outputPath,
        public_url: publicAssetUrl(jobId),
        render_hash: render.hash,
        render_metadata: render.metadata,
      });

      const qc = await runQC(script, visual, [render.lintOutput]);
      job = jobs.update(jobId, { qc });
      if (qc.pass) {
        pass = true;
        break;
      }
      if (job.revision_count >= env.MAX_REVISIONS) {
        return jobs.update(jobId, { status: "failed", error: `QC failed after ${env.MAX_REVISIONS} revisions: ${qc.notes.join("; ")}` });
      }

      logger.info({ jobId, overall: qc.overall }, "QC failed — revising visual");
      job = jobs.update(jobId, { status: "revising", revision_count: job.revision_count + 1 });
      visual = await runVisualDirector(job.input, strategy, script, qc.notes, visual.style_bible);
      job = jobs.update(jobId, { visual, selected_style: visual.style_id });
    }

    if (!pass) return jobs.update(jobId, { status: "failed", error: "QC did not pass" });

    if (hasBuffer() && job.public_url) {
      job = jobs.update(jobId, { status: "publishing" });
      try {
        const channelMap = await resolveChannelIds(env.BUFFER_ORG_ID!, job.input.platforms);
        const posts: Record<string, unknown> = {};
        for (const platform of job.input.platforms) {
          const channelId = channelMap[platform];
          if (!channelId) {
            posts[platform] = { error: "No Buffer channel mapped" };
            continue;
          }
          posts[platform] = await createPost({
            channelId,
            text: platformCaption(platform, job),
            videoUrl: job.public_url,
            saveToDraft: true,
          });
        }
        job = jobs.update(jobId, { platform_posts: posts, status: "completed" });
      } catch (pubErr: any) {
        logger.error({ err: pubErr.message }, "Buffer publish failed");
        job = jobs.update(jobId, { status: "completed", error: `Assets ready; Buffer error: ${pubErr.message}`, platform_posts: { error: pubErr.message } });
      }
    } else {
      job = jobs.update(jobId, { status: "completed" });
    }

    logger.info({ jobId, status: job.status }, "Job finished");
    return job;
  } catch (err: any) {
    logger.error({ jobId, err: err.message }, "Job failed");
    return jobs.update(jobId, { status: "failed", error: err.message });
  } finally {
    activeJobs.delete(jobId);
  }
}

export async function runCampaign(campaignId: string): Promise<Campaign> {
  const campaign = campaigns.get(campaignId);
  if (!campaign) throw new Error(`Campaign ${campaignId} not found`);
  for (const jobId of campaign.job_ids) await runJob(jobId);
  const finalJobs = jobs.listByCampaign(campaign.id);
  const status = finalJobs.every((job) => job.status === "completed") ? "completed" : finalJobs.some((job) => job.status === "failed") ? "failed" : "producing";
  return campaigns.update(campaignId, { status });
}
