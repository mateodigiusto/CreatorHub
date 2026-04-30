# CreatorHub

Premium creator operating system for creators, info-product businesses, agencies, and social media teams. Plan → Create → Analyze → Grow, from one command center.

**Status: Phase 1 (Foundation) — partially shipped.** The frontend (every screen, the onboarding flow, Sequence Studio, Asset Library) is complete in demo mode. The cloud database, auth scaffolding, ESLint safety nets, video transcoding pipeline, audit/log layers, and migration tooling are wired but not yet read from by the UI. **Phase 1 part 2** (auth + login + DB-backed profile) is the next pass; until it lands the demo continues to drive UI from `localStorage` + mock data.

## What's inside (UI)

- **Workspace** — Dashboard, Analytics, Ideas, Asset Library, Content (Library + Pipeline), Calendar
- **Tools** — Sequence Studio (full-page builder + drawer entry points), Reports
- **System** — Settings, Integrations
- **Onboarding** — 14-step premium setup wizard at `/onboarding` (driven by the [Phase 1 Profile schema](src/lib/onboarding/types.ts))
- **Demo route group split** — `(app)/` for the real product, `(demo)/` reserved for the public marketing demo (route group landing in Phase 1 part 2)
- **Light + dark themes** — `data-theme` on `<html>` with pre-paint script, no flicker
- **Mobile-responsive** — sidebar becomes off-canvas drawer below `lg`; topbar condenses

## Phase 1 Foundation (cloud-backed)

| Layer | What's wired | Where |
|---|---|---|
| Database | Supabase Postgres, project `wfyhsohnkbzemwxuiqhr`, schema v12 | `supabase/migrations/` |
| ORM | Drizzle with `prepare: false` (pgbouncer transaction-mode safe) | [`src/db/index.ts`](src/db/index.ts) |
| Service-role guardrail | `forUser(userId)` typed scopes + `escapeHatch(reason)` | [`src/db/forUser.ts`](src/db/forUser.ts) |
| Auth | Supabase server + browser clients + middleware (login UI deferred to Phase 1 part 2) | [`src/lib/supabase/`](src/lib/supabase/) |
| Logging | `log.{info,warn,error,debug}` with shared `REDACT_KEYS` | [`src/lib/log/`](src/lib/log/) |
| Audit | `withAudit` (DB-only enforced) + multi-stage pattern | [`src/lib/audit.ts`](src/lib/audit.ts) |
| Sentry | Bound at boot via `instrumentation.ts` | [`instrumentation.ts`](instrumentation.ts) |
| Schema-version assertion | Boot refuses if DB schema ≠ code expectation | same |
| Video | `<VideoPlayer>` is the only sanctioned `<video>` host; cost-rules enforced | [`src/components/ui/VideoPlayer.tsx`](src/components/ui/VideoPlayer.tsx) |
| ESLint guards | 4 custom rules block raw DB imports, unjustified escape hatches, third-party calls inside `withAudit`, bare `<video>` | [`eslint-plugin-creatorhub/`](eslint-plugin-creatorhub/) |
| Tests | RLS regression suite + migration round-trip via vitest | [`tests/`](tests/) |
| Cloud MCP | Supabase MCP server registered for direct schema/data ops in Claude Code | `../.mcp.json` |

## Run locally

```bash
npm install                        # uses .npmrc → legacy-peer-deps for Sentry+Next 16 mismatch
cp .env.example .env.local         # fill in cloud Supabase keys (URL + anon + service_role + DATABASE_URL + DIRECT_URL)
npm run dev                        # http://localhost:3000 (or 3003+)
```

The dev server runs without `.env.local` populated — Phase 1 code is dormant until imported by app code (which happens in Phase 1 part 2).

## Schema management

```bash
npm run db:link              # one-time: link the local repo to your Supabase project
npm run db:migrate           # apply unapplied SQL files in supabase/migrations/
npm run db:status            # list applied migrations
npm run db:reset             # nuke + replay (destructive — staging only)
npm run db:types             # regenerate src/lib/supabase/database.types.ts from cloud schema
npm run schema:version       # print the current migration count (use to bump EXPECTED_SCHEMA_VERSION)
```

Cloud-only setup. We don't run Supabase locally; everything points at the cloud project. Schema migrations are SQL files in `supabase/migrations/` (source of truth) plus a typed Drizzle mirror in [`src/db/schema.ts`](src/db/schema.ts).

## Build / lint / test

```bash
npm run build                # TS + Turbopack — must pass before commit
npm run lint                 # ESLint — must be clean (custom rules enforce safety net)
npm run test                 # vitest in watch mode
npm run test:rls             # RLS regression suite (anon can't read, A can't read B's rows)
npm run test:migration       # migration round-trip (RLS + triggers + enums + indexes verified)
```

## Deploy on Vercel

Vercel auto-detects Next.js. **Root Directory = `creatorhub-app`**. Required env vars (set in Vercel dashboard, prod + preview separately):

```
DATABASE_URL                       # pgbouncer 6543 transaction mode
DIRECT_URL                         # 5432 direct, for migrations only
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_VAULT_KEY_ID              # set after creating Vault secret in dashboard
ENCRYPTION_KEY                     # bootstrap secret (NOT the encryption key itself)
EXPECTED_SCHEMA_VERSION            # 12 right now; CI bumps from migration count
SENTRY_DSN, SENTRY_AUTH_TOKEN
CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_STREAM_API_TOKEN
META_APP_ID, META_APP_SECRET, META_WEBHOOK_VERIFY_TOKEN   # Phase 2
# + per-platform OAuth client IDs/secrets in Phase 3+
```

Boot-time `instrumentation.ts` asserts `EXPECTED_SCHEMA_VERSION` matches `max(schema_migrations.version)` and refuses to serve traffic in production on mismatch.

## Tech

- Next.js 16 (App Router, Turbopack)
- React 19
- Tailwind CSS v4 (`@theme` blocks; no `tailwind.config.ts`)
- TypeScript 5 strict
- Drizzle ORM + postgres-js
- Supabase (Postgres + Auth + Storage + Vault + RLS)
- Cloudflare Stream (video transcoding + delivery — Phase 1 part 2)
- Sentry (error monitoring)
- Vitest (RLS regression + migration round-trip tests)
- Hand-rolled SVG charts (`AreaChart`, `MiniSpark`, `BarRow`)
- lucide-react icons, Inter via `next/font/google`

## Project layout

```
creatorhub-app/
├── src/
│   ├── app/
│   │   ├── (app)/...                       # auth-required surfaces (Phase 1 part 2)
│   │   ├── (demo)/...                      # public mock-data demo (Phase 1 part 2)
│   │   ├── onboarding/                     # 14-step setup wizard
│   │   ├── library/, sequence-studio/, ... # current demo routes
│   │   └── api/                            # Phase 2+: cron, webhooks, integrations
│   ├── components/
│   │   ├── shell/                          # AppShell, Sidebar, Topbar, Aurora, MouseGlow
│   │   ├── ui/                             # Card, Button, Badge, VideoPlayer, …
│   │   ├── charts/                         # AreaChart, MiniSpark, BarRow
│   │   ├── dashboard/                      # KpiCard
│   │   ├── plan/                           # PlanContentDrawer, StorySequenceFlow
│   │   └── onboarding/                     # OnboardingShell, ProgressBar, steps.tsx
│   ├── db/
│   │   ├── index.ts                        # dbInternal (service-role)
│   │   ├── forUser.ts                      # typed user-scoped wrapper + escapeHatch
│   │   └── schema.ts                       # Drizzle TypeScript mirror of SQL
│   └── lib/
│       ├── audit.ts                        # withAudit (DB-only) + multi-stage audit
│       ├── log/                            # redactedLogger + shared REDACT_KEYS
│       ├── assets.ts                       # asset state machine helper
│       ├── supabase/                       # server + browser clients + Database types
│       ├── onboarding/                     # types, options, personalize, persistence
│       ├── store.tsx                       # legacy localStorage state (demo only)
│       └── mock/                           # demo data
├── supabase/
│   ├── config.toml                         # CLI config (cloud-only)
│   └── migrations/                         # SQL — source of truth
├── eslint-plugin-creatorhub/               # 4 custom safety-net rules
├── tests/                                  # RLS regression + migration round-trip
├── instrumentation.ts                      # schema-version assertion + Sentry binding
└── ../CLAUDE.md                            # full architecture + conventions
```

The full implementation reference, design rules, and Phase-1-pivot details live in [`../CLAUDE.md`](../CLAUDE.md).
