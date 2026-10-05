import { z } from "zod";

export const PlatformSchema = z.enum([
  "instagram",
  "tiktok",
  "youtube",
  "x",
  "linkedin",
  "facebook",
  "threads",
]);
export type Platform = z.infer<typeof PlatformSchema>;

export const ViralStyleSchema = z.enum([
  "kinetic-captions",
  "pattern-interrupt",
  "listicle-countdown",
  "bold-stat",
  "split-screen",
  "before-after",
  "news-alert",
  "storytime-confessional",
  "cinematic-broll",
  "podcast-clip",
  "product-demo",
]);
export type ViralStyleId = z.infer<typeof ViralStyleSchema>;

export const StyleProfileSchema = z.enum([
  "motion-graphics",
  "realistic",
  "three-dimensional",
  "cinematic",
  "animation",
  "cartoon",
  "stick-figure",
  "custom",
]);
export type StyleProfile = z.infer<typeof StyleProfileSchema>;
export const StyleIdSchema = z.union([ViralStyleSchema, z.literal("custom")]);
export type StyleId = z.infer<typeof StyleIdSchema>;

export const StyleBibleSchema = z.object({
  source_prompt: z.string().trim().min(1).max(1000),
  profile: StyleProfileSchema,
  visual_rules: z.array(z.string().trim().min(1).max(300)).min(1).max(12),
  composition_rules: z.array(z.string().trim().min(1).max(300)).min(1).max(12),
  motion_rules: z.array(z.string().trim().min(1).max(300)).min(1).max(12),
  continuity_rules: z.array(z.string().trim().min(1).max(300)).min(1).max(12),
  negative_prompt: z.string().trim().max(1000).optional(),
});
export type StyleBible = z.infer<typeof StyleBibleSchema>;

export const CampaignInputSchema = z.object({
  goal: z.string().min(1),
  niche: z.string().min(1),
  audience: z.string().min(1),
  platforms: z.array(PlatformSchema).min(1),
  brand: z
    .object({
      name: z.string().optional(),
      voice: z.string().optional(),
      colors: z.array(z.string()).optional(),
      logoUrl: z.string().url().optional(),
    })
    .default({}),
  content_goal: z.enum(["growth", "engagement", "conversion", "awareness"]).default("growth"),
  viral_style: ViralStyleSchema.optional(),
  style_prompt: z.string().trim().min(1).max(1000).optional(),
  video_duration_sec: z.number().int().min(1).max(120).default(30),
  volume: z.number().int().min(1).max(90).default(7),
  duration_days: z.number().int().min(1).max(90).default(7),
});
export type CampaignInput = z.infer<typeof CampaignInputSchema>;

export const ResearchResultSchema = z.object({
  trends: z.array(z.string()),
  statistics: z.array(z.object({ claim: z.string(), source: z.string().optional() })),
  stories: z.array(z.string()),
  questions: z.array(z.string()),
  competitors: z.array(z.string()),
  sources: z.array(z.string()),
  summary: z.string(),
});
export type ResearchResult = z.infer<typeof ResearchResultSchema>;

export const StrategyResultSchema = z.object({
  topic: z.string(),
  angle: z.string(),
  format: z.enum(["reel", "carousel", "short", "thread", "post"]),
  platform_priority: z.array(PlatformSchema),
  objective: z.string(),
  cta: z.string(),
  expected_outcome: z.string(),
  structure: z.object({
    hook_sec: z.number(),
    problem_sec: z.number(),
    value_sec: z.number(),
    payoff_sec: z.number(),
    cta_sec: z.number(),
  }),
});
export type StrategyResult = z.infer<typeof StrategyResultSchema>;

export const HookSchema = z.object({
  text: z.string(),
  scores: z.object({
    curiosity: z.number(),
    clarity: z.number(),
    novelty: z.number(),
    emotional_impact: z.number(),
    audience_relevance: z.number(),
    scroll_stop: z.number(),
  }),
  total: z.number(),
});
export type Hook = z.infer<typeof HookSchema>;

export const ScriptResultSchema = z.object({
  hook: z.string(),
  full_script: z.string(),
  beats: z.array(
    z.object({
      start: z.number(),
      end: z.number(),
      type: z.enum(["hook", "problem", "value", "payoff", "cta"]),
      text: z.string(),
    })
  ),
  duration_sec: z.number(),
  word_count: z.number(),
});
export type ScriptResult = z.infer<typeof ScriptResultSchema>;

export const SceneSpecSchema = z.object({
  scene: z.number(),
  duration: z.number().positive(),
  purpose: z.string().min(1),
  visual: z.string().min(1),
  media_prompt: z.string().min(1).max(2000).default("Scene media prompt"),
  media_status: z.literal("prompt-only").default("prompt-only"),
  animation: z.string(),
  text: z.string(),
  emphasis: z.string().optional(),
  background: z.string().optional(),
});
export type SceneSpec = z.infer<typeof SceneSpecSchema>;

export const VisualSpecSchema = z.object({
  template: z.string().min(1),
  style_id: StyleIdSchema.default("kinetic-captions"),
  style_bible: StyleBibleSchema.default({
    source_prompt: "Deterministic short-form motion graphics",
    profile: "motion-graphics",
    visual_rules: ["High contrast readable typography"],
    composition_rules: ["Keep the subject inside the mobile safe area"],
    motion_rules: ["Use deliberate scene entrances"],
    continuity_rules: ["Keep colors, camera language, and character identity unchanged"],
  }),
  theme: z.string().min(1),
  duration: z.number(),
  aspect: z.enum(["9:16", "16:9", "1:1"]).default("9:16"),
  scenes: z.array(SceneSpecSchema),
  brand_colors: z.array(z.string()).optional(),
  logo_url: z.string().optional(),
});
export type VisualSpec = z.infer<typeof VisualSpecSchema>;

export const QCScoreSchema = z.object({
  visual_quality: z.number(),
  typography: z.number(),
  readability: z.number(),
  composition: z.number(),
  brand_consistency: z.number(),
  storytelling: z.number(),
  hook_strength: z.number(),
  technical_validity: z.number(),
  overall: z.number(),
  notes: z.array(z.string()),
  pass: z.boolean(),
});
export type QCScore = z.infer<typeof QCScoreSchema>;

export type JobStatus =
  | "pending"
  | "researching"
  | "strategizing"
  | "scripting"
  | "visualizing"
  | "rendering"
  | "qc"
  | "publishing"
  | "completed"
  | "failed"
  | "revising";

export interface ContentJob {
  id: string;
  campaign_id: string;
  status: JobStatus;
  input: CampaignInput;
  research?: ResearchResult;
  strategy?: StrategyResult;
  hooks?: Hook[];
  selected_hook?: Hook;
  script?: ScriptResult;
  visual?: VisualSpec;
  render_path?: string;
  public_url?: string;
  qc?: QCScore;
  selected_style?: string;
  render_hash?: string;
  render_metadata?: {
    width: number;
    height: number;
    duration_sec: number;
    mime_type: string;
  };
  revision_count: number;
  platform_posts?: Record<string, unknown>;
  error?: string;
  created_at: string;
  updated_at: string;
}

export interface Campaign {
  id: string;
  input: CampaignInput;
  status: "planning" | "producing" | "completed" | "failed";
  job_ids: string[];
  created_at: string;
  updated_at: string;
}

export const AnalyticsMetricSchema = z.object({
  job_id: z.string().uuid(),
  platform: PlatformSchema,
  views: z.number().nonnegative().default(0),
  watch_time_sec: z.number().nonnegative().default(0),
  completion_rate: z.number().min(0).max(1).optional(),
  likes: z.number().int().nonnegative().default(0),
  comments: z.number().int().nonnegative().default(0),
  shares: z.number().int().nonnegative().default(0),
  saves: z.number().int().nonnegative().default(0),
  ctr: z.number().min(0).max(1).optional(),
  follower_growth: z.number().optional(),
  captured_at: z.string().datetime().optional(),
});
export type AnalyticsMetric = z.infer<typeof AnalyticsMetricSchema> & { id: string };

export interface LearningInsight {
  id: string;
  style_id?: StyleId;
  platform?: Platform;
  statement: string;
  evidence: string;
  confidence: number;
  created_at: string;
}
