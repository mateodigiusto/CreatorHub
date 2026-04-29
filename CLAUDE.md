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

**Main:**
1. Dashboard
2. Analytics
3. Ideas
4. Content
5. Calendar
6. Reports

**Secondary:** Settings · Integrations · Help

**Not in first demo:** AI Studio, Clients, Inspiration Engine, Education Hub, Automations, Community, Advanced Tasks, Billing, Team Management, Client Portal.

---

## 4. Screen Purposes

- **Dashboard** — daily command center. Answers: how is my content doing, what needs attention, what's next, what's scheduled, what performed best. Sections: hero summary, KPI cards (Reach, Engagement, Messages/Leads, Posts Published), performance chart, AI insight, top content, upcoming content, pipeline snapshot, quick actions.
- **Analytics** — the data layer. Explains what works and why. Sections: filters, performance summary, growth chart, content-type breakdown, top posts, messages/leads analytics, AI explanation.
- **Ideas** — turns analytics into future content. Sections: idea board, AI-generated ideas, saved winning formats, inspiration library, idea detail panel.
- **Content** — production system. Statuses: Idea → Script → Recording → Editing → Review → Scheduled → Published → Analyzed. Sections: library, pipeline, search/filters, detail drawer, performance badges.
- **Calendar** — publishing system. Sections: weekly calendar, upcoming list, empty slots, scheduled, overdue.
- **Reports** — business/client summary. Sections: weekly report, monthly report, top content summary, growth summary, AI-written explanation, export options.

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

This section captures concrete technical decisions made during the first demo build so future sessions don't re-derive them.

### Repo layout

```
CreatorHub/                          # repo root (this CLAUDE.md lives here)
├── CLAUDE.md                        # source of truth — product + brand + impl
└── creatorhub-app/                  # the Next.js app (run npm commands from here)
    ├── AGENTS.md                    # → @AGENTS.md note about Next.js 16 breaking changes
    ├── README.md                    # demo + deploy instructions
    ├── next.config.ts               # default; Turbopack for dev/build
    ├── tsconfig.json                # @/* path alias points to src/
    ├── package.json                 # scripts: dev, build, start, lint
    ├── public/                      # static assets (mostly unused — text wordmark only)
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
        │   ├── integrations/page.tsx
        │   ├── settings/page.tsx
        │   └── help/page.tsx
        ├── components/
        │   ├── shell/               # AppShell, Sidebar, Topbar, Aurora, MouseGlow
        │   ├── ui/                  # Card, Button, Badge, EmptyState, Drawer, Tabs,
        │   │                        # AiCallout, Thumb, PageHeader, StatusDot,
        │   │                        # ThemeToggle, Toaster
        │   ├── charts/              # PerformanceChart, GrowthChart (Recharts)
        │   ├── dashboard/           # KpiCard
        │   └── plan/                # PlanContentDrawer + StorySequenceFlow
        └── lib/
            ├── cn.ts                # re-exports clsx as cn
            ├── store.tsx            # AppStateProvider context (theme, connected,
            │                        # extraPosts, toast)
            └── mock/
                ├── types.ts         # Post, ContentStatus, PostType, Kpi, Idea
                ├── data.ts          # posts, kpis, time series, ideas, reports
                └── story.ts         # sample assets, sequence types/styles/goals,
                                     # generateSequence() deterministic helper
```

### Stack

- **Next.js 16** (App Router, Turbopack) — see `creatorhub-app/AGENTS.md`. Has breaking changes vs. older training data; consult `node_modules/next/dist/docs/` if a feature behaves unexpectedly. We do NOT use `unstable_instant`, `cacheComponents`, or Server Actions in this demo.
- **React 19** (canary, bundled with App Router).
- **Tailwind CSS v4** — `@theme` and `@theme inline` blocks in `globals.css`. NOT a `tailwind.config.ts` — v4 reads tokens from CSS.
- **TypeScript 5**, **Inter** via `next/font/google`, **lucide-react**, **clsx**, **Recharts**.

### Theme system (the most important impl detail)

**All theme-dependent colors flow through CSS custom properties under `:root` and `:root[data-theme="dark"]`** in `src/app/globals.css`. Tailwind v4 utilities (`bg-bg`, `text-text`, `border-border`, `bg-accent`, `text-muted`, `bg-surface-2`, etc.) are defined via `@theme inline` aliases that resolve to those vars at runtime — no class re-render needed when theme switches.

**Switching mechanism:**
1. Inline `<script>` in `<head>` of `app/layout.tsx` reads `localStorage.getItem('creatorhub-theme')` and sets `data-theme` on `<html>` BEFORE React paints. Prevents flicker on reload.
2. `AppStateProvider` (`src/lib/store.tsx`) hydrates `theme` from the attribute, exposes `setTheme()` / `toggleTheme()`. Setter writes both `<html data-theme>` and localStorage.
3. `ThemeToggle` lives in the topbar; richer picker in Settings (Appearance card with mini previews).
4. **Default = Light Mode.** Brand spec says navy text on warm-off-white surfaces.

**Legacy class aliases** — the codebase has ~117 references to `bg-teal`, `text-teal`, `border-teal`, `text-navy`, `bg-navy`, `cyan-soft`, `teal-blue` from before the navy/blue palette switch. They render correctly because `globals.css` aliases them to the new tokens (`--color-teal: var(--accent)`, etc.). Treat them as semantic debt only — don't introduce new `text-teal` references; use `text-accent` / `text-text` / `bg-surface-2` instead.

### Hover system — the `.lift` utility

A single CSS utility class in `globals.css`:
```
.lift:hover { transform: translateY(-2px) scale(1.005); border-color: var(--accent-border); box-shadow: var(--shadow-lift); }
```
Apply to KPI cards, top-content rows, idea cards, calendar slots, report tiles, integration rows, pipeline cards. Tables stay flat (`hover:bg-accent/[0.04]`). All gated behind `prefers-reduced-motion: reduce`. Don't invent bespoke per-screen hovers.

### Aurora + cursor glow

- `components/shell/Aurora.tsx` — three blurred drifting blobs reading `--aurora-blue`, `--aurora-indigo`, `--aurora-cyan`. Lower alpha in light, higher in dark.
- `components/shell/MouseGlow.tsx` — single document-level mousemove listener (rAF-throttled) that writes `--mx`, `--my` on `:root`. `body::before` (in `globals.css`) renders the radial gradient using `var(--mouse-glow)`.
- Both gated behind `prefers-reduced-motion`.
- Do NOT add `bg-bg` to `AppShell`'s outer wrapper — it would cover `body::before`. Body owns the base bg.

### Store / state

`AppStateProvider` (`lib/store.tsx`) is the only context. Exposes:
- `connected` / `setConnected` — drives empty vs connected states across all screens via the topbar pill.
- `theme` / `setTheme` / `toggleTheme` — light/dark.
- `extraPosts` / `appendContentItem(post)` — generated story sequences from `PlanContentDrawer` get appended here. Pages merge `extraPosts` with the static `posts` from `lib/mock/data.ts` (e.g. `const allPosts = [...extraPosts, ...posts]`). Lost on hard reload — intentional for a demo.
- `toast` / `showToast(message)` — single-slot toast, auto-dismiss 2.8s. Mounted by `<Toaster />` inside `AppShell`.

### Mock data

`lib/mock/data.ts` is the canonical post/idea/kpi/timeseries data. Shape mirrors a future Meta Graph payload so the swap won't restructure components. Don't refactor this file casually — many screens import directly from it.

`lib/mock/story.ts` contains story-sequence-specific data (sample assets, sequence types/styles/goals, brand context, deterministic `generateSequence()`). Self-contained; safe to extend.

### PlanContentDrawer entry points

- **Calendar** "Plan slot" cells → drawer with `entry="calendar"` + `slotDate` pre-filled. Primary action: Schedule in this slot.
- **Ideas** featured tile → `entry="ideas"`. Primary: Move to Content.
- **Content** header chip + "New content" → `entry="content"`. Primary: Move to Content.

Sequences committed via `appendContentItem` get `status: "Review"` (Move to Content) or `status: "Scheduled"` (Schedule in slot, with `scheduledAt` set).

### Gotchas seen during build

- **lucide-react** has no brand icons (no `Instagram`, no `TikTok`, no `Facebook`). Use `Camera`, `BarChart3`, etc. as substitutes. `lucide-react@latest` was installed; the scaffold pinned a stale `1.14.0`.
- **Recharts tooltip `formatter`** — TypeScript complains if you type the value as `number`. Use `(v) => Number(v).toLocaleString()`.
- **Recharts in dark mode** — `contentStyle` accepts CSS vars; we pass `background: "var(--surface)"`, `border: "1px solid var(--border)"`, `color: "var(--text)"` so tooltips theme automatically. Series colors and grid stroke also use `var()`.
- **Keyframe interpolation** — `@keyframes` can read CSS vars in modern browsers but interpolation is unreliable. Our `dot-pulse` keyframe uses literal blue rgba values (same accent base in both themes, so the pulse looks identical regardless of mode).
- **Sidebar bg is fixed** — Midnight Blue `#0B1220` in both themes. It's the constant brand anchor. Do not theme it.
- **Toaster gradient is fixed dark** — intentional inverted contrast. Do not theme.
- **Reports hero gradient is fixed dark** — intentional dark-mode moment. Don't make it light-mode-aware.

### Useful commands (run from `creatorhub-app/`)

```bash
npm run dev      # Dev server. Tries port 3000, falls back to 3003+
npm run build    # Production build (TS + Turbopack). MUST pass before commit.
npm run lint     # ESLint
```

### Testing routes

After any change, hit all routes via curl on the dev server to confirm they 200:
```
for p in /dashboard /analytics /content /calendar /ideas /reports /integrations /settings /help; do
  /usr/bin/curl -s -o /dev/null -w "$p -> %{http_code}\n" "http://localhost:3003$p"
done
```

### Visual reference

The user provided `/Users/luka/Operations /Claude Code/Petar/app/css/main.css` as the *technique* reference — aurora blobs, cursor-tracking glow, glass surfaces, pulsing status dots, stage-colored pipeline borders. We adopted the techniques but dialed the motion back to fit our calmer brand (no perspective tilt — flat lift instead).

### Deployment

This is a frontend-only Next.js 16 app. Vercel auto-detects Next.js — **Root Directory** must be set to `creatorhub-app` (the Next app is in a subfolder of the repo). No env vars required. No build command override needed.

Local secrets / env audit: zero `process.env.*` references in source, no `.env*` files exist, no API keys hardcoded. Safe to push as-is.

### Out-of-scope reminders (don't drift)

- No backend, no auth, no payments, no real Meta OAuth, no real AI calls, no real persistence (extraPosts lost on reload).
- No new main nav items. No new product modules (AI Studio, Clients, etc. are deferred).
- No Cmd-K palette, no global date range picker, no popover system, no Playwright screenshot script (all considered, all deferred).
- No mobile-specific layout work beyond "doesn't break."
