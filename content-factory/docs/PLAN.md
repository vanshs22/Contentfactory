# Production Plan

## Scope and assumptions
- Single-tenant, authenticated deployment is a later milestone; this pass hardens the core single-node factory and makes its current API honest.
- OpenAI-compatible LLM, HyperFrames CLI, FFmpeg, Buffer, and n8n remain optional integrations; local deterministic composition and validation must work without live credentials.
- The first shippable path is campaign -> agents -> style-aware HyperFrames composition -> render/QC -> asset URL -> optional Buffer draft.

## Stack decision
- Node.js 22 + TypeScript + Express: matches the existing service and keeps the patch small.
- Zod: validates every content and visual contract already used by the agents.
- Atomic JSON persistence: retained for single-node MVP, hardened with atomic writes; Postgres/SQLite is a follow-up for multi-node scale.
- HyperFrames CLI + FFmpeg: deterministic render boundary and local media verification.
- Node test runner + tsx: low-dependency unit/contract tests.

## Architecture
`API -> Director -> specialized agents -> style catalog/template renderer -> HyperFrames -> deterministic checks -> QC -> asset storage -> Buffer adapter`; n8n starts/polls jobs and stays outside business logic. Trending styles are explicit, versioned catalog entries selected by platform/goal rather than invented by prompts.

## Core entities
- Campaign: id, validated input, status, job ids, timestamps.
- ContentJob: id, campaign id, stage outputs, selected style, render metadata, QC, revision count, publication results, timestamps.
- Asset: currently represented by job render metadata; migrate to a first-class table/object-store record for multi-node production.

## API contract
- `GET /health`: service and integration availability.
- `GET /styles`: public catalog of supported viral/trend-inspired style recipes.
- `POST /campaigns`: validate and create campaign/jobs.
- `GET /campaigns`, `GET /campaigns/:id`: list/detail with jobs.
- `POST /campaigns/:id/run`, `POST /jobs/:id/run`: async execution.
- `GET /jobs`, `GET /jobs/:id`: job status and artifacts.
- `POST /production/run`: synchronous n8n/CLI-compatible run.
- `GET /assets/:jobId.mp4`: media URL for Buffer.

## Security and reliability checklist
- [x] Strict Zod input validation and bounded JSON body.
- [x] Atomic persistence writes and idempotent job-running guard.
- [x] No black-slate fallback for production render failures.
- [x] No external CDN in generated compositions.
- [x] Deterministic style/template selection and render metadata checks.
- [ ] Authentication/RBAC and multi-tenant ownership.
- [ ] Redis/Postgres queue and object storage adapter.
- [ ] Production Buffer schema contract test with credentials.

## Test plan
- Static: typecheck/build.
- Unit/contract: style catalog selection, visual schema, HTML escaping, template output, timing and dimensions.
- API smoke: health, styles, campaign validation, campaign/job lifecycle without live LLM.
- Integration with live OpenAI/HyperFrames/Buffer requires credentials and binaries; report as environment-dependent.

## Build checklist
- [x] Recover archived source into a normal repository layout.
- [x] Add explicit trending-style catalog and platform adaptations.
- [x] Make templates style-aware and deterministic.
- [x] Fix volume handling, QC revision context, and render failure semantics.
- [x] Harden persistence, config, API error handling, and n8n polling export.
- [x] Add analytics metrics and a first learning-insight loop.
- [x] Add tests, lockfile, CI, Docker/README consistency.
- [ ] Run full verification and push branch/PR.

## Risks and next steps
- Viral performance cannot be guaranteed; styles are trend-inspired recipes with measurable hook/pacing rules, not claims of guaranteed virality.
- Actual HyperFrames and Buffer behavior must be verified in an environment with those integrations configured.
- Next production milestone: auth/RBAC, Postgres/Redis/S3, real trend provider with citations, analytics ingestion, and learning-based style scoring.
