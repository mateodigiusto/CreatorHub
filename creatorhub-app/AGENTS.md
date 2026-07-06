<!-- BEGIN:nextjs-agent-rules -->
# Conventions for code in this repo — read this before editing

## Status

CreatorHub is mid-pivot from a frontend-only demo to a real product. **Phase 1 (Foundation)** ships the cloud DB, auth scaffolding, and safety nets first; auth-gated UI and DB-backed reads come in **Phase 1 part 2**. Treat the demo paths and the new cloud paths as two separate worlds during this transition. They share components but read from different data sources.

## Stack

- **Next.js 16** App Router + Turbopack. Consult `node_modules/next/dist/docs/` if you're unsure about an API. Heed deprecation notices.
- **React 19** with the `react-hooks/set-state-in-effect` lint rule active.
- **Tailwind CSS v4** — tokens in `src/app/globals.css` via `@theme` and `@theme inline` blocks. **No `tailwind.config.ts`.**
- **TypeScript 5** strict.
- **Drizzle ORM** for DB schema, `postgres-js` driver with `prepare: false` (pgbouncer transaction-mode pooling).
- **Supabase** Postgres + Auth + Storage + Vault + RLS. Cloud-only — no local Docker stack.
- **Sentry** wired via `instrumentation.ts`.
- **Bunny.net Stream** for video transcoding + delivery (Phase 5+, agency assets via `src/lib/bunny/*`). Legacy `src/lib/stream.ts` Cloudflare wrapper is retained for a future paid-tier upgrade path but is not on the hot path.
- **Vitest** for RLS regression + migration round-trip tests.
- **lucide-react** icons. **No brand icons** in this library — use generic substitutes (`Camera`, `PlaySquare`, `Video`, `Hash`).
- **No chart library** — `AreaChart`, `MiniSpark`, `BarRow` are hand-rolled SVG.

## Things we do NOT use

- `unstable_instant` (skip related lints/warnings)
- `cacheComponents`
- Server Actions (route handlers + form posts only)
- `next/script` for the theme bootstrap (plain inline `<script>` in `layout.tsx`)
- Local Supabase Docker stack (we use the cloud project directly via the Supabase CLI + MCP)

## Database access — strict rules

**App code MUST NOT import `db` / `dbInternal` directly.** ESLint (`creatorhub/no-raw-db-import-in-app`) blocks it. Two access paths:

1. **Request-bound code** (server components, API routes that have a session cookie) — use the **Supabase server client** from `src/lib/supabase/server.ts`. RLS does isolation via `auth.uid()`. Drizzle is not used in this path.
2. **Cron handlers, webhook handlers, admin scripts** (no session) — use **`forUser(userId)`** from `src/db/forUser.ts`. Typed scopes inject `where userId = ?` on every query, including joins (`withAssets`, `withIntegrations`).

**`escapeHatch(reason)`** is the last resort for cross-user analytics / support ops. Requires a 20+ char justification both at runtime and as an inline ESLint disable comment. Used > 3 times in any phase = `forUser` API is missing something; add a typed scope method instead.

## Audit log — strict rules

`withAudit(userId, entry, fn)` wraps **DB-only** actions in a transaction. **Forbidden inside the callback:** `fetch()`, platform SDK imports, `setTimeout`/`setInterval`, anything from `src/integrations/**`. ESLint (`creatorhub/no-third-party-in-with-audit`) catches the common cases.

Multi-stage actions (publishing to Instagram, transcoding) write **one audit row per stage**: `withAudit` for the DB transitions, plain `audit()` between stages, third-party API work outside any transaction. See `src/lib/audit.ts` JSDoc for the canonical pattern.

## Logging

`log.{info,warn,error,debug}` from `src/lib/log/` is the only sanctioned logger. It calls `redact()` from `src/lib/log/redact.ts` — the **single shared `REDACT_KEYS` set** used by both the logger and Sentry's `beforeSend`. Adding a sensitive key updates both consumers.

`console.log` / `console.error` outside `src/lib/log/` and tests is forbidden by ESLint.

## Video — strict rules

`<VideoPlayer>` (legacy Supabase Storage signed URLs) and `<BunnyVideoPlayer>` (Phase 5+ Bunny.net Stream) in `src/components/ui/VideoPlayer.tsx` are the **only sanctioned ways to render video.** Encodes the cost-control rules from the plan: poster-only by default, click-to-play, `preload="none"`, no `autoPlay` API exposed. ESLint (`creatorhub/no-bare-video`) blocks bare `<video>`, any `<iframe>` pointing at `cloudflarestream.com` or a Bunny Stream embed URL, and `<stream-player>` outside these components.

Existing legacy demo code uses bare `<video>` for blob-URL previews; those are gated by inline `// eslint-disable-next-line creatorhub/no-bare-video --- demo blob-URL preview` comments and migrate to `<VideoPlayer>` when DB-backed assets land in Phase 1 part 2.

## Schema migrations

- Source of truth: SQL files in `supabase/migrations/` numbered `0000_…`, `0001_…`, …
- Drizzle TS mirror: `src/db/schema.ts` (drift caught by `tests/migration-roundtrip.spec.ts`).
- All mutable tables get a `BEFORE UPDATE` trigger via `trg_touch_updated_at`.
- All multi-value text columns are Postgres `ENUM` types — never raw `text`.
- All RLS policies use `(select auth.uid())` not `auth.uid()` (InitPlan caching).
- After applying a migration, run the Supabase advisors security + performance.

When adding a migration:
1. Write `supabase/migrations/00XX_name.sql` with `insert into schema_migrations (version) values (N)` at the bottom.
2. Mirror in `src/db/schema.ts`.
3. Apply via `mcp__supabase__apply_migration` (preferred — fast, transactional) OR `npm run db:migrate`.
4. Run `mcp__supabase__get_advisors security` + `performance`; if it flags new issues, add a remediation migration.
5. Bump `EXPECTED_SCHEMA_VERSION` in `.env.example` and `tests/migration-roundtrip.spec.ts`.
6. Run `npm run db:types` to refresh `src/lib/supabase/database.types.ts`.

## Conventions (frontend)

- Light mode is default. Theme switches via `data-theme` on `<html>` + `localStorage('creatorhub-theme')`. Pre-paint `<script>` in `layout.tsx` prevents flicker.
- Hover lift: `.lift` utility class. Don't write per-element transforms.
- Primary buttons: `Button` component (default variant) — uses `.btn-primary` navy gradient.
- Charts: `AreaChart` is the default. `getReachSeries(from, to)` and `getFollowerSeries(from, to)` for range-aware data.
- Path alias: `@/*` → `src/*`.
- Mobile: sidebar becomes off-canvas drawer below `lg`. Don't reintroduce hardcoded `grid-cols-3` etc — use `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`.

## State management

Two stores during the Phase 1 transition:

| Layer | Where | Owns |
|---|---|---|
| **Legacy demo** (`AppStateProvider` in `src/lib/store.tsx`) | localStorage | `theme`, `connected`, `extraPosts`, `extraAssets`, `profile`, `toast` |
| **Phase 1 cloud** | Postgres via `forUser(uid)` / Supabase server client | everything else (real users, real assets, real sequences, real posts) |

When wiring a new feature: **does it persist across devices? → cloud. UI ephemera or theme? → `store.tsx` is fine.** The localStorage `profile` migrates to the DB `profiles` row in Phase 1 part 2 via a one-time POST on first login.

## Before committing

```bash
npm run build                # TS + Turbopack — must pass
npm run lint                 # ESLint — must be clean (custom rules active)
npm run test:migration       # if you touched migrations or schema.ts
npm run test:rls             # if you added a user-scoped table or RLS policy
```

The fuller architecture, plan history, and gotchas live in `../CLAUDE.md`.
<!-- END:nextjs-agent-rules -->
