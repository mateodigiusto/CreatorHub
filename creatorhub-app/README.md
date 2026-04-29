# CreatorHub — Demo

CreatorHub is a premium creator operating system for creators, info-product businesses, agencies, and social media teams. It helps users **plan, create, analyze, and grow** their content from one clean command center.

**Core loop:** Plan → Create → Analyze → Grow

This repo contains the first demo — a frontend-only experience that communicates the product vision, structure, workflow, and premium UI direction. There is no backend, no real authentication, no real Meta/Instagram integration, and no real AI. All data is realistic mock data shaped like the eventual real payloads.

## What's inside

- **Six main screens** — Dashboard, Analytics, Ideas, Content, Calendar, Reports
- **Secondary screens** — Settings (with theme picker), Integrations, Help
- **Light + Dark themes** — toggle in the topbar, persisted to localStorage
- **AI Story Sequences** — a 3-step demo flow that turns sample assets + a goal into a 5-slide story sequence; entry points on Calendar (Plan slot), Ideas (featured tile), and Content (header chip)
- **Aurora background + cursor glow** — subtle motion behind the UI
- **`Instagram connected` toggle** — flip every screen between empty and connected states from the topbar pill

## Run locally

```bash
npm install
npm run dev
```

Opens on `http://localhost:3000` (or 3003+ if 3000 is busy).

## Build

```bash
npm run build
```

## Deploy on Vercel

Vercel auto-detects Next.js. **Important — set the project's Root Directory to `creatorhub-app`** since the Next.js app lives in a subfolder of the repo.

No environment variables required. No build command override. The app is fully static at the route level.

## Tech

- Next.js 16 (App Router, Turbopack)
- React 19
- Tailwind CSS v4 (CSS-based theme tokens)
- TypeScript 5
- Recharts for charts
- lucide-react for icons
- Inter via `next/font/google`

## Project structure

See the parent `CLAUDE.md` for the full implementation reference, theme system documentation, and design rules.
