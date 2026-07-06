# Phase 7 — integration notes (built in parallel with Phases 1–6)

This file records every cross-phase dependency, assumption, and TODO that
Phase 7 (the `/workspace/*` client-facing portal) leaned on while
Phases 1, 2, 3, 4, 5, 6 were still being built by other agents in
parallel. Resolve all of these before declaring Phase 7 done.

## What Phase 7 built

```
src/app/workspace/
  layout.tsx                            resolve client_membership, mount shell
  page.tsx                              → /workspace/overview
  pick/page.tsx                         picker for users with >1 client
  overview/page.tsx
  brand-build/page.tsx                  read-or-edit (canEditBrand)
  strategy/page.tsx                     read-or-edit (canEditBrand)
  pipeline/page.tsx + client.tsx        reuses Phase-4 KanbanBoard
  calendar/page.tsx + client.tsx        reuses Phase-4 MonthCalendar
  metrics/page.tsx + client.tsx         reuses Phase-4 MetricsDashboard
  assets/page.tsx                       slim read-only list (Phase 5 owns full)
  meetings/page.tsx                     read-only list

src/app/api/workspace/pick/route.ts     sets WORKSPACE_COOKIE, 303-redirects

src/components/agency/workspace/
  WorkspaceContext.tsx                  React Context for slug/role/client
  WorkspaceHeader.tsx                   client title + Switch-client link
  WorkspaceSubNav.tsx                   8 tabs, active-underline
  WorkspaceBrandFields.tsx              read/edit field grid (auto-save on blur)

src/lib/auth/require-workspace-access.ts  resolves single client_membership
src/lib/agency/viewer.ts                  viewer-role capability helpers
src/lib/agency/_phase2_deps.ts            STUB for Client/ClientStatus/ClientAccessRole
```

No new SQL migrations, no new npm dependencies. RLS on
`clients`/`client_memberships`/`brand_profiles`/`content_items`/etc.
already handles isolation — the workspace layout is a thin UI shell on
top of Phase 2 + 3 data.

## Critical: parallel-session stash interference

During Phase 7 development the working tree was repeatedly mass-stashed
by another agent's reset cycle. My files were recovered from
`stash@{0}^3` and `stash@{1}^3`. The stash list at write time:

```
stash@{0}: workspace portal + Phase 3 stubs
stash@{1}: my early Phase 7 files (Context, viewer, require-workspace-access)
stash@{2}: Phase 2's types.ts + permissions.ts
stash@{3}: Phase 4 calendar/metrics components (older copies)
```

If the working tree ever loses any of the Phase-7 files again, recover
them the same way:

```bash
git checkout 'stash@{N}^3' -- <path>
```

**Do not drop these stashes** — they contain other agents' work.

## Dependencies on Phase 1 (foundation)

**Used:**
- `getSupabaseServer()` + `currentUserId()` from `src/lib/supabase/server.ts`
  (already shipped pre-pivot — no Phase-1 dep here).

**Not used:**
- `getSession()` / `requireOrg()` / `requireOrgRole()` from
  `src/lib/auth/session.ts`. The workspace layout deliberately bypasses
  the agency-org context: workspace users are not org members. They
  authenticate as plain Supabase users and Phase 7 resolves their
  *client* via `client_memberships`, not their *org* via
  `organization_memberships`.

If Phase 1's session helper later starts returning richer data on
plain users (e.g. embedded `client_memberships`), `require-workspace-
access.ts` can be simplified to read from it directly. Until then the
direct Supabase query is correct.

## Dependencies on Phase 2 (clients CRUD + types)

**Used:**
- The shape of `Client`, `ClientStatus`, `ClientAccessRole` from
  `src/lib/agency/types.ts`.

**Status:** Phase 2's `types.ts` was repeatedly stashed during the
parallel build, so Phase 7 ships a one-file shim — `src/lib/agency/
_phase2_deps.ts` — that mirrors the same shape verbatim from
`0034_agency_clients.sql`. Every Phase-7 import that originally read
from `@/lib/agency/types` now reads from `@/lib/agency/_phase2_deps`.

**Cutover when Phase 2 lands:** swap the body of `_phase2_deps.ts` for
a re-export from `./types`, OR rename every import back to
`@/lib/agency/types` and delete `_phase2_deps.ts`. Either is a one-pass
sed:

```bash
grep -rl "@/lib/agency/_phase2_deps" src/ | xargs sed -i ''   \
  -e 's|@/lib/agency/_phase2_deps|@/lib/agency/types|g'
rm src/lib/agency/_phase2_deps.ts
```

## Dependencies on Phase 3 (long-form data + schema 0035)

**Used (assumed schema, from `0035_client_workspace.sql`):**
- `brand_profiles` row shape on `client_id` PK with these columns:
  `bio, mission, vision, values_text, voice, visual_style,
  audience_persona, audience_pain_points, unique_value_prop,
  positioning_statement, content_pillars text[], flagship_offer,
  signature_format, do_not_post, next_steps_goal, next_steps_focus,
  next_steps_metrics, next_steps_blockers`.
- `meeting_notes(id, title, meeting_date, body, attendees,
  action_items, visibility)`. Phase 7 filters by `client_id` (RLS
  filters by `visibility='client_visible'` for non-staff).
- `asset_links(id, title, url, category, created_at)` and
  `asset_videos(id, title, bunny_video_id, bunny_video_status,
  review_status, bunny_video_duration_seconds, created_at)` — same
  RLS-driven visibility filter.

If any column lands renamed in Phase 3's final migration, search Phase 7
files for the column name and update.

**Supabase generated types** (`src/lib/supabase/database.types.ts`) do
**not** yet include `brand_profiles` / `meeting_notes` / `asset_links`
/ `asset_videos` because `npm run db:types` hasn't been rerun against
the post-0035 schema. Workaround: every Phase-7 server-component query
that touches these tables casts via `unknown` or `from("table" as
never)`. Once Phase 3 applies and `db:types` regenerates, drop the
casts. Files to revisit:
- `src/app/workspace/overview/page.tsx`
- `src/app/workspace/brand-build/page.tsx`
- `src/app/workspace/strategy/page.tsx`
- `src/app/workspace/assets/page.tsx`
- `src/app/workspace/meetings/page.tsx`

## Dependencies on Phase 4 (pipeline + calendar + metrics)

**Used:**
- `src/components/agency/pipeline/KanbanBoard.tsx`
- `src/components/agency/pipeline/ContentCardDialog.tsx`
- `src/components/agency/pipeline/usePipelineState.ts`
- `src/components/agency/calendar/MonthCalendar.tsx`
- `src/components/agency/metrics/MetricsDashboard.tsx`
- `src/lib/agency/content.ts` (CONTENT_STATUSES + types)

Phase 7 reuses these unchanged. Drag-to-move is gated client-side on
`canMovePipelineCards(viewerRole)` and create-card is gated on
`canCreatePipelineCards(viewerRole)`.

**TODO Phase 4 (handler side) — must be relaxed before Phase 7 works
end-to-end:**

1. `GET /api/clients/[slug]/content` — currently checks
   `is_org_staff(organization_id)`. For workspace users it must also
   allow when `has_client_access(client_id)` is true. The RLS policy
   on `content_items` already allows the read; the handler just
   shouldn't add a redundant staff-only gate.

2. `POST /api/clients/[slug]/content` (create) — gate on
   `is_org_staff OR (has_client_access AND access_role='team_assigned')`,
   not staff-only.

3. `POST /api/clients/[slug]/content/[id]/move` — same as create. Also
   add the "team_assigned can only move cards where `assigned_to =
   current user`" check (Phase 4 NOTES already flags this as deferred
   to Phase 7 — confirm here, do not implement until the
   `content_items.assigned_to` column is committed in 0035).

4. `PATCH /api/clients/[slug]/content/[id]` — same gating.

5. `PATCH /api/clients/[slug]/content/[id]/metrics` — staff-only is
   correct here. Workspace users do not edit metrics.

## Dependencies on Phase 5 (assets + meetings + comments + video)

**Skipped, with TODO markers:**

1. **Workspace Assets page** is a slim read-only list. Phase 5's
   richer "folder tree + TUS upload + review states" UI lives at
   `/clients/[slug]/assets`. When Phase 5 ships a portal-grade asset
   browser (e.g. `<WorkspaceAssetBrowser viewerRole=...>`), swap the
   list in `src/app/workspace/assets/page.tsx` for it. Until then the
   slim shelf renders whatever is already `visibility='client_visible'`.

2. **Video playback in Workspace Assets** — `<VideoPlayer>` is not yet
   wired here. Once Phase 5 lands the Bunny.net signed-URL fetcher,
   render the player inline on the asset row when
   `bunny_video_status='ready'`.

3. **Video comments + timestamp threads** — not surfaced in Phase 7.
   When Phase 5 ships `<VideoCommentThread>`, drop it into the
   workspace asset detail surface (need a new
   `/workspace/assets/[id]/page.tsx`).

4. **Workspace Meetings page** is read-only. CRUD lives on the agency
   side at `/clients/[slug]/meetings`. No need to mirror it here —
   workspace users are not meeting-note authors.

## Dependencies on Phase 6 (Stripe + plan gates)

Not used. Plan-limit gating affects writes (add client, AI analyzer,
video upload) — none of which a workspace user performs. The
`/workspace/*` portal is unaffected by plan downgrades except that the
data the agency exposes may shrink. RLS handles that automatically.

## Things deliberately deferred / skipped

1. **`viewerRole` prop wiring on Phase-4 components.** Phase 7's
   `client_owner` / `team_assigned` distinction is enforced via:
   - server-side: RLS + Phase-4 route handlers (see TODO Phase 4 above)
   - client-side: `usePipelineState` is the same hook in both surfaces.
     If the agency-side dialog adds an "internal notes" tab in
     Phase 5+, Phase 7 needs to hide that tab for `client_owner` /
     `team_assigned`. Currently the dialog has Overview/Script/Media —
     none of which leak internal data.

2. **Multi-client picker UX** — Phase 7 ships
   `/workspace/pick` + a cookie-based selection. The cookie name is
   `creatorhub-workspace-slug`; the route handler that sets it is
   `POST /api/workspace/pick`. If a workspace user is later granted
   access to many clients (Phase 9+ "team-mode"), the picker may need
   search/filter — deferred.

3. **"Acting as" banner.** Existing `<ActingAsBanner>` in
   `src/components/shell/` is about agency admins shadowing client
   users. Workspace users see the WorkspaceHeader instead. No banner
   needed.

4. **Mobile sub-nav.** `WorkspaceSubNav` is `flex overflow-x-auto`,
   which already scrolls horizontally on narrow viewports. No
   dedicated mobile drawer needed.

5. **Notifications / comment alerts.** Phase 8 wires Resend templates
   for new comments. Phase 7 does not subscribe to or surface them in
   the portal yet.

6. **Settings tab for workspace users.** Per plan §6, settings are
   handled by the agency. Workspace users may want to edit their
   display name / avatar — that lives on global `/settings` (existing
   route), reached via `<AuthMenu>` once the topbar is shown on
   workspace pages. Phase 7 currently hides the global Topbar; if you
   want it back, wrap the workspace layout in the existing AppShell
   instead of using a custom shell.

7. **RLS regression tests for the portal.** Phase 8 owns the test
   pass. Phase 7 leaves stubs in `tests/rls-agency-escalation.spec.ts`
   for: `team_assigned` can't read `client_internal_notes`;
   `client_owner` can't read another client in same org; workspace
   user without `client_memberships` cannot read `clients` at all.

## What Phase 7 did NOT touch (to avoid conflicts)

- `supabase/migrations/` — no new SQL file. Phase 3 owns `0035_…sql`.
- `src/app/clients/` — Phase 2/3/4/5 own that tree.
- `src/app/api/clients/` — Phase 2–5 own that tree.
- `src/lib/auth/session.ts` / `require-org.ts` / `require-org-role.ts`
  — Phase 1 owns.
- `src/lib/billing/` — Phase 6 owns.
- `src/lib/agency/types.ts` — Phase 2 owns. Phase 7 uses
  `_phase2_deps.ts` as a shim instead.
- `src/components/agency/pipeline/` etc. — Phase 4 owns.
- `src/components/shell/Sidebar.tsx`, `Topbar.tsx`, `AppShell.tsx` —
  workspace layout intentionally bypasses the agency shell.
- `package.json` — no new deps. Reuses `@dnd-kit/*` etc. already added
  by Phase 4.

## Acceptance check (manual, post-merge)

1. As a logged-in user that holds exactly one `client_memberships` row,
   navigate to `/workspace`. You should be redirected to
   `/workspace/overview`, see the client's display name in the header,
   and see 4 quick-link cards.
2. Click through all 8 tabs — every page loads, none 404.
3. As `client_owner`, edit a field in `/workspace/brand-build` →
   refresh → value persists. As `team_assigned`, the same field is a
   read-only card with no input.
4. As `client_owner`, the "+ Add idea" button on
   `/workspace/pipeline` is hidden; drag-to-move is disabled. As
   `team_assigned`, the button shows and drag works (until you hit a
   non-assigned card, which the server rejects).
5. As a user with two `client_memberships` rows, navigate to
   `/workspace/overview` → redirects to `/workspace/pick` → choosing a
   client sets `creatorhub-workspace-slug` cookie → subsequent
   `/workspace/*` visits resolve to that client. Click "Switch client"
   in the header to return to the picker.
6. RLS check: as a user with zero `client_memberships`, navigating to
   `/workspace/*` returns 404, not a stale render.
