import { AnalyticsMetricSchema, type AnalyticsMetric, type ContentJob, type LearningInsight } from "../types/index.js";
import { analytics, learnings } from "../db/index.js";

export function recordMetrics(raw: unknown): AnalyticsMetric {
  const parsed = AnalyticsMetricSchema.parse(raw);
  return analytics.create({ ...parsed, captured_at: parsed.captured_at ?? new Date().toISOString() });
}

export function getMetrics(jobId?: string): AnalyticsMetric[] {
  return analytics.list(jobId);
}

export function learnFromMetrics(job: ContentJob, metric: AnalyticsMetric): LearningInsight {
  const interactions = metric.likes + metric.comments + metric.shares + metric.saves;
  const engagementRate = metric.views > 0 ? (interactions / metric.views) * 100 : 0;
  const completion = metric.completion_rate == null ? "completion was not supplied" : `${(metric.completion_rate * 100).toFixed(1)}% completed`;
  return learnings.create({
    style_id: job.selected_style as LearningInsight["style_id"],
    platform: metric.platform,
    statement: `${job.selected_style ?? "selected"} style produced ${engagementRate.toFixed(2)}% interaction rate on ${metric.platform}.`,
    evidence: `${metric.views} views, ${interactions} interactions; ${completion}.`,
    confidence: Math.min(0.99, Math.max(0.1, Math.log10(metric.views + 10) / 8)),
  });
}

export function getLearnings(limit?: number): LearningInsight[] {
  return learnings.list(limit);
}
