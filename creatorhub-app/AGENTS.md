<!-- BEGIN:nextjs-agent-rules -->
# Next.js 16 — read this before editing

This project runs on **Next.js 16** with the App Router and Turbopack. APIs, conventions, and file structure differ from older training data. When in doubt, consult the relevant guide in `node_modules/next/dist/docs/` before writing code. Heed deprecation notices.

We do **not** use:
- `unstable_instant` (skip the related lints/warnings)
- `cacheComponents`
- Server Actions
- `next/script` for the theme bootstrap (we use a plain inline `<script>` in `layout.tsx`)

## Project shape (what's in this folder)

- **App Router** — every screen is a `page.tsx` under `src/app/<route>/`. All client components (each one starts with `"use client"` because of state hooks).
- **Tailwind CSS v4** — tokens live in `src/app/globals.css` via `@theme` and `@theme inline` blocks. There is **no `tailwind.config.ts`**.
- **No chart library** — `AreaChart`, `MiniSpark`, `BarRow` are hand-rolled SVG in `src/components/charts/`. Recharts was removed.
- **No `Drawer`, `ThemeToggle`** components — they were deleted as unused. Don't recreate them.
- **`AppStateProvider`** in `src/lib/store.tsx` is the only React context (theme, connected, extraPosts, toast).
- **Mock data only** — no `process.env`, no `.env*`, no API calls. Demo data lives in `src/lib/mock/{data,story,types}.ts`.

## Conventions

- Light mode is default. Theme switches via `data-theme` on `<html>` + `localStorage('creatorhub-theme')`. Pre-paint `<script>` in `layout.tsx` prevents flicker.
- Hover lift: use the `.lift` utility class. Don't write per-element transforms.
- Primary buttons: `Button` component (default variant) — uses `.btn-primary` navy gradient. Don't restyle.
- Charts: `AreaChart` is the default. `getReachSeries(from, to)` and `getFollowerSeries(from, to)` produce range-aware data.
- Path alias: `@/*` → `src/*`.

## Before committing

```bash
npm run build    # TS + Turbopack — must pass
npm run lint     # ESLint — must be clean
```

The fuller architecture, gotchas, and design rules live in `../CLAUDE.md` §10.
<!-- END:nextjs-agent-rules -->
