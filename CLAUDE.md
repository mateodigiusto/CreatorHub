# CLAUDE.md — CreatorHub

Project-specific guidelines for building CreatorHub. Merge with global CLAUDE.md.

---

## 1. Product Vision

**CreatorHub** is a premium creator operating system for creators, info-product businesses, agencies, and social media teams.

It helps users **plan, create, analyze, and grow** their content from one clean command center.

**Core product loop:** Plan → Create → Analyze → Grow

**One-line definition:**
CreatorHub is a premium creator operating system that helps creators plan, create, analyze, and grow through one clean, intelligent content command center.

**Tagline:** Plan · Create · Analyze · Grow

> **Note on branding:** Final brand assets (logo, wordmark, final name lockup) are deferred. Use the placeholder name "CreatorHub" in copy and a simple text wordmark in the UI for now. Do not invest time in logo design until brand direction is finalized.

---

## 2. Brand Direction

**Feel:** Apple-clean simplicity. Stripe-quality dashboard clarity. Premium SaaS. Minimal, calm, professional, highly readable. Spacious. Strong hierarchy. **Premium navy + premium blue accents.** Not playful, not neon, not crypto-looking, not generic AI-tool looking.

**Avoid:** Clutter. Playful/generic AI-tool aesthetic. Crypto-style gradients. Overloaded admin-panel feeling. Cartoon icons. Heavy shadows. Orange or teal as brand accents (orange is reserved for warning state only).

### Theme system

CreatorHub ships **Light Mode (default)** and **Dark Mode**. Both modes share the same blue accent and feel like the same brand. Theme switches via `data-theme="light" | "dark"` on `<html>`, persisted to localStorage, hydrated by a pre-paint inline script to prevent flicker.

**Light Mode tokens:**
| Token | Hex | Use |
|---|---|---|
| `--bg` | `#F8FAFC` | App background |
| `--surface` | `#FFFFFF` | Cards |
| `--surface-2` | `#F1F5F9` | Subtle fills (tabs, progress tracks) |
| `--surface-3` | `#E2E8F0` | Stronger neutral fills |
| `--border` | `#D8E0EA` | Dividers, card borders |
| `--text` | `#07111F` | Primary text, headings |
| `--text-2` | `#475569` | Secondary text |
| `--text-muted` | `#94A3B8` | Tertiary / labels |
| `--accent` | `#2563EB` | Primary accent (buttons, active state, AI insight) |
| `--accent-2` | `#1D4ED8` | Hover/secondary accent |
| `--accent-soft` | `rgba(37,99,235,0.08)` | Soft accent fills |
| `--accent-border` | `rgba(37,99,235,0.18)` | Accent borders / hover |
| `--accent-glow` | `rgba(37,99,235,0.16)` | Soft hover glow |
| `--blue-soft` | `#60A5FA` | Supporting blue |
| `--cyan-soft` | `#0891B2` | Supporting cyan |
| `--indigo-soft` | `#6366F1` | Supporting indigo |
| `--success` | `#16A34A` | Success state |
| `--warning` | `#D97706` | Warning state (orange — only here) |
| `--error` | `#DC2626` | Error state |

**Dark Mode tokens:**
| Token | Hex | Use |
|---|---|---|
| `--bg` | `#070B14` | App background |
| `--surface` | `#0B1220` | Cards |
| `--surface-2` | `#111827` | Subtle fills |
| `--surface-3` | `#172033` | Stronger neutral fills |
| `--border` | `#1F2A3D` | Dividers, card borders |
| `--text` | `#F8FAFC` | Primary text |
| `--text-2` | `#94A3B8` | Secondary text |
| `--text-muted` | `#64748B` | Tertiary |
| `--accent` | `#2563EB` | Primary accent |
| `--accent-2` | `#3B82F6` | Hover/secondary accent |
| `--accent-soft` | `rgba(37,99,235,0.12)` | Soft accent fills |
| `--accent-border` | `rgba(59,130,246,0.25)` | Accent borders |
| `--accent-glow` | `rgba(59,130,246,0.28)` | Hover glow |
| `--blue-soft` | `#60A5FA` | Supporting blue |
| `--cyan-soft` | `#67E8F9` | Supporting cyan |
| `--indigo-soft` | `#818CF8` | Supporting indigo |
| `--success` | `#22C55E` | Success state |
| `--warning` | `#F59E0B` | Warning state |
| `--error` | `#EF4444` | Error state |

**Constant (both modes):**
| Token | Hex | Use |
|---|---|---|
| `--color-midnight` | `#0B1220` | Sidebar background — fixed brand anchor |

### Accent usage rules

Use **blue** only for: primary buttons, active navigation state, selected filters, chart highlights, AI insight accents, Instagram-connected state, hover/focus glow, important badges.

Do **not** make everything blue. Most of the interface is neutral (navy text, slate borders, white surfaces in light / dark navy surfaces in dark). Reserve blue for moments of meaning and action.

### Aurora & ambient glow

The app shell mounts a fixed-position aurora (two drifting blurred radials in light, three in dark) and a cursor-tracking ambient glow. Both read theme-aware CSS variables so the dark mode reads richer (~20% blue / ~14% indigo / ~10% cyan) and light mode reads barely-there (~8% blue / ~6% indigo / ~5% cyan). Both are gated behind `prefers-reduced-motion`.

### Hover system

The single `.lift` utility (defined in `globals.css`) is the standard hover effect for cards, columns, idea cards, calendar slots, report tiles, integration rows. It applies `translateY(-2px) + scale(1.005)`, swaps the border to `var(--accent-border)`, and adds `var(--shadow-lift)` (a soft blue-tinted glow). Subtle, premium, no perspective tilt. Tables stay flat with a `bg-accent/[0.04]` row hover.

### Typography

A clean modern sans (Inter, loaded via `next/font/google`). Generous line-height, tight tracking on headings (`-0.005em` body, `-0.02em` for KPI numbers). Tabular nums on metric values.

### Logo / wordmark

Deferred. Use the text wordmark "Creator**Hub**" with the "Hub" half tinted `#BFDBFE` in the sidebar / topbar until final brand assets are decided.

### Legacy class aliases

The codebase still references `bg-teal`, `text-teal`, `border-teal`, `bg-teal-blue`, `text-cyan-soft` in some files. These are now redirected at the token level (`--color-teal: var(--accent)`) so they resolve to the new blue palette automatically. New code should use `bg-accent`, `text-accent`, `border-accent`, `bg-accent-2`, `text-blue-soft`, etc. A future cleanup pass can do the className rename.

---

## 3. Navigation

The sidebar groups items into three sections:

**Workspace** (the daily flow):
1. Dashboard
2. Analytics
3. Ideas
4. Asset Library
5. Content
6. Calendar

**Tools** (output / utilities):
7. Sequence Studio (`/sequence-studio` landing + `/sequence-studio/new` full-page builder)
8. Reports

**System** (account / admin):
- Integrations
- Settings

The topbar holds: workspace breadcrumb, search (with ⌘K hint), platform-connection pill ("4 platforms connected" when on), theme toggle, notifications, "New content" CTA. **Mobile**: hamburger replaces the breadcrumb, search hides below `md`, off-canvas sidebar drawer slides in over a frosted backdrop.

**Onboarding** lives at `/onboarding` outside the AppShell — a 14-step setup wizard that bypasses the sidebar/topbar.

**Not yet built:** AI Studio (separate from Sequence Studio), Clients, Inspiration Engine, Education Hub, Automations, Community, Advanced Tasks, Billing, Team Management, Client Portal, Help (route exists but unlinked).

---

## 4. Screen Purposes

- **Dashboard** — daily command center. 4 KPI cards (Reach / Engagement rate / New followers / Top post CTR) with `MiniSpark` trends, "Reach over time" `AreaChart` with `DateRangeControl` (Stripe-style two-month range picker), "By platform" `BarRow` panel, AI insight callout, "Next move" callout (driven by onboarding profile), "Up next" schedule list, "Top performing posts" table.
- **Analytics** — the data layer. 4 different KPIs (Total reach / Impressions / Engagement / Profile visits), Performance + Follower growth charts (each with its own `DateRangeControl`), content type breakdown, Messages/Leads panel, best-posting-time heatmap, top posts table, AI explanation.
- **Ideas** — AI-generated hooks aligned with the last 30 days of performance. All / Saved tabs (with bookmark count), AI callout up top, 6 idea cards each with `ScoreRing` + estimated reach + "Open" button.
- **Asset Library** (`/library`) — the user's media library. Grid of photos + short videos (max 15s for sequences). Real upload via `<input type="file">` + `URL.createObjectURL` + `loadedmetadata` duration check. Photos / Videos tabs with counts. Long videos (>15s) live here but are filtered out of Sequence Studio.
- **Content** — production system. Statuses: Idea → Script → Recording → Editing → Review → Scheduled → Published → Analyzed. Two views via `Tabs`: **Library** (responsive grid) and **Pipeline** (5-column kanban).
- **Calendar** — month view (5 weeks × 7 days). Today highlighted with dark navy gradient circle. Each day shows up to 2 event chips. Click any day → `PlanContentDrawer` with `slotDate` pre-filled.
- **Sequence Studio** (landing) — the asset picker that leads to the full-page builder. Replaces "Recent sequences" with the actual library; selecting 1-5 assets enables "Start sequence" → navigates to `/sequence-studio/new?assets=…`.
- **Sequence Studio Builder** (`/sequence-studio/new`) — full-page guided builder, 9 sections in one scroll: Sequence details (name + selected assets) → Content style (4 cards: CTA Story / Educational / Carousel Classic / Reel Cover) → Brand tone (4 cards) + Brand context with persona switcher → Style preset (4 visual previews) → Screenshot overlays (drop zone + library) → Text length (segmented short/medium/long with dynamic word counts) → Decorations (toggle cards) → Accent color (swatches + Custom hex) → Story brief. Build → animated multi-stage progress → preview with Notes-for-next-version + Edit/Publish/Download bar + slide cards with accent-word highlighting + "Looks good?" save flow.
- **Sequence Studio Drawer** — the legacy half-screen flow, still used from Calendar / Ideas / Content for slot-aware scheduling. 3 tabs: Quick post · Sequence Studio · From idea.
- **Reports** — client-ready summary. Weekly / Monthly tabs. Always-dark hero panel with corner radial glows + 5 stats. Growth `AreaChart` + AI summary callout. Top content tile grid.
- **Onboarding** (`/onboarding`) — 14-step premium setup wizard. Bypasses AppShell. Outputs a typed `Profile` saved to localStorage (Phase 1 part 2: persists to DB `profiles` row on first login). Personalization wires into Sidebar (name + creator-type subtitle), Dashboard (greeting + Next-move callout), Sequence Studio (default persona), Reports (handle), Settings (Restart setup row).

---

## 5. Design Rules

- Every screen has **one clear purpose**.
- Every screen is understandable in **under 5 seconds**.
- Don't show too much at once — use progressive disclosure.
- Use cards, tabs, filters, drawers where useful.
- Data should be **explained**, not just displayed.
- Every section suggests a **next useful action** (Create similar idea, Add to calendar, Review top post, Generate report, Connect Instagram, Plan next week, Analyze this post).
- Powerful, but extremely easy to use.

**Every screen needs two states:** empty (Instagram not connected) and connected (demo data).

---

## 6. Status — mid-Phase 1 (production pivot)

The original demo is complete. We're pivoting to a real product in four phases (full plan in `~/.claude/plans/the-first-creatorhub-demo-partitioned-rivest.md`):

- **Phase 1 — Foundation** (mid-flight). Cloud DB schema, auth scaffolding, ESLint guards, video transcoding pipeline, audit/log layers, RLS regression suite, migration round-trip test. **Schema v12 is live in Supabase project `wfyhsohnkbzemwxuiqhr`.** Phase 1 part 2 wires auth/login UI, the localStorage-→-DB profile migration, and the first DB-backed read path.
- **Phase 2 — Instagram** (next). OAuth + sync workers + carousel publish pipeline + webhook idempotency + proactive token refresh. Stories deferred. **Blocks on Meta App Review (4–6 weeks externally).**
- **Phase 3 — Other platforms.** TikTok → YouTube → LinkedIn → X → FB, one at a time.
- **Phase 4 — Production hardening.** Rate-limit retries, dead-letter handling, key rotation drills, alert tuning.

**Realistic time-to-Instagram-in-prod-for-non-test-users: 8–10 weeks from go.**

### Build now (during Phase 1)
- Cloud DB schema + RLS + indexes + triggers (✅ shipped at v12)
- ESLint safety nets (✅ shipped — `forUser` wrapper, `withAudit` rules, `<VideoPlayer>` enforcement, redacted logger)
- Schema-version assertion at boot (✅ shipped via `instrumentation.ts`)
- RLS regression + migration round-trip tests (✅ shipped, run on every PR)
- Sentry + Cloudflare Stream wiring (✅ scaffolding shipped — full transcoding pipeline lands in Phase 1 part 2)
- Auth UI + middleware + login + DB-backed profile read (Phase 1 part 2)
- Demo route group split (`(app)/` vs `(demo)/`) (Phase 1 part 2)

### Don't build yet
- Real Meta / Instagram OAuth (Phase 2; Meta App Review prereqs in flight)
- TikTok / YouTube / LinkedIn / X / Facebook integrations (Phase 3)
- Real AI generation (separate project)
- Stripe billing — code is shipped (commit `3742ba3`), gated on env vars. Activation runbook: [creatorhub-app/docs/runbooks/stripe-activation.md](creatorhub-app/docs/runbooks/stripe-activation.md). When unset, onboarding paywall falls back to UI-only mock.
- Multi-workspace / team mode
- Stories publishing (revisit Phase 3+ if Meta API stabilizes)
- Apple Sign-In (revisit when shipping mobile)

---

## 7. Data model (live, Phase 1)

Cloud-only on Supabase Postgres. Source of truth: SQL files in `creatorhub-app/supabase/migrations/` (v12 = 13 files numbered 0000–0012). Drizzle TS mirror in `src/db/schema.ts`. Drift caught by `tests/migration-roundtrip.spec.ts`.

**Tables** (all RLS-enabled; service-role-only tables also have REST grants revoked):

| Table | Owner | Purpose |
|---|---|---|
| `users` | RLS self-read/update | App-side mirror of `auth.users`, populated by `on_auth_user_created` trigger |
| `profiles` | RLS self-CRUD | 1:1 with users; onboarding answers; `schema_version` field for forward compatibility |
| `oauth_states` | service-role only | CSRF + PKCE for OAuth flows; atomic consume + expiry SQL |
| `integrations` | RLS self-read; writes via service role | Per-platform connections; envelope-encrypted token columns + sibling `_dek` + `_key_id` (Vault rotation-ready) |
| `assets` | RLS self-CRUD | Photos + videos; original in Supabase Storage; transcoded variants in Cloudflare Stream via `transcoded_variants` jsonb |
| `sequences` | RLS self-CRUD | Generated story sequences; slides as jsonb |
| `posts` | RLS self-CRUD | Unified imported (`source='imported'`) + native (`source='native'`) with `lifecycle_state` enum |
| `jobs` | service-role only | Unified background queue: sync, transcode, publish, refresh_token, finalize_deletion, cleanup |
| `audit_log` | RLS self-read; writes via `withAudit` | Logical `user_id` (no FK; survives 1-year retention past hard-delete with hashed value) |
| `webhook_events` | service-role only | Idempotency: unique `(provider, external_id)` |
| `sync_runs` | RLS self-read via integrations join | One row per sync attempt |
| `deletion_requests` | anon read by code | Meta-DSR-compliant deletion tracking; 30-day hard-delete window |
| `schema_migrations` | service-role only | Version tracking; boot assertion reads `max(version)` |

**Enums** (Postgres ENUM, never raw text):
`platform_t`, `integration_status_t`, `post_source_t`, `post_lifecycle_t`, `asset_kind_t`, `job_status_t`, `job_kind_t`.

**Conventions:**
- Every mutable table has a `BEFORE UPDATE` trigger (`trg_touch_updated_at`).
- Every RLS policy uses `(select auth.uid())` not `auth.uid()` (Postgres InitPlan caching).
- Every FK column has a covering index where joins or cascade-deletes are expected.
- Partial unique index `integrations_platform_external_active WHERE status = 'active'` prevents Meta-DSR collisions.

After every migration: run `mcp__supabase__get_advisors security|performance` and ship a remediation migration if it flags new issues.

---

## 8. Coding Principles

- **Simplicity first.** Minimum code that solves the problem. No speculative abstraction.
- **Surgical changes.** Touch only what the task needs.
- **Match existing style.** Don't refactor what isn't broken.
- **Component-driven.** Small, composable, named for purpose (`KpiCard`, `PerformanceChart`, `EmptyState`).
- **Tokens over magic values.** Colors, spacing, radii, shadows live in a single design-token layer (Tailwind config or CSS vars).
- **Dummy data isolated.** All mock data in `/lib/mock/` so it can be swapped for real APIs later without touching components.
- **State shape matches future API shape.** Mock objects mirror the eventual Instagram/Meta payloads.
- **No comments unless the why is non-obvious.**
- **Accessibility basics:** semantic HTML, keyboard focus, sensible contrast.
- **Responsive but desktop-first** — this is a SaaS dashboard.

---

## 9. Definition of Done (First Demo)

- All six main screens render with realistic data.
- Toggle (or two visual modes) to show empty vs connected states.
- Sidebar + topbar persistent across screens.
- Visual language consistent: spacing, type, color, card style.
- No broken links in navigation.
- Feels like a product, not a prototype.

---

## 10. Implementation reference (read this before editing code)

Concrete technical decisions made during the build so future sessions don't re-derive them.

### Repo layout

```
CreatorHub/                          # git repo root (this CLAUDE.md lives here)
├── CLAUDE.md                        # source of truth — product + brand + impl
├── .mcp.json                        # Supabase MCP server registered for project ref
├── .gitignore                       # node_modules, .next, .env*, .vercel
└── creatorhub-app/                  # the Next.js app (run npm commands from here)
    ├── AGENTS.md                    # editing conventions + safety net rules
    ├── README.md                    # quick start + Vercel deploy
    ├── next.config.ts, tsconfig.json, package.json
    ├── .env.example                 # cloud-only env template (committed)
    ├── .env.local                   # real values (gitignored, local-only)
    ├── .npmrc                       # legacy-peer-deps=true (Sentry/Next 16 peer mismatch)
    ├── drizzle.config.ts            # Drizzle Kit config (uses DIRECT_URL only)
    ├── instrumentation.ts           # boot-time schema-version assertion + Sentry binding
    ├── vitest.config.ts             # test runner config (single-fork, 30s timeout)
    ├── eslint.config.mjs            # wires the 4 custom safety-net rules
    ├── eslint-plugin-creatorhub/    # custom plugin (CommonJS):
    │   └── rules/                   #   no-raw-db-import-in-app, escape-hatch-justified,
    │                                #   no-third-party-in-with-audit, no-bare-video
    ├── supabase/
    │   ├── config.toml              # Supabase CLI config (cloud-only)
    │   └── migrations/              # 0000_setup → 0012_perf_remediation (source of truth)
    ├── tests/
    │   ├── setup.ts                 # asserts cloud env present
    │   ├── rls.spec.ts              # anon-can't-read, A-can't-read-B regression suite
    │   └── migration-roundtrip.spec.ts  # RLS+triggers+enums+indexes verified
    └── src/
        ├── app/
        │   ├── layout.tsx           # root layout + pre-paint theme + onboarded scripts
        │   ├── globals.css          # ALL design tokens
        │   ├── page.tsx             # client gate: redirects to /onboarding or /dashboard
        │   ├── onboarding/page.tsx  # 14-step wizard (bypasses AppShell)
        │   ├── dashboard/, analytics/, ideas/, library/, content/, calendar/,
        │   │   reports/, sequence-studio/{,new/}, integrations/, settings/, help/
        │   └── api/                 # (Phase 2+) /cron, /webhooks, /integrations, /auth/callback
        ├── components/
        │   ├── shell/               # AppShell, Sidebar (off-canvas on mobile), Topbar,
        │   │                        # Aurora, MouseGlow
        │   ├── ui/                  # Card, Button, Badge, Tabs, AiCallout, Thumb,
        │   │                        # PageHeader, EmptyState, StatusDot, IconButton,
        │   │                        # Toaster, DateRangeControl, VideoPlayer ← only video host
        │   ├── charts/              # AreaChart, MiniSpark, BarRow (hand-rolled SVG)
        │   ├── dashboard/           # KpiCard
        │   ├── plan/                # PlanContentDrawer, StorySequenceFlow (legacy drawer)
        │   └── onboarding/          # OnboardingShell, ProgressBar, primitives/, steps.tsx
        ├── db/
        │   ├── index.ts             # dbInternal — service-role Drizzle handle
        │   ├── forUser.ts           # typed user-scoped wrapper + escapeHatch
        │   └── schema.ts            # Drizzle TS mirror of supabase/migrations/*.sql
        └── lib/
            ├── cn.ts                # re-exports clsx as cn
            ├── audit.ts             # withAudit (DB-only enforced) + audit (between stages)
            ├── assets.ts            # assetState() helper for transcoded_variants reads
            ├── log/
            │   ├── index.ts         # log.{info,warn,error,debug} with redaction + Sentry hook
            │   └── redact.ts        # shared REDACT_KEYS used by logger AND Sentry beforeSend
            ├── supabase/
            │   ├── server.ts        # SSR Supabase client (RLS via session cookie)
            │   ├── browser.ts       # client-side singleton
            │   └── database.types.ts # generated by `npm run db:types`
            ├── onboarding/
            │   ├── types.ts         # Profile + 17 enums
            │   ├── options.ts       # display labels + descriptions
            │   ├── personalize.ts   # personaForProfile, welcomeCopy, nextActionFor, etc.
            │   └── persistence.ts   # localStorage read/write (Phase 1 part 2: → DB)
            ├── store.tsx            # AppStateProvider — legacy demo state (theme, connected,
            │                        # extraPosts, extraAssets, profile, toast)
            └── mock/                # demo data (still drives the live UI in Phase 1 part 1)
                ├── types.ts         # Post, ContentStatus, PostType, Platform, Kpi, Idea
                ├── data.ts          # posts, kpis, ideas, reports, …
                └── story.ts         # sample assets + 5 personas + 2 copy variants per cell
```

### Stack

- **Next.js 16** (App Router, Turbopack) — see `creatorhub-app/AGENTS.md`. Has breaking changes vs. older training data; consult `node_modules/next/dist/docs/` when in doubt. We do NOT use `unstable_instant`, `cacheComponents`, or Server Actions.
- **React 19** (bundled with App Router).
- **Tailwind CSS v4** — `@theme` and `@theme inline` blocks in `globals.css`. NO `tailwind.config.ts` — v4 reads tokens from CSS.
- **TypeScript 5**, **Inter** via `next/font/google`, **lucide-react**, **clsx**.
- **No chart library** — `AreaChart`, `MiniSpark`, `BarRow` are hand-rolled SVG. Recharts was removed.
- **Drizzle ORM** + `postgres-js` (with `prepare: false` for pgbouncer transaction-mode pooling).
- **Supabase** Postgres + Auth + Storage + Vault + RLS. Cloud-only.
- **Sentry** for error monitoring (bound at boot via `instrumentation.ts`).
- **Cloudflare Stream** for video transcoding + delivery (Phase 1 part 2).
- **Vitest** for RLS regression + migration round-trip tests.
- **Custom ESLint plugin** (`eslint-plugin-creatorhub/`) enforces 4 invariants — see §11.

### Theme system (the most important impl detail)

**All theme-dependent colors flow through CSS custom properties under `:root` and `:root[data-theme="dark"]`** in `src/app/globals.css`. Tailwind v4 utilities (`bg-bg`, `text-text`, `border-border`, `bg-accent`, `text-muted`, `bg-surface-2`, etc.) are defined via `@theme inline` aliases that resolve to those vars at runtime — no class re-render needed when theme switches.

**Switching mechanism:**
1. Inline `<script>` in `<head>` of `app/layout.tsx` reads `localStorage.getItem('creatorhub-theme')` and sets `data-theme` on `<html>` BEFORE React paints. Prevents flicker on reload.
2. `AppStateProvider` (`src/lib/store.tsx`) hydrates `theme` from the DOM attribute via `useEffect`, exposes `setTheme()` / `toggleTheme()`. Setter writes both `<html data-theme>` and localStorage.
3. Toggle: a `Sun` / `Moon` `IconButton` in the topbar. The richer picker (with mini previews) is in Settings → Appearance.
4. **Default = Light Mode.** Brand spec says navy text on warm-off-white surfaces.

**Legacy class aliases** — earlier sessions used a teal palette; the migration to navy/blue redirected the old tokens via `--color-teal: var(--accent)`. Some files still use `bg-teal`, `text-navy`, `cyan-soft`, etc. — they render correctly via the alias. Don't introduce new uses; prefer `bg-accent`, `text-text`, `bg-surface-2`, etc.

### Hover system — the `.lift` utility

One CSS utility class in `globals.css`:
```
.lift { cursor: pointer; transition: transform .28s, box-shadow .28s, border-color .2s; ... }
.lift:hover { transform: translateY(-2px) scale(1.005); border-color: var(--accent-border); box-shadow: var(--shadow-lift); }
```
Apply to KPI cards, top-content rows, idea cards, calendar slot cards, report tiles, integration rows, pipeline cards, sequence-studio recent tiles. Tables get a flat `hover:bg-accent/[0.04]` row tint instead. Buttons set `cursor-pointer` directly. All gated behind `prefers-reduced-motion: reduce`. Don't invent bespoke per-screen hovers.

### Primary button (deep navy gradient)

`Button variant="primary"` (default) renders the navy gradient `linear-gradient(180deg, #14315E 0%, #0B1F3A 100%)` via the `.btn-primary` CSS rule. NOT flat accent-blue — the gradient is a brand moment. `:hover` lightens the gradient via `--primary-grad-hover`. `:active` scales 97%.

### Aurora + cursor glow

- `components/shell/Aurora.tsx` — three blurred drifting blobs reading `--aurora-blue`, `--aurora-indigo`, `--aurora-cyan`. Lower alpha in light, higher in dark.
- `components/shell/MouseGlow.tsx` — single document-level mousemove listener (rAF-throttled) that writes `--mx`, `--my` on `:root`. `body::before` (in `globals.css`) renders the radial gradient using `var(--mouse-glow)`.
- Both gated behind `prefers-reduced-motion`.
- Do NOT add `bg-bg` to `AppShell`'s outer wrapper — it would cover `body::before`. Body owns the base bg.

### Charts — hand-rolled SVG (not Recharts)

`components/charts/AreaChart.tsx` is the only chart component used by Dashboard, Analytics, and Reports. It uses `ResizeObserver` to measure container width and renders an SVG with:
- Gradient fill (teal → transparent), gradient line (`#0B1F3A → #1B4FD4`)
- Y-axis labels (5 ticks, tabular nums) and X-axis labels (sparse — supplied via `data[i].x`)
- End-of-line marker (filled circle with halo)
- Strokes / fills use `var(--border)` / `var(--text-muted)` so axis colors theme automatically.

`MiniSpark` is a tiny inline sparkline used inside KPI cards. `BarRow` is a labeled horizontal bar (Dashboard "By platform"). Both are pure SVG, no animation.

**SVG attribute gotcha:** `fontVariantNumeric` is NOT a valid SVG attribute — pass it via inline `style={{ fontVariantNumeric: "tabular-nums" }}`.

### DateRangeControl

`components/ui/DateRangeControl.tsx` — preset chips + custom from/to picker. Used independently on Dashboard "Reach over time", Analytics "Performance", Analytics "Follower growth". State shape: `{ preset: '7d' | '30d' | '90d' | 'custom', from: Date, to: Date }`. Helper `rangeForPreset(preset)` returns the resolved range. Mock data helpers `getReachSeries(from, to)` and `getFollowerSeries(from, to)` produce deterministic series scaled to the range length.

### Store / state

**Two stores during Phase 1 transition** — different scopes, different lifetimes:

**`AppStateProvider` (`lib/store.tsx`)** — legacy localStorage-backed state. Owns: `theme` / `setTheme` / `toggleTheme`, `connected` / `setConnected`, `extraPosts` / `appendContentItem`, `extraAssets` / `appendAsset`, `profile` / `setProfile` / `clearProfile`, `toast` / `showToast`. Hydrated via `useEffect` (theme + profile from localStorage; pre-paint `<script>` writes `data-theme` and `data-onboarded` on `<html>` to avoid flicker / route-gate flash). The `profile` field migrates to the DB `profiles` row in Phase 1 part 2.

**Phase 1 cloud — Postgres**. App reads via:
- **Supabase server client** (`src/lib/supabase/server.ts`) — RLS-protected, used in server components + request-bound API routes. `currentUserId()` resolves the session.
- **`forUser(userId)`** (`src/db/forUser.ts`) — typed user-scoped wrapper for cron handlers, webhook handlers, admin scripts (no session). Includes typed joins: `forUser(uid).sequences.withAssets(id)`, `forUser(uid).posts.withIntegrations()`. Returns redacted `PublicIntegration` shape that strips ciphertext columns.
- **`escapeHatch(reason)`** — last resort with 20+ char justification. ESLint enforces an inline disable comment with the reason.

When wiring a new feature: **persists across devices? → cloud. UI ephemera or theme? → store.tsx is fine.**

### Mock data

`lib/mock/data.ts` — multi-platform (`Platform: 'YouTube' | 'Instagram' | 'TikTok' | 'X'`). Each `Post` carries a `platform` field. Mock user is **Ella Moreno**, 13,080 followers, "Pro plan · 2 seats". Exports: `posts`, `topPosts`, `upcoming`, `kpis`, `kpiTrends`, `platformReach`, `contentTypeBreakdown`, `ideas`, `reports`, `aiInsights`, plus the range-aware series helpers `getReachSeries` and `getFollowerSeries` and the static `followerSeriesWeekly` / `followerSeriesMonthly` (Reports growth chart). Don't refactor this file casually — every screen imports it.

`lib/mock/story.ts` — Sequence Studio data: sample assets, sequence types/styles/goals, brand context, deterministic `generateSequence(selected, goal, type, style)`. Self-contained.

### PlanContentDrawer / Sequence Studio entry points

The drawer has 3 tabs: **Quick post** · **Sequence Studio** (the AI flow) · **From idea**. Entry points:

- **Calendar** — click any day → drawer with `entry="calendar"` + `slotDate` pre-filled. Primary action: Schedule in this slot.
- **Ideas** — "Generate ideas" button → drawer with `entry="ideas"`. Primary: Move to Content.
- **Content** — "Sequence Studio" outline chip + "New content" button → drawer with `entry="content"`. Primary: Move to Content.
- **Sequence Studio** (`/sequence-studio`) — landing page. "Start a sequence" button → drawer with `entry="content"` (same primary). Sidebar item under Tools navigates here.

Sequences committed via `appendContentItem` get `status: "Review"` (Move to Content) or `status: "Scheduled"` (Schedule in slot, with `scheduledAt`).

### Gotchas

- **lucide-react** has no brand icons (no `Instagram`, `Youtube`, `TikTok`, `Music2` doesn't exist either). Use `Camera`, `PlaySquare`, `Video`, `Hash`, `BarChart3`, etc. as substitutes.
- **SVG `fontVariantNumeric`** — must be in `style`, not as an attribute (see Charts section).
- **React 19 `setState` in `useEffect`** — lint rule `react-hooks/set-state-in-effect` warns. We have 3 legitimate uses (theme bootstrap from DOM, controlled-component sync, drawer tab reset on reopen) marked with `eslint-disable-next-line` + a one-line justification. Don't add new ones casually.
- **Keyframe interpolation** — `@keyframes` rules can read CSS vars but interpolation is unreliable. `dot-pulse` uses literal blue rgba so the pulse looks identical in both themes.
- **Sidebar bg is fixed** but the gradient differs by theme. Both versions read tokens local to `Sidebar.tsx` (`lightTokens` / `darkTokens`). The bg is intentional brand anchor; do not bind to `--bg`.
- **Toaster gradient is fixed dark.** Inverted-contrast toast convention — works on both themes.
- **Reports hero is fixed dark.** Intentional dark moment in light mode; deeper navy in dark mode.
- **AppShell wrapper has no bg.** `body::before` mouse glow paints through. Don't add `bg-bg` to the outer wrapper.
- **`Custom` date input is native `<input type="date">`.** Browser-styled. We set `colorScheme: "light dark"` so it themes automatically.

### Useful commands (run from `creatorhub-app/`)

```bash
# App
npm run dev                # Tries port 3000, falls back to 3003+
npm run build              # TS + Turbopack — MUST pass before commit
npm run lint               # ESLint — MUST be clean (custom rules active)

# Database (Supabase CLI, cloud-only)
npm run db:link            # one-time: link repo to your Supabase project
npm run db:migrate         # apply unapplied SQL files in supabase/migrations/
npm run db:status          # list applied migrations
npm run db:reset           # nuke + replay (destructive — staging only)
npm run db:types           # regen src/lib/supabase/database.types.ts from cloud schema
npm run schema:version     # print migration count (use to bump EXPECTED_SCHEMA_VERSION)

# Tests
npm run test               # vitest in watch mode
npm run test:rls           # RLS regression suite (anon-can't-read, A-can't-read-B)
npm run test:migration     # migration round-trip (RLS+triggers+enums+indexes verified)
```

### Testing routes

After any change, hit all routes via curl to confirm 200:
```
for p in /dashboard /analytics /ideas /library /content /calendar /reports \
         /sequence-studio /sequence-studio/new /onboarding \
         /integrations /settings /help; do
  /usr/bin/curl -s -o /dev/null -w "$p -> %{http_code}\n" "http://localhost:3003$p"
done
```

### Schema management workflow

When adding a migration:
1. Write `supabase/migrations/00XX_name.sql` with `insert into schema_migrations (version) values (N)` at the bottom.
2. Mirror in `src/db/schema.ts`.
3. Apply via `mcp__supabase__apply_migration` (preferred — fast + transactional) OR `npm run db:migrate`.
4. Run `mcp__supabase__get_advisors security` and `performance`. Ship a remediation migration if it flags new issues.
5. Bump `EXPECTED_SCHEMA_VERSION` in `.env.example` + `tests/migration-roundtrip.spec.ts`.
6. Run `npm run db:types` to refresh `src/lib/supabase/database.types.ts`.

### Visual reference

The original visual technique inspiration was `/Users/luka/Operations /Claude Code/Petar/app/css/main.css` (aurora blobs, cursor-tracking glow, glass surfaces, pulsing status dots). We dialed the motion back to fit the calmer brand (no perspective tilt — flat lift instead). The bigger visual conversion came later from a kit shared in-conversation that defined the navy primary gradient, glass topbar, Workspace/Tools/System sidebar split, and the SVG charts.

### Deployment

Next.js 16 app on Vercel. Repo lives at parent `CreatorHub/` directory. **Vercel Root Directory** must be set to `creatorhub-app`. Auto-deploy on push to `main`. Required env vars (set in Vercel dashboard, prod + preview separately) — see `creatorhub-app/.env.example` for the full list with placement notes.

Boot guard: `instrumentation.ts` asserts `EXPECTED_SCHEMA_VERSION` matches `max(schema_migrations.version)` — refuses to serve traffic in production on mismatch. Set in CI from migration count.

### Out of scope (don't drift)

- ~~Stories publishing~~ — included in Phase 2 (Meta opened Story API for Business accounts in 2023/24). API supports single photo/video Stories only; stickers/polls/music/swipe-ups remain in-app only and we surface a "finish in Instagram" affordance.
- Apple Sign-In (revisit when shipping mobile).
- Real AI generation (separate project — not Phase 1 or 2).
- Stripe billing (separate project — needed before user 2).
- Multi-workspace / team mode (single user per account in v1).
- Cmd-K palette, global popover system, Playwright screenshot script.
- Local Supabase Docker stack (cloud-only).

### Video pipeline — current "lean" mode + future Stream plan

**Today (free tier)**: no Cloudflare Stream. The finalize endpoint
(`/api/assets/[id]/finalize`) marks every uploaded video as playable
immediately; `<VideoPlayer>` fetches a 1-hour Supabase Storage signed URL
via `/api/assets/[id]/playback-url` and plays the original `<video>`. No
adaptive bitrate, no edge CDN beyond Supabase Smart CDN, originals are
big — fine at MVP scale.

**Future (paid plan unlock)**: Cloudflare Stream for transcoding +
adaptive bitrate. The dormant code is already in tree:
- `src/lib/stream.ts` — Cloudflare API wrapper (`copyFromUrl`, `getVideo`)
- `src/app/api/cron/run-jobs/route.ts` — claim-safe transcode worker

To flip on:
1. Subscribe to Cloudflare Stream ($5/mo).
2. Set `CLOUDFLARE_ACCOUNT_ID` + `CLOUDFLARE_STREAM_API_TOKEN` + `CRON_SECRET` in env.
3. Change the finalize endpoint's video branch back to enqueueing a
   `jobs(kind='transcode')` row instead of marking ready immediately.
4. Add a Vercel cron entry hitting `/api/cron/run-jobs?kind=transcode`
   every minute.
5. The `<VideoPlayer>` change: read `transcoded_variants.hls_url` (set by
   the worker) instead of calling `/playback-url`.

The product rationale for keeping Stream behind a paywall: video delivery
is expensive at scale ($1 per 1k minutes delivered + autoplay-prone
viewers can rack this up fast), and a paid tier funds the upgrade.
Free-tier creators get the same UX — videos play — they just buffer more
on slow connections.

---

## 11. Phase 1 implementation reference (the safety story)

Where the security/perf/audit/log/video architecture lives, in code. Treat the **rules** below as binding — every one is enforced by either ESLint, runtime checks, or the migration round-trip suite.

### Database access — `forUser(userId)` is the only sanctioned wrapper

Defined in `src/db/forUser.ts`. Returns typed scopes: `profiles`, `assets`, `sequences`, `posts`, `integrations`. Each scope's methods inject `where eq(table.userId, userId)` automatically, including on joins (`sequences.withAssets(id)`, `posts.withIntegrations()`).

**Token bytes never leak.** `IntegrationsScope` returns the `PublicIntegration` shape (no `*_ciphertext`, `*_dek`, `*_key_id`). Raw integration rows only exist inside the worker that just decrypted via Vault.

**Escape hatch** for cross-user analytics / admin scripts:
```ts
// eslint-disable-next-line creatorhub/escape-hatch-justified — running quarterly platform-mix report across all tenants
const db = escapeHatch("running quarterly platform-mix report across all tenants");
```
Throws at runtime if the reason is < 20 chars. ESLint requires the inline disable comment with a 20+ char `— reason` segment. If it's used > 3 times in a phase, **add a new typed scope method** instead.

**ESLint rule**: `creatorhub/no-raw-db-import-in-app` blocks raw `dbInternal` / `escapeHatch` imports outside `src/db/`, `src/lib/audit.ts`, `src/app/api/{cron,webhooks}/`, `tests/`, and the plugin's own folder.

### Audit log — `withAudit` for DB-only, multi-stage for third-party APIs

Defined in `src/lib/audit.ts`. The rule (enforced by ESLint `creatorhub/no-third-party-in-with-audit`):

✅ **Correct: DB-only inside `withAudit`**
```ts
await withAudit(userId, { action: "profile.updated", target_type: "profile", target_id: userId },
  async (tx) => tx.update(profiles).set(patch).where(eq(profiles.userId, userId))
);
```

❌ **Forbidden: third-party calls inside the callback**
```ts
await withAudit(userId, { action: "post.published" },
  async (tx) => publishToInstagram(tx, sequence)   // holds tx for minutes — pool exhausted
);
```

✅ **Multi-stage: one audit row per stage**
```ts
const postId = await withAudit(userId, { action: "post.publish_initiated" },
  async (tx) => insertDraft(tx, sequence)
);
const result = await publishCarouselToInstagram(...);   // outside any tx
await withAudit(userId, { action: "post.published" },
  async (tx) => tx.update(posts).set({ lifecycleState: "published", externalId: result.mediaId })
                  .where(eq(posts.id, postId))
);
```

ESLint walks the AST inside `withAudit(..., async (tx) => {...})` callbacks and flags `fetch(`, allow-listed platform SDK imports (`googleapis`, `linkedin-api-client`, `twitter-api-v2`, `cloudflare`, `mux-node`, etc.), imports from `src/integrations/**`, and `setTimeout` / `setInterval`.

### Logging — single shared `REDACT_KEYS`

Defined in `src/lib/log/redact.ts`. Used by **both** the `log` API (`src/lib/log/index.ts`) and Sentry's `beforeSend` (wired in `instrumentation.ts`). Adding a sensitive key updates both consumers.

Default redaction list includes: `access_token`, `refresh_token`, `client_secret`, `password`, `authorization`, `cookie`, `set-cookie`, `code_verifier`, `state`, `email`, `phone`, `ip`, all the `*_ciphertext` / `*_dek` columns, and more.

### Video — `<VideoPlayer>` is the only sanctioned host

Defined in `src/components/ui/VideoPlayer.tsx`. Encodes the cost-control rules from the plan:
- Poster-only by default. Click swaps in `<video preload="none">`.
- No `autoPlay` prop exposed (intentional — poster-then-play UX only).
- Hover effects are CSS-only (no `onMouseEnter` triggering load).
- State machine via `assetState(asset)` from `src/lib/assets.ts`: `'playable' | 'failed' | 'processing'`.

ESLint (`creatorhub/no-bare-video`) blocks `<video>`, `<iframe src=cloudflarestream.com…>`, and `<stream-player>` outside `VideoPlayer.tsx` itself. **Never** introduce hover-autoplay or `preload="metadata"` on a tile — Cloudflare Stream delivery dominates the cost curve and we have a hard product rule against it.

Existing legacy demo code uses bare `<video>` for blob-URL previews; those are gated by inline `// eslint-disable-next-line creatorhub/no-bare-video --- demo blob-URL preview` comments and migrate to `<VideoPlayer>` when DB-backed assets land in Phase 1 part 2.

### OAuth state — atomic consume + expiry in one statement

When wiring an integration callback (Phase 2):
```sql
-- Wrong (race): two separate checks
UPDATE oauth_states SET consumed_at = now()
WHERE state = $1 AND consumed_at IS NULL RETURNING ...;
-- then app code checks expires_at > now()  ← race window

-- Right: single atomic statement, zero rows = reject
UPDATE oauth_states SET consumed_at = now()
WHERE state = $1 AND consumed_at IS NULL AND expires_at > now()
RETURNING user_id, platform, code_verifier_hash, redirect_uri;
```

App Review reviewers test this exact pattern. Atomic is non-negotiable.

### Background jobs — one `jobs` table with `kind` enum

Workers claim with `FOR UPDATE SKIP LOCKED`. Sweeper uses `heartbeat_at`, **not** `claimed_at`:
```sql
-- Worker bumps heartbeat every 30s. Sweeper checks 90s threshold (3 missed beats).
UPDATE jobs SET status = 'queued', heartbeat_at = NULL,
       next_attempt_at = now() + (attempts * interval '30 seconds')
WHERE status = 'running' AND heartbeat_at < now() - interval '90 seconds';
```

`claimed_at` is observability-only. Live workers never get sweep-killed regardless of total job duration.

### Schema-version assertion — refuses to boot on drift

`instrumentation.ts` reads `EXPECTED_SCHEMA_VERSION` from env (set by CI from migration count) and compares to `max(schema_migrations.version)`. In production a mismatch throws and the process refuses to serve traffic. In dev it logs a warning and continues (devs are often mid-migration).

The Sentry binding lives in the same file: `bindSentry({ captureException, captureMessage })` from `src/lib/log/index.ts` is wired up so any `log.error()` from the very first request lands in Sentry with redacted context.

### CI safety net (run on every PR, before any feature merges)

| Check | What it proves |
|---|---|
| `npm run lint` | `forUser` discipline, escape-hatch justifications, no third-party-in-`withAudit`, no bare `<video>` |
| `npm run test:rls` | anon-can't-read, user A can't read B's rows, A can't insert as B (per user-owned table) |
| `npm run test:migration` | RLS enabled on every table, every mutable table has the `BEFORE UPDATE` trigger, every enum exists, schema version matches expectation |
| `npm run build` | TS strict + Turbopack production build |

The reviewer who signed off Phase 1 explicitly called these "Day 1, not Day 14" — they need to land before any feature work. They're already in `tests/` and `eslint-plugin-creatorhub/`.

### Cost projection

| Service | Tier | Monthly |
|---|---|---|
| Supabase | Pro | $25 |
| Supabase PITR | +$100 add-on, **not in Pro base** — upgrade before first paying customer or 50+ MAU | $0 → $100 |
| Supabase Storage overage | $0.021/GB above 100GB | $10–50 |
| Cloudflare Stream | Delivery dominates ($1/1k mins delivered). Product rules enforced via `<VideoPlayer>`. | $50–150 |
| Vercel | Pro | $20 |
| Sentry | Free → Team | $0 → $26 |
| X API | Basic, write access | $200 (when X ships) |

Phase 1 launch baseline: ~$50/mo. With active video creators: $100–200/mo. At scale (1k+): $500–800/mo.

### Phase 1 done-when

Phase 1 is fully done when:
- ✅ Cloud DB schema v12+ live + advisor-clean (security WARNs zero, performance WARNs zero, INFOs only `unused_index` on empty tables)
- ✅ All 4 ESLint custom rules active and passing on a clean repo
- ✅ RLS regression suite + migration round-trip green
- ✅ `instrumentation.ts` schema-version assertion working
- ✅ Sentry binding + redactedLogger working
- ✅ `<VideoPlayer>` component shipped + ESLint enforced
- 🔜 Auth: login UI + middleware gate + `(app)/` vs `(demo)/` route group split
- 🔜 First DB-backed read path (Sidebar reads `displayName` / persona from `profiles` table, not localStorage)
- 🔜 Video upload → Cloudflare Stream → playable HLS end-to-end
- 🔜 localStorage profile → DB migration on first login + "re-upload your assets" banner

The 🔜 items are Phase 1 part 2.
