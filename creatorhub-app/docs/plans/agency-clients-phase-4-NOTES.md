# Phase 4 — Pipeline + Calendar + Metrics tabs

Built in parallel with Phases 1–3. This file records every cross-phase
dependency, assumption, and TODO needed to land Phase 4 cleanly.

## Multi-agent context

The repo is being built by multiple agents in parallel. During this session the
working tree was repeatedly stashed by other agents — earlier Phase 4 work was
captured in `stash@{2}: agency phase 4/5 starter (recover later)` (16 files,
~2,736 insertions). **Do NOT pop that stash blindly** — it contains an
older snapshot of Phase 3 files alongside my Phase 4 files, and may conflict
with newer Phase 3 work.

Recovery plan for the user:
1. Diff stash@{2} against the live tree to extract just the Phase 4 files.
2. Reapply only:
   - `creatorhub-app/src/app/clients/[slug]/pipeline/page.tsx`
   - `creatorhub-app/src/app/clients/[slug]/calendar/page.tsx`
   - `creatorhub-app/src/app/clients/[slug]/metrics/page.tsx`
   - `creatorhub-app/src/components/agency/pipeline/*`
   - `creatorhub-app/src/components/agency/calendar/MonthCalendar.tsx`
   - `creatorhub-app/src/components/agency/metrics/MetricsDashboard.tsx`
3. Drop everything else (other agents have moved past those versions).

## What Phase 4 builds

```
src/lib/agency/content.ts                                           types + constants

src/app/api/clients/[slug]/content/route.ts                         GET, POST
src/app/api/clients/[slug]/content/[id]/route.ts                    PATCH, DELETE
src/app/api/clients/[slug]/content/[id]/move/route.ts               POST (status + position)
src/app/api/clients/[slug]/content/[id]/metrics/route.ts            PATCH

src/app/clients/[slug]/pipeline/page.tsx
src/app/clients/[slug]/calendar/page.tsx
src/app/clients/[slug]/metrics/page.tsx

src/components/agency/pipeline/usePipelineState.ts
src/components/agency/pipeline/ContentCard.tsx
src/components/agency/pipeline/KanbanBoard.tsx
src/components/agency/pipeline/ContentCardDialog.tsx
src/components/agency/calendar/MonthCalendar.tsx
src/components/agency/metrics/MetricsDashboard.tsx
```

Dependencies added to `package.json`: `@dnd-kit/core`, `@dnd-kit/sortable`,
`@dnd-kit/utilities`, `date-fns`. **`npm install` is required** before any
of this builds.

## Dependencies on other phases

### Phase 1 (foundation)
**Needs:** a session helper. Phase 1 builds `lib/auth/session.ts →
getSession()` returning `{ user, profile, organization, orgRole, plan }`.
Phase 4 route handlers do not call it directly — they rely on the
session-bound Supabase server client (`getSupabaseServer()` from
`src/lib/supabase/server.ts`, already shipped) and let RLS enforce org
isolation. The client lookup by `slug` falls back to RLS-filtered SELECT.

**TODO at merge time:** when the `phase3-stubs.ts` shim from the Phase 3
agent lands, refactor the route handlers to call `requireClientAccess(slug)`
from it (or its real successor `@/lib/auth/require-client-access`).

### Phase 2 (clients CRUD + layout)
**Needs:**
- `src/app/clients/[slug]/layout.tsx` wrapping `pipeline`/`calendar`/
  `metrics` pages with the AppShell + `ClientSubNav`. Without this layout
  the pages render but lack the tab chrome.
- `ClientSubNav.liveTabs` array must include `"pipeline"`, `"calendar"`,
  `"metrics"` so the tab links are not greyed out.

**Fallback used:** each Phase 4 page includes its own `PageHeader`, so it
is at least usable standalone before the Phase 2 layout lands.

### Phase 3 (schema 0035 + long-form data)
**Needs:** the tables created by `0035_client_workspace.sql`. Phase 4
assumes:
- `content_items` with columns: `id, organization_id, client_id, status
  (content_status_t: idea|script|film|edit|post), content_type
  (content_type_t, NOT NULL, default 'reel'), title (NOT NULL, default ''),
  hook_a, hook_b, hook_c, script, caption, visual_notes, bunny_video_id,
  bunny_video_status (bunny_video_status_t), bunny_video_duration_seconds,
  planned_post_date (date), published_at (timestamptz), position
  (double precision), visibility (visibility_t), created_by, created_at,
  updated_at`.
- `content_metrics` with columns: `content_item_id (PK + FK 1:1),
  organization_id, client_id, views, likes, comments_count, shares,
  saves, reach, impressions, source (metric_source_t), captured_at,
  updated_at`.

**Gotchas observed in the real 0035 (different from §3.4 of the plan):**
- `content_type` is NOT NULL (default `'reel'`). The route handlers and
  dialog enforce this.
- `planned_post_date` is `date`, not timestamptz. Wire format: `YYYY-MM-DD`.
- Comments column is `comments_count`, not `comments` (Postgres reserved
  word avoidance).

## Deliberately deferred

1. **Role-based move authorization** — route handler allows any org member
   to move a card. The matrix in §7 ("team_assigned can only move assigned
   cards") layers on top in Phase 7 (`/workspace/*`).
2. **Auto-save conflict resolution** — last-write-wins. No locking.
3. **Calendar drag-to-reschedule** — read-only per plan.
4. **Instagram-API metric sync** — `source = 'manual'` only.
5. **Plan limits (`assertPlanAllows`)** — Phase 6 owns. Phase 4 leaves
   `// TODO Phase 6` markers in route POSTs.
6. **Optimistic-revert toast** — Phase 8 polish. Phase 4 reverts silently
   on PATCH failure.
7. **Video player in dialog Media tab** — placeholder only. Phase 5 wires
   `<VideoPlayer>` to Bunny.net signed URLs once Phase 5 retires
   `lib/stream.ts`.

## What Phase 4 did NOT touch (to avoid stomping other agents)

- `supabase/migrations/` — Phase 3 owns 0035.
- `src/app/clients/page.tsx` — Phase 2 owns the all-clients grid.
- `src/app/clients/[slug]/layout.tsx` — Phase 2 owns.
- `src/app/clients/[slug]/overview/`, `settings/`, `brand-build/`,
  `strategy/`, `assets/`, `meetings/`, `internal/` — Phase 2 / 3.
- `src/app/api/clients/route.ts`, `[slug]/route.ts`, `[slug]/members/*`,
  `[slug]/brand-profile/*`, `[slug]/internal-notes/*` — Phase 2 / 3.
- `src/lib/auth/*` — Phase 1 / 2.
- `src/lib/billing/*` — Phase 2 / 6.
- `src/components/shell/Sidebar.tsx`.
- `src/db/schema.ts` — needs `content_items` / `content_metrics` mirror
  lines added by Phase 3.

## Acceptance check (manual, post-merge)

1. `npm install` to pull the new deps.
2. As an org member, navigate `/clients/[slug]/pipeline` — kanban renders.
3. Drag a card across all 5 columns (`Idea → Script → Film → Edit → Post`),
   refresh — order persists.
4. Click `+` on any column → new card appears at end.
5. Click "Open" on a card → ContentCardDialog opens with 3 tabs.
6. Edit hook A in Overview tab, blur — verify PATCH fires and persists
   across reload.
7. Set a planned post date, blur — go to `/clients/[slug]/calendar`,
   verify card lands on the right day.
8. Edit views in dialog Metrics block → totals update on
   `/clients/[slug]/metrics`.
