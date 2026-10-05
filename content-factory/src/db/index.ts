import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { env } from "../config/index.js";
import type { AnalyticsMetric, Campaign, ContentJob, LearningInsight } from "../types/index.js";
import { logger } from "../utils/logger.js";

const dataDir = path.join(env.STORAGE_ROOT, "data");
fs.mkdirSync(dataDir, { recursive: true });
const campaignsPath = path.join(dataDir, "campaigns.json");
const jobsPath = path.join(dataDir, "jobs.json");
const metricsPath = path.join(dataDir, "metrics.json");
const learningsPath = path.join(dataDir, "learnings.json");

type CampaignStore = Record<string, Campaign>;
type JobStore = Record<string, ContentJob>;
type MetricStore = Record<string, AnalyticsMetric>;
type LearningStore = Record<string, LearningInsight>;

function readJson<T>(file: string, fallback: T): T {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, "utf8")) as T;
  } catch (error) {
    logger.warn({ file, error }, "Could not read store; using empty fallback");
    return fallback;
  }
}

function writeJson(file: string, data: unknown): void {
  const temporary = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(data, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  fs.renameSync(temporary, file);
}

function now() { return new Date().toISOString(); }

export const campaigns = {
  create(campaign: Campaign) {
    const store = readJson<CampaignStore>(campaignsPath, {});
    store[campaign.id] = campaign;
    writeJson(campaignsPath, store);
  },
  get(id: string): Campaign | null {
    return readJson<CampaignStore>(campaignsPath, {})[id] ?? null;
  },
  update(id: string, patch: Partial<Campaign>): Campaign {
    const store = readJson<CampaignStore>(campaignsPath, {});
    const existing = store[id];
    if (!existing) throw new Error(`Campaign ${id} not found`);
    const next = { ...existing, ...patch, updated_at: now() };
    store[id] = next;
    writeJson(campaignsPath, store);
    return next;
  },
  list(limit = 50): Campaign[] {
    return Object.values(readJson<CampaignStore>(campaignsPath, {}))
      .sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, Math.min(limit, 100));
  },
};

export const jobs = {
  create(job: ContentJob) {
    const store = readJson<JobStore>(jobsPath, {});
    store[job.id] = job;
    writeJson(jobsPath, store);
  },
  get(id: string): ContentJob | null {
    return readJson<JobStore>(jobsPath, {})[id] ?? null;
  },
  update(id: string, patch: Partial<ContentJob>): ContentJob {
    const store = readJson<JobStore>(jobsPath, {});
    const existing = store[id];
    if (!existing) throw new Error(`Job ${id} not found`);
    const next = { ...existing, ...patch, updated_at: now() };
    store[id] = next;
    writeJson(jobsPath, store);
    return next;
  },
  listByCampaign(campaignId: string): ContentJob[] {
    return Object.values(readJson<JobStore>(jobsPath, {}))
      .filter((job) => job.campaign_id === campaignId).sort((a, b) => a.created_at.localeCompare(b.created_at));
  },
  list(limit = 50): ContentJob[] {
    return Object.values(readJson<JobStore>(jobsPath, {}))
      .sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, Math.min(limit, 100));
  },
};

logger.info({ dataDir }, "Atomic JSON store ready (single-node mode)");

export const analytics = {
  create(metric: Omit<AnalyticsMetric, "id">): AnalyticsMetric {
    const store = readJson<MetricStore>(metricsPath, {});
    const record = { ...metric, id: randomUUID() };
    store[record.id] = record;
    writeJson(metricsPath, store);
    return record;
  },
  list(jobId?: string): AnalyticsMetric[] {
    return Object.values(readJson<MetricStore>(metricsPath, {}))
      .filter((metric) => !jobId || metric.job_id === jobId)
      .sort((a, b) => (b.captured_at ?? "").localeCompare(a.captured_at ?? ""));
  },
};

export const learnings = {
  create(insight: Omit<LearningInsight, "id" | "created_at">): LearningInsight {
    const store = readJson<LearningStore>(learningsPath, {});
    const record = { ...insight, id: randomUUID(), created_at: now() };
    store[record.id] = record;
    writeJson(learningsPath, store);
    return record;
  },
  list(limit = 100): LearningInsight[] {
    return Object.values(readJson<LearningStore>(learningsPath, {}))
      .sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, Math.min(limit, 100));
  },
};
