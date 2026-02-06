# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Workflow Clinic & Merch Store — a full-stack TypeScript app that uses a clinical metaphor to diagnose operational bloat in product workflows and prescribe AI-native tool recommendations. Users complete an assessment, and the system generates 3 recommendation scenarios with workflows, cost projections, and complexity scores.

## Commands

```bash
# Development
npm run dev          # Frontend only (Vite, port 3000)
npm run dev:api      # Backend only (tsx server.ts, port 3005)
npm run dev:all      # Both concurrently

# Testing (Vitest)
npm test             # Run all tests once
npm run test:watch   # Watch mode
npm run test:coverage # Coverage report (v8 provider)
# Run a single test file:
npx vitest run lib/engine/__tests__/decisionPipeline.test.ts

# Database (Prisma → Supabase PostgreSQL)
npm run db:generate  # Regenerate Prisma client after schema changes
npm run db:push      # Sync schema to database (dev)
npm run db:migrate   # Create and run migrations
npm run db:seed      # Seed with initial tool data
npm run db:studio    # Visual DB explorer

# Build
npm run build        # Production frontend build
npm run vercel-build # Vercel deploy (prisma generate + vite build)
```

## Architecture

**ES Module project** (`"type": "module"` in package.json). Path alias `@/*` maps to project root.

### Backend: Vercel Serverless Functions

API routes live in `api/` as individual serverless functions wrapped with `createApiHandler()` from `lib/middleware/apiHandler.ts`. In local dev, `server.ts` proxies these on port 3005. Key endpoints:

- `POST /api/diagnose` — Main diagnosis pipeline (rate-limited, cached)
- `GET/POST /api/tools` — Tool CRUD
- `POST /api/tools/match` — Fuzzy name matching
- `PATCH /api/tools/:id` — Popularity sub-score updates
- `POST /api/tools/:id/enrich` — AI-powered data enrichment
- `GET /api/bundles` — Curated tool bundles

### Core Engine (`lib/engine/`)

The diagnosis pipeline flows through these stages in sequence:

1. **decisionPipeline.ts** — 7-filter recommendation engine: compliance → anchor tool → budget → tech savviness → fit → multi-factor scoring (25% fit, 25% popularity, 20% cost, 15% AI, 15% integration) → replacements
2. **scenarioBuilder.ts** — Generates 3 scenarios: MONO_STACK, NATIVE_INTEGRATOR, AGENTIC_LEAN (+ STARTER_PACK for bootstrapping)
3. **workflowGenerator.ts** — Produces 5-phase HITL workflows (Ideation → Planning → Execution → Review → Iterate) per scenario
4. **costCalculator.ts** — 5-year cost projections comparing current vs recommended stacks
5. **narrativeService.ts** — Claude API generates clinical-themed scenario descriptions

### Services Layer (`lib/services/`)

- **toolService.ts** — Tool CRUD, filtered queries, popularity updates. Delegates to:
  - **toolMatchingService.ts** — Fuzzy name matching (exact → alias → Levenshtein distance)
  - **toolIntegrationService.ts** — Integration scoring, well-integrated tool queries
- **cacheService.ts** — Upstash Redis abstraction with TTLs (tools: 24h, lists: 1h, diagnoses: 15min)
- **redundancyService.ts** — Identifies overlapping tools
- **replacementService.ts** — Finds tool substitution candidates
- **bundleService.ts** — Curated tool bundle operations
- **enrichmentService.ts** — AI-powered tool metadata enrichment

### AI Provider (`lib/providers/aiProvider.ts`)

Centralized Claude SDK initialization. All Claude API calls go through:
- `getAnthropicClient()` — singleton Anthropic client with lazy init and API key validation
- `generateText()` — helper for simple text generation
- `AI_MODELS.DEFAULT` — single source of truth for model ID (currently `claude-sonnet-4-20250514`)

### Frontend (React 19 + Vite)

SPA with view states managed in `App.tsx`: LANDING → INTAKE → ANALYZING → DIAGNOSIS. Components in `components/`. Admin dashboard components extracted to `components/admin/`. The `services/recommendationService.ts` API client falls back to Gemini (`services/geminiService.ts`) if the backend is unavailable.

### Database (Prisma)

Schema at `lib/prisma/schema.prisma`. Prisma client singleton in `lib/db.ts`. Key models: Tool (with 5 popularity sub-scores), ToolIntegration, ToolRedundancy, ToolReplacement, ToolBundle, PhaseToolRecommendation. Enums drive domain vocabulary (ToolCategory, Complexity, PricingTier, TeamSize, Stage, TechSavviness, etc.).

### Middleware (`lib/middleware/`)

- **apiHandler.ts** — `createApiHandler({ methods, handler })` wraps CORS, OPTIONS, method check, error handling
- **errorHandler.ts** — CORS headers, error formatting, `ValidationError` → 400
- **validation.ts** — Assessment validation, rate limiting by IP, query param validation
- **toolValidation.ts** — Tool CRUD input validation (create/update)
- **index.ts** — Barrel exports for all middleware

## Conventions

### Where Things Live

| What | Where |
|------|-------|
| Domain types (ToolFilters, BundleFilters, etc.) | `/types.ts` |
| Enum constant arrays (VALID_STAGES, VALID_TOOL_CATEGORIES) | `/lib/constants.ts` |
| API handler boilerplate | `createApiHandler()` in `lib/middleware/apiHandler.ts` |
| Claude model IDs | `AI_MODELS` in `lib/providers/aiProvider.ts` |
| Seed data (tool definitions, bundles, etc.) | `/lib/scripts/seedData.ts` |
| Seed logic (DB operations) | `/lib/scripts/seed.ts` |

### Naming Patterns

- **Services**: Singleton getter pattern — `getToolService()`, `getCacheService()`, etc.
- **Clinical metaphor**: diagnose, prescription, Rx, patient (company), symptoms (pain points)
- **Files**: camelCase for TS files, PascalCase for React components
- **Backend services**: `lib/services/` (Prisma + Redis); **Frontend services**: `services/` (API clients)

### API Route Pattern

All API routes use `createApiHandler`:
```ts
export default createApiHandler({
  methods: ['GET', 'POST'],
  async handler(req, res) { /* ... */ },
});
```

### Error Handling

`ValidationError` (400) → caught by `handleError()` → formatted JSON response. Prisma errors (`P2025` = not found) are also caught.

## Known Gotchas

- **Cache staleness**: `tool:match:*` keys cache fuzzy matches indefinitely. If tool names change, old matches persist until cache expires.
- **Prisma enum vs frontend enum**: Backend uses UPPER_CASE Prisma enums (`SOLO`, `SMALL`); frontend assessment uses UI labels (`Solo (1 person)`). The normalization layer in `validation.ts` handles mapping.
- **`dev:all` zombie processes**: `npm run dev:all` uses bare `&` — child processes may not terminate on Ctrl+C.
- **Gemini env var**: Frontend Gemini fallback uses `process.env.API_KEY` (not `GEMINI_API_KEY`). Only works in `services/geminiService.ts`.
- **`hashAssessmentData` collision risk**: Uses simple string hash for cache keys — theoretically collisions possible for different assessments.
- **AdminDashboard sub-components**: `components/admin/` has TagInput, MultiSelectPills, CollapsibleSection, ToolPanel, DeleteModal, renderers.

## Service Dependency Map

```
api/diagnose → decisionPipeline → toolService, redundancyService, replacementService
                                 → scenarioBuilder → toolService
                                 → workflowGenerator
                                 → costCalculator
                                 → narrativeService → aiProvider
api/tools    → toolService (CRUD, matching, filtering)
api/tools/enrich → enrichmentService → aiProvider
api/bundles  → bundleService
```

## Testing

Vitest with `globals: true` (no need to import describe/it/expect). Tests use `*.test.ts` or `*.spec.ts` pattern. Coverage scoped to `lib/**` excluding `lib/prisma/**` and `lib/scripts/**`. Tests mock Prisma, Redis, and external services.

## Environment Variables

Requires `.env.local` with: `DATABASE_URL`, `DIRECT_URL` (Supabase PostgreSQL), `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `VITE_API_URL`.

## Deployment

Vercel handles both frontend (static SPA) and backend (serverless functions). `vercel.json` configures API rewrites and SPA fallback. Database connections use pgbouncer pooling via `DATABASE_URL`; migrations use `DIRECT_URL`.

## File Size Policy

Target max ~400 lines per file. When a file exceeds this, split into focused modules with barrel exports for backward compatibility. The `toolService.ts` split (→ toolMatchingService + toolIntegrationService) and `AdminDashboard.tsx` split (→ `components/admin/*`) are examples.
