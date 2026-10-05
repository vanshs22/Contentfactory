# AI Content & Digital Asset Factory# AI Content & Digital Asset Factory

A production-minded Node/TypeScript content factory that turns one brief into researched, platform-aware short-form assets:

`Director -> Research -> Strategy -> Hooks -> Script -> Visual Director -> style catalog -> HyperFrames -> deterministic media validation -> QC -> Buffer drafts`

The application owns business logic. n8n is an optional scheduler/poller. HyperFrames is the rendering boundary; the viral-style library is explicit and versioned so an LLM chooses recipes instead of inventing unreliable layouts.

## Current implementation

- User-supplied `style_prompt` accepts arbitrary directions such as realistic, 3D, cinematic, animation, cartoon, stick figure, or a custom visual language.
- Every generated video gets one locked style bible, and every scene/frame prompt repeats its continuity rules so the style, character identity, camera language, lighting, palette, and rendering method stay consistent.
- `video_duration_sec` enforces an exact duration from strategy through script, scenes, render metadata, and QC.
- HyperFrames receives escaped style/media prompt metadata, renders actual inline SVG scene artwork selected from the prompt (including the consistent house illustration in this sample), and writes a `media-prompts.json` sidecar. A real media-generation provider can replace the deterministic SVG layer later without changing the style bible.
- Director creates the requested `volume` of idempotent content jobs.
- Specialized agents return Zod-validated research, strategy, hooks, scripts, visual specs, and QC scores.
- Eleven trend-inspired recipes are available at `GET /styles`: kinetic captions, pattern interrupt, listicle countdown, bold stat, split screen, before/after, news alert, storytime, cinematic B-roll, podcast clip, and product demo.
- Templates are style-aware, mobile-safe, brand-color-aware, escaped, and free of external CDN dependencies.
- HyperFrames lint/render failures are hard failures; there is no fake black-slate fallback.
- QC failures receive their actual notes on revision and never publish after the revision limit.
- Atomic JSON persistence is used for single-node MVP reliability. Multi-node deployments should move this adapter to Postgres/Redis/S3.
- Buffer publishing is optional and defaults to drafts with platform-specific captions.

“Viral” is not a guarantee: these are tested creative recipes based on common high-retention patterns. Connect a real trend provider and analytics loop before claiming current-trend factuality or predictive performance.

## Requirements

- Node.js >= 22
- FFmpeg and `ffprobe` on `PATH`
- HyperFrames CLI (`npx hyperframes`, or set `HYPERFRAMES_BIN`)
- OpenAI-compatible API key for the live agent pipeline
- Optional Buffer GraphQL API key + organization ID

## Quick start

```bash
cp .env.example .env
# set OPENAI_API_KEY for live generation
npm install
npm run lint
npm test
npm run build
npm run dev
```

The API listens on `http://localhost:3100`.

## API examples

```bash
curl http://localhost:3100/health
curl http://localhost:3100/ready
curl http://localhost:3100/styles

curl -X POST http://localhost:3100/production/run \
  -H 'Content-Type: application/json' \
  -d '{
    "goal": "Create useful daily growth content",
    "niche": "luxury real estate",
    "audience": "US investors",
    "platforms": ["instagram", "tiktok", "youtube"],
    "content_goal": "growth",
    "style_prompt": "cinematic photoreal 3D product film with warm gold lighting, one consistent hero object, slow dolly-in, subtle film grain",
    "video_duration_sec": 10,
    "volume": 1,
    "brand": { "name": "Apex Estates", "voice": "premium, data-driven" }
  }'
```

`style_prompt` is free-form; `video_duration_sec` is an exact integer from 1 to 120. The style bible is locked across all scenes and QC revisions. The current renderer creates deterministic HyperFrames HTML/CSS plus inline SVG scene artwork and prompt metadata; add a real media-generation adapter to replace the SVG layer with generated footage while reusing the same bible.

For external automation, prefer the asynchronous endpoints:

1. `POST /campaigns` and save `campaign_id` plus `job_ids`.
2. `POST /campaigns/:id/run`.
3. Poll `GET /campaigns/:id` until every job is `completed` or `failed`.
4. Send only completed, QC-passed asset URLs to Buffer.

## CLI and checks

```bash
npm run factory -- --niche "luxury real estate" --audience "US investors" --style_prompt "cinematic 3D product film with one consistent hero object" --video_duration_sec 10
npm run doctor
npm run lint
npm test
npm run build
```

## n8n

Import `n8n/content-factory-workflow.json`. The export submits an asynchronous campaign, waits, polls the campaign, and branches to success/failure without making n8n responsible for content logic. Set `CONTENT_FACTORY_URL` in n8n.

## Production configuration

- Set `NODE_ENV=production`, a restricted `CORS_ORIGIN`, and a publicly reachable `PUBLIC_BASE_URL` backed by object storage or a reverse proxy.
- Run migrations/adapter setup before deployment when replacing the JSON store.
- Use HTTPS, secret management, backups, log aggregation, and a distributed queue for more than one application instance.
- Add authentication/RBAC and tenant ownership before exposing this API to multiple customers.
- Verify Buffer’s current GraphQL schema and media URL fetch behavior with your organization credentials.

## Layout

```text
src/agents/       Research, strategy, hooks, script, visual, QC
src/core/         Director and job orchestration
src/services/     LLM, HyperFrames renderer, Buffer adapter
src/styles/        Catalog recipes and arbitrary style-bible/prompt handling
src/api/          Express routes
src/db/           Atomic single-node persistence adapter
n8n/              Scheduler/polling workflow export
test/             Deterministic contract tests
docs/PLAN.md      Build checklist, assumptions, and known gaps
```
