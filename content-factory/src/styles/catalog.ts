import type { CampaignInput, Platform, ViralStyleId } from "../types/index.js";

export interface ViralStyleRecipe {
  id: ViralStyleId;
  name: string;
  promise: string;
  hookPattern: string;
  pacing: string;
  motion: string;
  template: string;
  theme: string;
  bestFor: Platform[];
  tags: string[];
}

export const VIRAL_STYLE_RECIPES: readonly ViralStyleRecipe[] = [
  {
    id: "kinetic-captions",
    name: "Kinetic Captions",
    promise: "Hook-first typography with highlighted words and rapid visual rhythm.",
    hookPattern: "A direct claim or contradiction in the first two seconds.",
    pacing: "1.5-3 second beats; one idea per screen.",
    motion: "kinetic-type",
    template: "reel-editorial",
    theme: "modern",
    bestFor: ["instagram", "tiktok", "youtube", "threads"],
    tags: ["short-form", "captions", "scroll-stop"],
  },
  {
    id: "pattern-interrupt",
    name: "Pattern Interrupt",
    promise: "Unexpected layout changes, punch-ins, and visual contrast to reset attention.",
    hookPattern: "Start with an unusual question, reversal, or visual contradiction.",
    pacing: "1-2 second opening cuts, then 3-4 second proof beats.",
    motion: "scale",
    template: "reel-cinematic",
    theme: "energetic",
    bestFor: ["instagram", "tiktok", "youtube"],
    tags: ["trend-inspired", "fast-cut", "retention"],
  },
  {
    id: "listicle-countdown",
    name: "Listicle Countdown",
    promise: "Numbered points, progress cues, and a payoff that rewards completion.",
    hookPattern: "Promise a specific number of surprising, useful points.",
    pacing: "3-5 seconds per point with a visible progress indicator.",
    motion: "counter",
    template: "reel-finance",
    theme: "finance",
    bestFor: ["instagram", "tiktok", "youtube", "linkedin"],
    tags: ["listicle", "education", "completion"],
  },
  {
    id: "bold-stat",
    name: "Bold Stat",
    promise: "One memorable number presented with context, contrast, and a takeaway.",
    hookPattern: "Lead with a surprising number and identify who should care.",
    pacing: "2-4 second stat reveal followed by proof and implication.",
    motion: "counter",
    template: "data-story",
    theme: "finance",
    bestFor: ["instagram", "youtube", "linkedin", "x"],
    tags: ["data", "authority", "shareable"],
  },
  {
    id: "split-screen",
    name: "Split Screen Debate",
    promise: "Two perspectives create tension before a clear recommendation.",
    hookPattern: "Put the common belief beside the contrarian answer.",
    pacing: "Alternating 2-4 second panels with a final synthesis.",
    motion: "slide",
    template: "reel-news",
    theme: "editorial",
    bestFor: ["tiktok", "instagram", "youtube", "x"],
    tags: ["debate", "comparison", "comments"],
  },
  {
    id: "before-after",
    name: "Before / After Reveal",
    promise: "A visible transformation makes the result immediately legible.",
    hookPattern: "Show the outcome first, then reveal the change that caused it.",
    pacing: "2 second tease, 4-6 second reveal, concise explanation.",
    motion: "reveal",
    template: "reel-product",
    theme: "luxury",
    bestFor: ["instagram", "tiktok", "youtube", "facebook"],
    tags: ["transformation", "proof", "product"],
  },
  {
    id: "news-alert",
    name: "News Alert Explainer",
    promise: "Editorial urgency with a calm, sourced explanation.",
    hookPattern: "State what changed, when it changed, and why the audience should care.",
    pacing: "Fast headline, then 3-5 second source-backed context beats.",
    motion: "slide",
    template: "reel-news",
    theme: "editorial",
    bestFor: ["instagram", "tiktok", "youtube", "linkedin", "x"],
    tags: ["news", "timely", "sources"],
  },
  {
    id: "storytime-confessional",
    name: "Storytime Confessional",
    promise: "A personal tension arc builds trust and ends with a practical lesson.",
    hookPattern: "Open with a specific mistake, secret, or unexpected turning point.",
    pacing: "4-7 second narrative beats with a reflective payoff.",
    motion: "fade",
    template: "reel-cinematic",
    theme: "luxury",
    bestFor: ["instagram", "tiktok", "youtube", "threads"],
    tags: ["story", "trust", "community"],
  },
  {
    id: "cinematic-broll",
    name: "Cinematic B-roll",
    promise: "Premium pacing, minimal text, and visual atmosphere around one idea.",
    hookPattern: "Use a vivid sensory statement that creates a mental scene.",
    pacing: "4-8 second shots with restrained copy and a deliberate payoff.",
    motion: "blur",
    template: "reel-cinematic",
    theme: "luxury",
    bestFor: ["instagram", "youtube", "facebook"],
    tags: ["cinematic", "premium", "brand"],
  },
  {
    id: "podcast-clip",
    name: "Podcast Clip",
    promise: "Quote-led framing, speaker context, and captions optimized for silent viewing.",
    hookPattern: "Lead with the strongest quotable sentence, not the setup.",
    pacing: "2-4 second caption groups with a speaker lower-third.",
    motion: "kinetic-type",
    template: "reel-editorial",
    theme: "minimal",
    bestFor: ["instagram", "tiktok", "youtube", "linkedin"],
    tags: ["interview", "captions", "authority"],
  },
  {
    id: "product-demo",
    name: "Product Demo",
    promise: "Problem, product moment, proof, and CTA in a clean conversion arc.",
    hookPattern: "Name the painful task and show the faster outcome.",
    pacing: "2-3 second problem, 5-8 second demo, proof, CTA.",
    motion: "slide",
    template: "reel-product",
    theme: "modern",
    bestFor: ["instagram", "tiktok", "youtube", "linkedin", "facebook"],
    tags: ["product", "conversion", "demo"],
  },
];

export function getStyleRecipe(id: ViralStyleId): ViralStyleRecipe {
  return VIRAL_STYLE_RECIPES.find((style) => style.id === id) ?? VIRAL_STYLE_RECIPES[0]!;
}

export function listStyleRecipes(): ViralStyleRecipe[] {
  return VIRAL_STYLE_RECIPES.map((style) => ({ ...style, bestFor: [...style.bestFor], tags: [...style.tags] }));
}

export function selectStyle(input: CampaignInput): ViralStyleRecipe {
  if (input.viral_style) return getStyleRecipe(input.viral_style);
  if (input.content_goal === "conversion") return getStyleRecipe("product-demo");
  if (input.content_goal === "awareness") return getStyleRecipe("news-alert");
  if (/finance|real estate|invest|money|business/i.test(input.niche)) {
    return getStyleRecipe("bold-stat");
  }
  return getStyleRecipe("kinetic-captions");
}
