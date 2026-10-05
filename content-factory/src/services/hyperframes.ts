import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createHash } from "node:crypto";
import { env, TEMPLATES_DIR, ROOT_DIR } from "../config/index.js";
import type { VisualSpec } from "../types/index.js";
import { getStyleRecipe } from "../styles/catalog.js";
import { logger } from "../utils/logger.js";

const execFileAsync = promisify(execFile);

const THEME_COLORS: Record<string, { bg: string; fg: string; accent: string; muted: string }> = {
  luxury: { bg: "#0a0a0a", fg: "#f5f0e8", accent: "#c9a227", muted: "#b7ae9f" },
  modern: { bg: "#0f172a", fg: "#f8fafc", accent: "#38bdf8", muted: "#94a3b8" },
  editorial: { bg: "#111111", fg: "#fafafa", accent: "#ef4444", muted: "#d4d4d4" },
  finance: { bg: "#020617", fg: "#e2e8f0", accent: "#22c55e", muted: "#94a3b8" },
  minimal: { bg: "#fafafa", fg: "#171717", accent: "#2563eb", muted: "#525252" },
  energetic: { bg: "#18181b", fg: "#fafafa", accent: "#f97316", muted: "#d4d4d8" },
};

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeColor(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  return /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\)|hsla?\([\d\s.,%]+\))$/i.test(value)
    ? value
    : fallback;
}

function dimensions(aspect: VisualSpec["aspect"]): { width: number; height: number } {
  if (aspect === "16:9") return { width: 1920, height: 1080 };
  if (aspect === "1:1") return { width: 1080, height: 1080 };
  return { width: 1080, height: 1920 };
}

/** Build a deterministic, style-aware HyperFrames composition from validated VisualSpec. */
export function buildCompositionHtml(spec: VisualSpec, projectId: string): string {
  const catalogStyleId = spec.style_id === "custom" ? "kinetic-captions" : spec.style_id;
  const recipe = getStyleRecipe(catalogStyleId);
  const base = THEME_COLORS[spec.theme] ?? THEME_COLORS[recipe.theme] ?? THEME_COLORS.modern;
  const colors = {
    bg: safeColor(spec.brand_colors?.[0], base.bg),
    fg: safeColor(spec.brand_colors?.[1], base.fg),
    accent: safeColor(spec.brand_colors?.[2], base.accent),
    muted: base.muted,
  };
  const { width, height } = dimensions(spec.aspect);
  const duration = Math.max(1, spec.duration);
  const styleClass = recipe.id;
  const profileClass = `profile-${spec.style_bible.profile}`;
  let elapsed = 0;

  const scenesHtml = spec.scenes
    .map((scene, index) => {
      const start = elapsed;
      elapsed += scene.duration;
      const sceneBg = safeColor(scene.background, colors.bg);
      const words = scene.text.trim().split(/\s+/).slice(0, 3).join(" ");
      return `
    <section id="scene-${scene.scene}" class="clip scene scene-${index} ${styleClass} ${profileClass}"
      data-start="${start.toFixed(3)}" data-duration="${scene.duration.toFixed(3)}"
      data-visual="${esc(scene.visual)}" data-media-status="${esc(scene.media_status)}"
      data-media-prompt="${esc(scene.media_prompt || scene.visual)}" style="--scene-bg:${sceneBg};">
      <div class="scene-glow"></div>
      <div class="scene-inner" data-anim="${esc(scene.animation || recipe.motion)}">
        <div class="topline"><span class="badge">${esc(recipe.name)}</span><span class="scene-count">${index + 1}/${spec.scenes.length}</span></div>
        <p class="label">${esc(scene.purpose)}</p>
        <h1 class="headline">${esc(scene.text)}</h1>
        ${scene.emphasis ? `<p class="emphasis">${esc(scene.emphasis)}</p>` : ""}
        <p class="visual-note">${esc(words)}</p>
      </div>
      <div class="progress"><span style="width:${((index + 1) / spec.scenes.length) * 100}%"></span></div>
    </section>`;
    })
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=${width}, height=${height}" />
  <meta name="hyperframes:duration" content="${duration}" />
  <meta name="hyperframes:fps" content="${env.RENDER_FPS}" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { margin: 0; background: #000; overflow: hidden; }
    #root { position: relative; width: ${width}px; height: ${height}px; overflow: hidden; font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif; background: ${colors.bg}; color: ${colors.fg}; }
    .clip { position: absolute; inset: 0; display: grid; place-items: center; padding: 76px 64px 110px; overflow: hidden; opacity: 0; background: var(--scene-bg); }
    .scene-inner { position: relative; z-index: 2; width: 100%; max-width: 930px; text-align: left; transform: translateY(22px); }
    .scene-glow { position: absolute; inset: -20%; z-index: 0; opacity: .32; background: radial-gradient(circle at 75% 30%, ${colors.accent} 0, transparent 32%), radial-gradient(circle at 10% 85%, ${colors.fg} 0, transparent 24%); filter: blur(2px); }
    .topline { display: flex; justify-content: space-between; align-items: center; color: ${colors.muted}; margin-bottom: 54px; font-size: 20px; letter-spacing: .08em; text-transform: uppercase; }
    .badge { color: ${colors.accent}; font-weight: 800; }
    .scene-count { opacity: .7; }
    .label { color: ${colors.muted}; font-size: 24px; line-height: 1.25; letter-spacing: .08em; text-transform: uppercase; margin-bottom: 26px; max-width: 780px; }
    .headline { font-size: clamp(54px, 7vw, 92px); font-weight: 850; line-height: .98; letter-spacing: -.045em; max-width: 920px; text-wrap: balance; }
    .emphasis { color: ${colors.accent}; font-size: 42px; font-weight: 800; margin-top: 34px; line-height: 1.05; }
    .visual-note { color: ${colors.muted}; opacity: .75; font-size: 20px; margin-top: 54px; }
    .progress { position: absolute; z-index: 3; left: 64px; right: 64px; bottom: 66px; height: 8px; background: color-mix(in srgb, ${colors.fg} 18%, transparent); border-radius: 8px; overflow: hidden; }
    .progress span { display: block; height: 100%; background: ${colors.accent}; border-radius: inherit; }
    .kinetic-captions .headline { text-transform: none; }
    .kinetic-captions .headline::first-letter { color: ${colors.accent}; }
    .pattern-interrupt .scene-inner { border-left: 12px solid ${colors.accent}; padding-left: 38px; }
    .pattern-interrupt .scene-glow { background: linear-gradient(125deg, ${colors.accent} 0, transparent 34%); opacity: .22; }
    .listicle-countdown .scene-count { color: ${colors.accent}; font-size: 28px; font-weight: 900; }
    .bold-stat .headline { font-size: clamp(86px, 12vw, 160px); color: ${colors.accent}; }
    .bold-stat .label { color: ${colors.fg}; }
    .split-screen .scene-inner { border: 2px solid ${colors.accent}; padding: 46px; background: color-mix(in srgb, ${colors.bg} 78%, ${colors.fg}); }
    .before-after .scene-inner { border-radius: 34px; padding: 48px; background: linear-gradient(135deg, color-mix(in srgb, ${colors.accent} 20%, transparent), transparent); }
    .news-alert .badge { padding: 9px 14px; background: ${colors.accent}; color: ${colors.bg}; border-radius: 4px; }
    .storytime-confessional .headline { font-family: Georgia, serif; font-weight: 500; letter-spacing: -.025em; }
    .cinematic-broll .scene-inner { max-width: 760px; margin-top: 35%; }
    .cinematic-broll .headline { font-weight: 500; }
    .podcast-clip .scene-inner { border-bottom: 3px solid ${colors.accent}; padding-bottom: 40px; }
    .product-demo .emphasis { background: ${colors.accent}; color: ${colors.bg}; display: inline-block; padding: 12px 18px; border-radius: 12px; }
    .profile-realistic .scene-glow { opacity: .5; filter: blur(18px); }
    .profile-realistic .scene-inner { text-shadow: 0 3px 22px rgba(0,0,0,.45); }
    .profile-three-dimensional .scene-inner { transform: perspective(900px) rotateX(2deg); }
    .profile-three-dimensional .scene-glow { background: conic-gradient(from 120deg, ${colors.accent}, transparent 35%, ${colors.fg} 62%, transparent 80%); opacity: .25; }
    .profile-cinematic::before, .profile-cinematic::after { content: ""; position: absolute; z-index: 4; left: 0; right: 0; height: 38px; background: #000; }
    .profile-cinematic::before { top: 0; } .profile-cinematic::after { bottom: 0; }
    .profile-animation .scene-glow { background: linear-gradient(135deg, ${colors.accent}, transparent 45%, ${colors.fg}); opacity: .27; }
    .profile-cartoon .scene-inner { border-radius: 32px; border: 5px solid ${colors.fg}; padding: 34px; box-shadow: 12px 12px 0 ${colors.accent}; }
    .profile-stick-figure .scene-inner { border: 3px dashed ${colors.fg}; padding: 34px; border-radius: 12px; }
    .profile-stick-figure .visual-note::before { content: "\\25CB \\2572\\2502\\2571  "; color: ${colors.accent}; font-size: 38px; }
    .active .scene-inner { animation: ${styleClass}-enter .55s cubic-bezier(.2,.8,.2,1) both; }
    @keyframes kinetic-captions-enter { from { opacity: 0; transform: translateY(28px) scale(.98); } to { opacity: 1; transform: none; } }
    @keyframes pattern-interrupt-enter { from { opacity: 0; transform: translateX(-54px); } to { opacity: 1; transform: none; } }
    @keyframes listicle-countdown-enter { from { opacity: 0; transform: scale(.82); } to { opacity: 1; transform: none; } }
    @keyframes bold-stat-enter { from { opacity: 0; transform: scale(1.14); } to { opacity: 1; transform: none; } }
    @keyframes split-screen-enter { from { opacity: 0; transform: translateX(54px); } to { opacity: 1; transform: none; } }
    @keyframes before-after-enter { from { opacity: 0; clip-path: inset(0 100% 0 0); } to { opacity: 1; clip-path: inset(0); } }
    @keyframes news-alert-enter { from { opacity: 0; transform: translateY(-34px); } to { opacity: 1; transform: none; } }
    @keyframes storytime-confessional-enter { from { opacity: 0; filter: blur(8px); } to { opacity: 1; filter: none; } }
    @keyframes cinematic-broll-enter { from { opacity: 0; transform: scale(1.05); } to { opacity: 1; transform: none; } }
    @keyframes podcast-clip-enter { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: none; } }
    @keyframes product-demo-enter { from { opacity: 0; transform: translateX(30px); } to { opacity: 1; transform: none; } }
  </style>
</head>
<body>
  <main id="root" data-composition-id="${esc(projectId)}" data-width="${width}" data-height="${height}" data-duration="${duration}" data-style="${esc(spec.style_id)}" data-style-profile="${esc(spec.style_bible.profile)}" data-style-bible="${esc(JSON.stringify(spec.style_bible))}">
${scenesHtml}
  </main>
  <script>
    (() => {
      const root = document.getElementById("root");
      const scenes = Array.from(root.querySelectorAll(".scene"));
      const total = Number(root.dataset.duration || 1);
      function renderAt(seconds) {
        const t = Math.max(0, Math.min(total - 0.001, Number(seconds) || 0));
        scenes.forEach((scene) => {
          const start = Number(scene.dataset.start || 0);
          const end = start + Number(scene.dataset.duration || 0);
          scene.classList.toggle("active", t >= start && t < end);
          scene.style.opacity = t >= start && t < end ? "1" : "0";
        });
      }
      window.__renderAt = renderAt;
      window.__timelines = window.__timelines || {};
      window.__timelines[root.dataset.compositionId] = { seek: renderAt, progress: (value) => renderAt(Number(value) * total) };
      renderAt(0);
    })();
  </script>
</body>
</html>`;
}

export interface RenderMetadata {
  width: number;
  height: number;
  duration_sec: number;
  mime_type: string;
}

export interface RenderResult {
  projectDir: string;
  outputPath: string;
  lintOk: boolean;
  lintOutput: string;
  renderOk: boolean;
  renderOutput: string;
  hash: string;
  metadata?: RenderMetadata;
}

function hyperframesCommand(): { command: string; prefix: string[] } {
  const parts = env.HYPERFRAMES_BIN.trim().split(/\s+/).filter(Boolean);
  return { command: parts[0] || "npx", prefix: parts.slice(1) };
}

async function inspectMedia(outputPath: string, spec: VisualSpec): Promise<RenderMetadata> {
  const { stdout } = await execFileAsync("ffprobe", [
    "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height:format=duration,format_name",
    "-of", "json", outputPath,
  ], { timeout: 30_000 });
  const parsed = JSON.parse(stdout) as { streams?: Array<{ width?: number; height?: number }>; format?: { duration?: string; format_name?: string } };
  const stream = parsed.streams?.[0];
  const metadata: RenderMetadata = {
    width: Number(stream?.width ?? 0),
    height: Number(stream?.height ?? 0),
    duration_sec: Number(parsed.format?.duration ?? 0),
    mime_type: parsed.format?.format_name ?? "unknown",
  };
  const expected = dimensions(spec.aspect);
  if (metadata.width !== expected.width || metadata.height !== expected.height || metadata.duration_sec < Math.max(0.5, spec.duration - 0.25) || metadata.duration_sec > spec.duration + 0.25) {
    throw new Error(`Rendered media metadata does not match spec: ${JSON.stringify({ metadata, expected, duration: spec.duration })}`);
  }
  return metadata;
}

export async function renderVisualSpec(jobId: string, spec: VisualSpec): Promise<RenderResult> {
  const projectDir = path.join(env.STORAGE_ROOT, "projects", jobId);
  const rendersDir = path.join(env.STORAGE_ROOT, "renders");
  fs.mkdirSync(projectDir, { recursive: true });
  fs.mkdirSync(rendersDir, { recursive: true });

  const html = buildCompositionHtml(spec, jobId);
  const indexPath = path.join(projectDir, "index.html");
  fs.writeFileSync(indexPath, html, "utf8");
  fs.writeFileSync(path.join(projectDir, "hyperframes.json"), JSON.stringify({ name: jobId, version: 1, duration: spec.duration }, null, 2));
  fs.writeFileSync(path.join(projectDir, "media-prompts.json"), JSON.stringify({
    job_id: jobId,
    style_id: spec.style_id,
    media_policy: "prompt-only",
    style_bible: spec.style_bible,
    scenes: spec.scenes.map((scene) => ({ scene: scene.scene, media_status: scene.media_status, media_prompt: scene.media_prompt })),
  }, null, 2));

  const { command, prefix } = hyperframesCommand();
  let lintOk = true;
  let lintOutput = "";
  try {
    const { stdout, stderr } = await execFileAsync(command, [...prefix, "lint", projectDir, "--json"], { cwd: ROOT_DIR, timeout: 60_000, env: process.env });
    lintOutput = stdout + stderr;
  } catch (error: any) {
    lintOk = false;
    lintOutput = String(error.stdout || "") + String(error.stderr || error.message);
    logger.warn({ jobId, lintOutput }, "HyperFrames lint failed");
  }

  const outputPath = path.join(rendersDir, `${jobId}.mp4`);
  let renderOutput = "";
  try {
    const { stdout, stderr } = await execFileAsync(command, [...prefix, "render", projectDir, "--output", outputPath, "--fps", String(env.RENDER_FPS), "--quality", env.RENDER_QUALITY], {
      cwd: ROOT_DIR,
      timeout: 600_000,
      maxBuffer: 10 * 1024 * 1024,
      env: process.env,
    });
    renderOutput = stdout + stderr;
    if (!fs.existsSync(outputPath)) throw new Error("HyperFrames completed without producing an output file");
    const metadata = await inspectMedia(outputPath, spec);
    const hash = createHash("sha256").update(fs.readFileSync(outputPath)).digest("hex");
    return { projectDir, outputPath, lintOk, lintOutput, renderOk: true, renderOutput, hash, metadata };
  } catch (error: any) {
    renderOutput += String(error.stdout || "") + String(error.stderr || error.message);
    logger.error({ jobId, renderOutput }, "Deterministic render failed");
    return { projectDir, outputPath, lintOk, lintOutput, renderOk: false, renderOutput, hash: "" };
  }
}

export function publicAssetUrl(jobId: string): string {
  return `${env.PUBLIC_BASE_URL.replace(/\/$/, "")}/${jobId}.mp4`;
}

export { TEMPLATES_DIR };
