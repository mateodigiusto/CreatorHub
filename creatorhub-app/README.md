# CreatorHub — Demo

CreatorHub is a premium creator operating system for creators, info-product businesses, agencies, and social media teams. It helps users **plan, create, analyze, and grow** their content from one clean command center.

**Core loop:** Plan → Create → Analyze → Grow

This repo contains the first demo — a frontend-only experience that communicates the product vision, structure, workflow, and premium UI direction. There is no backend, authentication, real platform integration, or real AI. All data is realistic mock data shaped like the eventual real payloads.

## What's inside

- **Workspace screens** — Dashboard, Analytics, Ideas, Content (Library + Pipeline), Calendar (month view)
- **Tools** — Sequence Studio (AI sequence generator), Reports
- **System** — Settings (with theme picker), Integrations
- **Light + Dark themes** — toggle in the topbar, persisted to localStorage, no flicker on reload
- **Sequence Studio** — 3-step flow (pick assets → set direction → generate & ship) opened from Calendar / Ideas / Content / its own page
- **Date range pickers** — `Last 7d` / `Last 30d` / `Last 90d` / Custom (from-to) on Dashboard "Reach over time" and Analytics "Performance" + "Follower growth"
- **Aurora background + cursor glow** — subtle ambient motion behind the UI
- **Multi-platform demo** — YouTube, Instagram, TikTok, X all reflected in mock data

## Run locally

```bash
npm install
npm run dev
```

Opens on `http://localhost:3000` (or 3003+ if 3000 is busy).

## Build / lint

```bash
npm run build
npm run lint
```

Both must pass before commit.

## Deploy on Vercel

Vercel auto-detects Next.js. **Set the project's Root Directory to `creatorhub-app`** since the Next.js app lives in a subfolder of the repo. No environment variables required.

## Tech

- Next.js 16 (App Router, Turbopack)
- React 19
- Tailwind CSS v4 (CSS-based theme tokens via `@theme` blocks)
- TypeScript 5
- Hand-rolled SVG charts (no chart library dependency)
- lucide-react for icons
- Inter via `next/font/google`

## Project layout

```
src/
├── app/                      # Routes (App Router)
├── components/
│   ├── shell/                # AppShell, Sidebar, Topbar, Aurora, MouseGlow
│   ├── ui/                   # Card, Button, Badge, Tabs, AiCallout, Thumb,
│   │                         # PageHeader, EmptyState, StatusDot, IconButton,
│   │                         # Toaster, DateRangeControl
│   ├── charts/               # AreaChart, MiniSpark, BarRow
│   ├── dashboard/            # KpiCard
│   └── plan/                 # PlanContentDrawer + StorySequenceFlow
└── lib/
    ├── cn.ts
    ├── store.tsx             # Single React context (theme, connected, extraPosts, toast)
    └── mock/                 # Demo data
```

The full implementation reference, design rules, and gotchas live in [`../CLAUDE.md`](../CLAUDE.md) §10.
