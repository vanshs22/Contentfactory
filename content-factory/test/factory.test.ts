import assert from "node:assert/strict";
import test from "node:test";
import { CampaignInputSchema, VisualSpecSchema } from "../src/types/index.js";
import { getStyleRecipe, listStyleRecipes, selectStyle } from "../src/styles/catalog.js";
import { buildStyleBible, detectStyleProfile, lockSceneMediaPrompt } from "../src/styles/prompt.js";
import { buildCompositionHtml } from "../src/services/hyperframes.js";

const baseInput = {
  goal: "Grow an audience with useful short-form content",
  niche: "personal finance",
  audience: "early-stage investors",
  platforms: ["instagram", "tiktok", "youtube"] as const,
  content_goal: "growth" as const,
};

test("campaign input selects a deterministic finance style", () => {
  const input = CampaignInputSchema.parse(baseInput);
  assert.equal(selectStyle(input).id, "bold-stat");
  assert.equal(input.volume, 7);
  assert.equal(input.video_duration_sec, 30);
});

test("arbitrary visual prompts classify into supported style profiles", () => {
  const prompts = [
    ["photorealistic documentary", "realistic"],
    ["cinematic 3D product film", "three-dimensional"],
    ["hand drawn cartoon", "cartoon"],
    ["stick figure explainer", "stick-figure"],
    ["abstract watercolor motion", "custom"],
  ] as const;
  for (const [prompt, profile] of prompts) assert.equal(detectStyleProfile(prompt), profile);
  const input = CampaignInputSchema.parse({ ...baseInput, style_prompt: "cinematic 3D product film", video_duration_sec: 10 });
  assert.equal(input.style_prompt, "cinematic 3D product film");
  assert.equal(input.video_duration_sec, 10);
});

test("style catalog exposes platform-aware trend-inspired recipes", () => {
  const styles = listStyleRecipes();
  assert.ok(styles.length >= 10);
  assert.ok(styles.some((style) => style.id === "kinetic-captions"));
  assert.ok(styles.every((style) => style.bestFor.length > 0 && style.tags.length > 0));
  assert.equal(getStyleRecipe("podcast-clip").template, "reel-editorial");
});

test("custom style bible is locked into every scene prompt and frame metadata", () => {
  const input = CampaignInputSchema.parse({ ...baseInput, style_prompt: "photoreal cinematic 3D robot in warm studio light" });
  const bible = buildStyleBible(input, selectStyle(input));
  const scenePrompt = lockSceneMediaPrompt(bible, "The hero robot turns toward camera");
  const visual = VisualSpecSchema.parse({
    template: "reel-cinematic",
    style_id: "custom",
    style_bible: bible,
    theme: "luxury",
    duration: 10,
    aspect: "9:16",
    scenes: [
      { scene: 1, duration: 5, purpose: "Hook", visual: "robot close-up", media_prompt: scenePrompt, animation: "scale", text: "Meet the future" },
      { scene: 2, duration: 5, purpose: "Payoff", visual: "robot turns", media_prompt: lockSceneMediaPrompt(bible, "The hero robot turns toward camera"), animation: "slide", text: "Built consistently" },
    ],
  });
  const html = buildCompositionHtml(visual, "custom-style-job");
  assert.match(html, /data-style="custom"/);
  assert.match(html, /data-style-profile="three-dimensional"/);
  assert.match(html, /data-media-status="prompt-only"/);
  assert.match(html, /STYLE BIBLE/);
  assert.match(html, /photoreal cinematic 3D robot/);
  assert.match(html, /three-dimensional/);
  assert.doesNotMatch(html, /<video\b|<img\b/);
});

test("composition maps style, brand colors, timing, and safe escaped text", () => {
  const visual = VisualSpecSchema.parse({
    template: "reel-editorial",
    style_id: "kinetic-captions",
    theme: "modern",
    duration: 6,
    aspect: "9:16",
    brand_colors: ["#101010", "#ffffff", "#00ff99"],
    scenes: [
      { scene: 1, duration: 3, purpose: "Hook", visual: "bold type", animation: "kinetic-type", text: "Stop <scrolling>", emphasis: "Today" },
      { scene: 2, duration: 3, purpose: "Payoff", visual: "stat card", animation: "counter", text: "The useful answer" },
    ],
  });
  const html = buildCompositionHtml(visual, "test-job");
  assert.match(html, /data-width="1080"/);
  assert.match(html, /data-height="1920"/);
  assert.match(html, /data-duration="6"/);
  assert.match(html, /kinetic-captions/);
  assert.match(html, /Stop &lt;scrolling&gt;/);
  assert.match(html, /window\.__renderAt/);
  assert.match(html, /\.active \.scene-inner \{ opacity: 1/);
  assert.doesNotMatch(html, /cdn\.jsdelivr\.net/);
});
