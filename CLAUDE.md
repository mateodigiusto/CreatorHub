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
4. Content
5. Calendar

**Tools** (output / utilities):
6. Sequence Studio (`/sequence-studio`)
7. Reports

**System** (account / admin):
- Integrations
- Settings

The topbar holds: workspace breadcrumb, search (with ⌘K hint), platform-connection pill ("4 platforms connected" when on), theme toggle, notifications, "New content" CTA.

**Not in first demo:** AI Studio (separate from Sequence Studio), Clients, Inspiration Engine, Education Hub, Automations, Community, Advanced Tasks, Billing, Team Management, Client Portal, Help (route exists but unlinked).

---

## 4. Screen Purposes

- **Dashboard** — daily command center. Welcomes the user (Ella Moreno in mock), shows 4 KPI cards (Reach / Engagement rate / New followers / Top post CTR) with `MiniSpark` trends, "Reach over time" `AreaChart` with `DateRangeControl`, "By platform" `BarRow` panel, AI insight callout, "Up next" schedule list, "Top performing posts" table.
- **Analytics** — the data layer. 4 different KPIs (Total reach / Impressions / Engagement / Profile visits), Performance + Follower growth charts (each with its own `DateRangeControl`), content type breakdown bars, Messages/Leads panel, best-posting-time heatmap, top posts table, AI explanation.
- **Ideas** — AI-generated hooks aligned with the last 30 days of performance. All / Saved tabs (with bookmark count), AI callout up top, 6 idea cards each with `ScoreRing` + estimated reach + "Open" button.
- **Content** — production system. Statuses: Idea → Script → Recording → Editing → Review → Scheduled → Published → Analyzed. Two views via `Tabs`: **Library** (3-col card grid with image-on-top + status badge) and **Pipeline** (5 columns: Idea / Script / Editing / Scheduled / Published).
- **Calendar** — month view (5 weeks × 7 days). Today is marked with a dark navy gradient circle. Each day shows up to 2 event chips with vertical color bars. Click any day to open the `PlanContentDrawer` pre-filled with that date.
- **Sequence Studio** — landing for the AI sequence generator. 3 step-cards explaining the flow (Pick assets → Set direction → Generate & ship), a "Recent sequences" list. Clicking "Start a sequence" opens the same `PlanContentDrawer` with the Sequence Studio tab active.
- **Reports** — client-ready summary. Weekly / Monthly tabs. Always-dark hero panel with corner radial glows + 5 stats. Growth `AreaChart` + AI summary callout. Top content 3-tile grid.

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

## 6. Build Priorities (First Demo)

The first demo is a **frontend-only experience** that communicates vision, structure, workflow, and premium UI direction.

**Build:**
- Premium app shell (sidebar + topbar) with text wordmark
- All six main screens with realistic dummy data
- Empty + connected states
- Settings/Integrations placeholder
- Polished, premium feel end-to-end

**Do NOT build yet:**
- Final brand assets / logo (deferred until brand direction confirmed)
- Backend / database
- Authentication
- Payments / billing
- Real Meta / Instagram OAuth and data fetch
- AI generation (mock the outputs)
- Multi-tenant / team logic

---

## 7. Future Data Model (Reference Only)

Eventually: User connects Instagram → Meta OAuth → permissions → access token → fetch profile/posts/insights → store → power Dashboard, Analytics, Ideas, Content, Calendar, Reports.

For now: dummy data shaped like the eventual real data, so screens won't need restructuring later.

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
├── .gitignore                       # ignores node_modules, .next, .env*, .vercel
└── creatorhub-app/                  # the Next.js app (run npm commands from here)
    ├── AGENTS.md                    # Next.js 16 breaking-changes note
    ├── README.md                    # demo overview + deploy instructions
    ├── next.config.ts               # default; Turbopack for dev/build
    ├── tsconfig.json                # @/* path alias points to src/
    ├── package.json                 # scripts: dev, build, start, lint
    └── src/
        ├── app/
        │   ├── layout.tsx           # root layout + pre-paint theme script
        │   ├── globals.css          # ALL design tokens (theme system)
        │   ├── page.tsx             # redirect → /dashboard
        │   ├── dashboard/page.tsx
        │   ├── analytics/page.tsx
        │   ├── ideas/page.tsx
        │   ├── content/page.tsx
        │   ├── calendar/page.tsx
        │   ├── reports/page.tsx
        │   ├── sequence-studio/page.tsx
        │   ├── integrations/page.tsx
        │   ├── settings/page.tsx
        │   └── help/page.tsx
        ├── components/
        │   ├── shell/               # AppShell, Sidebar, Topbar, Aurora, MouseGlow
        │   ├── ui/                  # Card, Button, Badge, Tabs, AiCallout, Thumb,
        │   │                        # PageHeader, EmptyState, StatusDot, IconButton,
        │   │                        # Toaster, DateRangeControl
        │   ├── charts/              # AreaChart, MiniSpark, BarRow (hand-rolled SVG)
        │   ├── dashboard/           # KpiCard
        │   └── plan/                # PlanContentDrawer + StorySequenceFlow
        └── lib/
            ├── cn.ts                # re-exports clsx as cn
            ├── store.tsx            # AppStateProvider context (theme, connected,
            │                        # extraPosts, toast)
            └── mock/
                ├── types.ts         # Post, ContentStatus, PostType, Platform, Kpi, Idea
                ├── data.ts          # posts, kpis, kpiTrends, platformReach, ideas,
                │                    # reports, aiInsights, getReachSeries, getFollowerSeries
                └── story.ts         # sample assets, sequence types/styles/goals,
                                     # generateSequence() deterministic helper
```

### Stack

- **Next.js 16** (App Router, Turbopack) — see `creatorhub-app/AGENTS.md`. Has breaking changes vs. older training data; consult `node_modules/next/dist/docs/` when in doubt. We do NOT use `unstable_instant`, `cacheComponents`, or Server Actions.
- **React 19** (bundled with App Router).
- **Tailwind CSS v4** — `@theme` and `@theme inline` blocks in `globals.css`. NO `tailwind.config.ts` — v4 reads tokens from CSS.
- **TypeScript 5**, **Inter** via `next/font/google`, **lucide-react**, **clsx**.
- **No chart library** — `AreaChart`, `MiniSpark`, `BarRow` are hand-rolled SVG. Recharts was removed.

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

`AppStateProvider` (`lib/store.tsx`) is the only context. Exposes:
- `connected` / `setConnected` — drives empty vs connected states across all screens via the topbar pill ("4 platforms connected").
- `theme` / `setTheme` / `toggleTheme` — light/dark, persisted to `localStorage('creatorhub-theme')`.
- `extraPosts` / `appendContentItem(post)` — generated story sequences from the drawer get appended here. Pages merge with the static `posts` from `lib/mock/data.ts` (`const allPosts = [...extraPosts, ...posts]`). Lost on hard reload — intentional for a demo.
- `toast` / `showToast(message)` — single-slot toast, auto-dismiss 2.8s. Mounted by `<Toaster />` inside `AppShell`.

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
npm run dev      # Dev server. Tries port 3000, falls back to 3003+
npm run build    # Production build (TS + Turbopack). MUST pass before commit.
npm run lint     # ESLint — must be clean before commit.
```

### Testing routes

After any change, hit all routes via curl to confirm 200:
```
for p in /dashboard /analytics /content /calendar /ideas /reports /sequence-studio /integrations /settings /help; do
  /usr/bin/curl -s -o /dev/null -w "$p -> %{http_code}\n" "http://localhost:3003$p"
done
```

### Visual reference

The original visual technique inspiration was `/Users/luka/Operations /Claude Code/Petar/app/css/main.css` (aurora blobs, cursor-tracking glow, glass surfaces, pulsing status dots). We dialed the motion back to fit the calmer brand (no perspective tilt — flat lift instead). The bigger visual conversion came later from a kit shared in-conversation that defined the navy primary gradient, glass topbar, Workspace/Tools/System sidebar split, and the SVG charts.

### Deployment

Frontend-only Next.js 16 app. Repo lives at the parent `CreatorHub/` directory. **Vercel Root Directory** must be set to `creatorhub-app` (the Next app is in a subfolder). No env vars required. No build command override.

Auto-deploy on push to `main` is on. Local secrets audit (last run): zero `process.env.*` references, no `.env*` files, no API keys. `npm audit` shows 2 moderate transitive postcss advisories inside Next.js itself — upstream issue, no actionable fix without downgrading Next.

### Out of scope (don't drift)

- No backend, auth, payments, real Meta OAuth, real AI calls, real persistence.
- No new main nav items beyond the current Workspace + Tools + System sections.
- No Cmd-K palette, no global popover system, no Playwright screenshot script.
- No mobile-specific layout work beyond "doesn't break."
