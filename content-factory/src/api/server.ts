import express from "express";
import cors from "cors";
import path from "node:path";
import { env } from "../config/index.js";
import { logger } from "../utils/logger.js";
import { campaigns, jobs } from "../db/index.js";
import { createCampaign, runCampaign, runJob } from "../core/director.js";
import { CampaignInputSchema } from "../types/index.js";
import { hasLLM } from "../services/llm.js";
import { hasBuffer } from "../services/buffer.js";
import { listStyleRecipes } from "../styles/catalog.js";
import { getLearnings, getMetrics, learnFromMetrics, recordMetrics } from "../services/analytics.js";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(cors({ origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN }));
  app.use(express.json({ limit: "2mb" }));

  // Serve rendered assets publicly so Buffer can fetch video URLs
  app.use(
    "/assets",
    express.static(path.join(env.STORAGE_ROOT, "assets"), {
      setHeaders(res) {
        res.setHeader("Cache-Control", "public, max-age=3600");
      },
    })
  );

  app.get("/health", (_req, res) => {
    res.json({
      ok: true,
      llm: hasLLM(),
      buffer: hasBuffer(),
      time: new Date().toISOString(),
    });
  });

  app.get("/ready", (_req, res) => {
    const ready = env.NODE_ENV !== "production" || hasLLM();
    res.status(ready ? 200 : 503).json({ ready, llm: hasLLM(), buffer: hasBuffer() });
  });

  app.get("/styles", (_req, res) => {
    res.json({ styles: listStyleRecipes() });
  });

  app.post("/analytics/metrics", (req, res) => {
    try {
      const metric = recordMetrics(req.body);
      const job = jobs.get(metric.job_id);
      if (!job) return res.status(404).json({ error: "job not found" });
      const learning = learnFromMetrics(job, metric);
      return res.status(201).json({ metric, learning });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  });

  app.get("/analytics/metrics", (req, res) => {
    res.json({ metrics: getMetrics(typeof req.query.job_id === "string" ? req.query.job_id : undefined) });
  });

  app.get("/learnings", (_req, res) => {
    res.json({ learnings: getLearnings() });
  });

  app.post("/campaigns", async (req, res) => {
    try {
      const campaign = await createCampaign(req.body);
      res.status(201).json(campaign);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.get("/campaigns", (_req, res) => {
    res.json(campaigns.list());
  });

  app.get("/campaigns/:id", (req, res) => {
    const c = campaigns.get(req.params.id);
    if (!c) return res.status(404).json({ error: "not found" });
    const jobList = jobs.listByCampaign(c.id);
    res.json({ ...c, jobs: jobList });
  });

  app.post("/campaigns/:id/run", async (req, res) => {
    try {
      // Fire-and-forget for long-running production; return immediately
      const campaign = campaigns.get(req.params.id);
      if (!campaign) return res.status(404).json({ error: "not found" });
      res.status(202).json({ accepted: true, campaign_id: campaign.id });
      runCampaign(campaign.id).catch((err) =>
        logger.error({ err: err.message }, "Background campaign failed")
      );
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/jobs/:id/run", async (req, res) => {
    try {
      const job = jobs.get(req.params.id);
      if (!job) return res.status(404).json({ error: "not found" });
      res.status(202).json({ accepted: true, job_id: job.id });
      runJob(job.id).catch((err) =>
        logger.error({ err: err.message }, "Background job failed")
      );
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/jobs", (_req, res) => {
    res.json(jobs.list());
  });

  app.get("/jobs/:id", (req, res) => {
    const j = jobs.get(req.params.id);
    if (!j) return res.status(404).json({ error: "not found" });
    res.json(j);
  });

  // Sync run for CLI / testing (blocks until done)
  app.post("/production/run", async (req, res) => {
    try {
      const input = CampaignInputSchema.parse(req.body);
      const campaign = await createCampaign(input);
      const result = await runCampaign(campaign.id);
      const jobList = jobs.listByCampaign(result.id);
      res.json({ campaign: result, jobs: jobList });
    } catch (e: any) {
      logger.error({ err: e.message }, "production/run failed");
      res.status(500).json({ error: e.message });
    }
  });

  return app;
}

export function startServer() {
  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, "Content Factory API listening");
  });
  const shutdown = (signal: string) => {
    logger.info({ signal }, "Shutting down Content Factory API");
    server.close(() => process.exit(0));
  };
  process.once("SIGTERM", () => shutdown("SIGTERM"));
  process.once("SIGINT", () => shutdown("SIGINT"));
  return server;
}
