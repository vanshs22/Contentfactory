import { config as loadEnv } from "dotenv";
import { z } from "zod";
import path from "node:path";
import { fileURLToPath } from "node:url";

loadEnv();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");

const EnvSchema = z.object({
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_BASE_URL: z.string().default("https://api.openai.com/v1"),
  DIRECTOR_MODEL: z.string().default("gpt-4o"),
  RESEARCH_MODEL: z.string().default("gpt-4o-mini"),
  SCRIPT_MODEL: z.string().default("gpt-4o"),
  VISUAL_MODEL: z.string().default("gpt-4o"),
  QC_MODEL: z.string().default("gpt-4o"),
  BUFFER_API_KEY: z.string().optional(),
  BUFFER_ORG_ID: z.string().optional(),
  STORAGE_ROOT: z.string().default(path.join(ROOT, "storage")),
  PUBLIC_BASE_URL: z.string().default("http://localhost:3100/assets"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3100),
  CORS_ORIGIN: z.string().default("*"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  LOG_LEVEL: z.string().default("info"),
  HYPERFRAMES_BIN: z.string().default("npx hyperframes"),
  RENDER_FPS: z.coerce.number().default(30),
  RENDER_QUALITY: z.string().default("standard"),
  REDIS_URL: z.string().optional(),
  QC_MIN_SCORE: z.coerce.number().default(85),
  MAX_REVISIONS: z.coerce.number().default(2),
});

const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export const ROOT_DIR = ROOT;
export const HYPERFRAMES_DIR = path.join(ROOT, "hyperframes");
export const TEMPLATES_DIR = path.join(HYPERFRAMES_DIR, "templates");
