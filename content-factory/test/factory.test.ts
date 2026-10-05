import assert from "node:assert/strict";
import test from "node:test";
import { CampaignInputSchema, VisualSpecSchema } from "../src/types/index.js";
import { getStyleRecipe, listStyleRecipes, selectStyle } from "../src/styles/catalog.js";
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
});

test("style catalog exposes platform-aware trend-inspired recipes", () => {
  const styles = listStyleRecipes();
  assert.ok(styles.length >= 10);
  assert.ok(styles.some((style) => style.id === "kinetic-captions"));
  assert.ok(styles.every((style) => style.bestFor.length > 0 && style.tags.length > 0));
  assert.equal(getStyleRecipe("podcast-clip").template, "reel-editorial");
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
  assert.doesNotMatch(html, /cdn\.jsdelivr\.net/);
});
