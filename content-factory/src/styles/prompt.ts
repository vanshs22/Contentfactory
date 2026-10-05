import type { CampaignInput, StyleBible, StyleProfile } from "../types/index.js";
import type { ViralStyleRecipe } from "./catalog.js";

export function detectStyleProfile(prompt?: string): StyleProfile {
  const value = prompt?.toLowerCase() ?? "";
  if (/stick[- ]?figure|stickman|doodle/.test(value)) return "stick-figure";
  if (/3d|three[- ]dimensional|cgi|blender|voxel/.test(value)) return "three-dimensional";
  if (/photoreal|realistic|real[- ]life|documentary/.test(value)) return "realistic";
  if (/cinematic|film|anamorphic|noir/.test(value)) return "cinematic";
  if (/cartoon|comic|illustrat|storybook/.test(value)) return "cartoon";
  if (/animation|animated|anime|motion design/.test(value)) return "animation";
  return prompt ? "custom" : "motion-graphics";
}

function rulesFor(profile: StyleProfile): Pick<StyleBible, "visual_rules" | "composition_rules" | "motion_rules" | "continuity_rules"> {
  const common = {
    composition_rules: [
      "Keep the main subject and all critical text inside the 9:16 mobile safe area",
      "Use one clear focal point per scene and preserve generous negative space",
    ],
    continuity_rules: [
      "Reuse the same color palette, lens/camera language, lighting direction, texture, and subject identity in every scene",
      "Do not change wardrobe, character proportions, set design, or rendering method between frames",
      "Carry forward the same visual rules on every scene-specific media prompt",
    ],
  };
  if (profile === "realistic") return {
    visual_rules: ["Photoreal textures, believable anatomy, natural skin/material response, and physically plausible environments", "Use consistent lens, depth of field, lighting direction, and color grade"],
    motion_rules: ["Natural camera movement and realistic motion blur; avoid morphing or impossible object changes"],
    ...common,
  };
  if (profile === "three-dimensional") return {
    visual_rules: ["Consistent 3D model proportions, materials, topology language, and studio/world lighting", "Use stable perspective, shadows, reflections, and depth cues"],
    motion_rules: ["Smooth camera orbit, dolly, or controlled object motion with coherent parallax"],
    ...common,
  };
  if (profile === "cinematic") return {
    visual_rules: ["Film-grade color, deliberate contrast, motivated practical light, and a consistent lens package", "Use cinematic framing without sacrificing caption readability"],
    motion_rules: ["Measured camera movement, natural focus pulls, and restrained transitions"],
    ...common,
  };
  if (profile === "animation") return {
    visual_rules: ["Consistent animated character/model design, line weight, palette, and background language", "Keep poses expressive but preserve proportions across scenes"],
    motion_rules: ["Readable key poses, intentional squash-and-stretch, and clean transitions"],
    ...common,
  };
  if (profile === "cartoon") return {
    visual_rules: ["Consistent illustrated character silhouettes, outline weight, palette, and expression language", "Use a simple graphic background that supports the subject"],
    motion_rules: ["Snappy holds, clear anticipation, and playful but repeatable movement"],
    ...common,
  };
  if (profile === "stick-figure") return {
    visual_rules: ["Use the same stick-figure head, body proportions, line weight, face marks, and limited palette throughout", "Keep backgrounds simple and diagrams legible"],
    motion_rules: ["Use readable pose changes and simple hand-drawn timing without changing the character design"],
    ...common,
  };
  return {
    visual_rules: ["Use a deliberate, repeatable visual language rather than changing style between scenes", "Prioritize clarity, contrast, and a recognizable subject"],
    motion_rules: ["Use smooth, purposeful transitions that support the narrative"],
    ...common,
  };
}

export function buildStyleBible(input: CampaignInput, recipe: ViralStyleRecipe): StyleBible {
  const profile = detectStyleProfile(input.style_prompt);
  const sourcePrompt = input.style_prompt ?? `${recipe.name}: ${recipe.promise}`;
  const rules = rulesFor(profile);
  return {
    source_prompt: sourcePrompt,
    profile,
    ...rules,
    negative_prompt: "inconsistent character identity, changing art style, flicker, warped anatomy, unreadable text, accidental logos, extra limbs, random color grading",
  };
}

export function lockSceneMediaPrompt(bible: StyleBible, scenePrompt: string): string {
  return [
    `STYLE BIBLE (must remain unchanged across the entire video): ${bible.source_prompt}`,
    `PROFILE: ${bible.profile}`,
    `VISUAL RULES: ${bible.visual_rules.join("; ")}`,
    `CONTINUITY RULES: ${bible.continuity_rules.join("; ")}`,
    `NEGATIVE PROMPT: ${bible.negative_prompt ?? "none"}`,
    `SCENE DIRECTION: ${scenePrompt}`,
  ].join("\n");
}
