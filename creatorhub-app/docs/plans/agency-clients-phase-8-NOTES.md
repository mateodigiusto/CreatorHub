# Phase 8 — Polish (build notes)

Built in parallel with Phase 1 (and after Phases 2/3/4 had committed
scaffolding). Phase 1 was actively under construction by another agent at
the time of this build, so every Phase 8 deliverable that *could* have
collided with Phase 1 / 2 file ownership was written as a **new file** and
flagged here for wire-up at merge time.

This doc is the cutover map. After Phases 1–7 merge, walk this file
top-to-bottom and apply each integration step.

---

## ⚠ Note on file ownership during the parallel build

While Phase 8 was being authored, another agent ran
`git stash push --include-untracked` on the working tree at least twice
(stash messages: "agency phase 4/5 starter (recover later)" and
"phase 2-6 work-in-progress from parallel session"). The first stash
captured most of Phase 8's deliverables alongside Phases 2–7 untracked
work. All Phase 8 files were re-materialized on disk after the stash so
they exist *both* in the stash entries and in the working tree.

When recovering the stashes:
- Identical Phase 8 files in the stash will merge cleanly.
- If `git stash pop` reports conflicts on these paths, prefer the working-tree
  copy — it's authoritative and was rewritten *after* the stash snapshot.

---

## What Phase 8 delivers (new files only, no existing-file edits)

| File | What it does |
|---|---|
| `src/lib/email/agency-templates.ts` | `orgInviteEmail`, `clientWorkspaceInviteEmail`, `contentCommentEmail` — three new HTML+text email builders, navy/blue brand, inline styles for Gmail/Outlook. |
| `src/lib/email/agency-notify.ts` | Thin wrappers (`sendOrgInviteNotification`, `sendClientWorkspaceInviteNotification`, `sendContentCommentNotification`) using `sendEmail` from `src/lib/email/send.ts`. |
| `src/lib/agency/plan-limit-breadcrumb.ts` | `recordPlanLimitBreadcrumb({ capability, plan, organizationId? })` — drops a Sentry breadcrumb (NOT a message event) tagged `code: 'plan_limit'`. Lazy `require('@sentry/nextjs')`, no-ops if Sentry not bound. |
| `src/lib/agency/use-optimistic-toast.ts` | `useOptimisticRevertToast()` + `useOptimisticErrorReporter()` — wraps `showToast` from `lib/store.tsx` so optimistic-revert flows have a standard one-liner. |
| `src/components/agency/TabEmptyState.tsx` | Smaller per-tab empty state, navy/blue dotted pattern, optional primary/secondary CTAs with `href` or `onClick`. |
| `src/components/agency/Skeleton.tsx` | `Skeleton`, `SkeletonLine`, `SkeletonCard`, plus per-tab shells: `PipelineSkeleton`, `CalendarSkeleton`, `MetricsSkeleton`, `AssetsSkeleton`, `FormSkeleton`, `ListSkeleton`. Tailwind `animate-pulse`, no new keyframes. |
| `tests/rls-agency.spec.ts` | RLS regression for orgs / clients / agency tables. Probes the DB at `beforeAll` and **skips gracefully** if migrations 0033/0034/0035 aren't applied yet. |

---

## Files Phase 8 deliberately **did not** touch (avoids stomping Phase 1 / 2)

- `src/lib/email/templates.ts` — legacy relationship templates. Phase 5's cleanup pass deletes this after the legacy `/clients/[id]` UI is gone.
- `src/lib/billing/limits.ts` — Phase 2 owns. Wire `recordPlanLimitBreadcrumb()` in here at merge (see Integration §1 below).
- `src/components/clients/ClientSubNav.tsx` — Phase 2 owns. Mobile horizontal-scroll polish lives there (see Integration §3 below).
- `src/components/agency/pipeline/usePipelineState.ts` — Phase 4 owns. Wire `useOptimisticErrorReporter()` in here (see Integration §4 below).
- `tests/rls.spec.ts`, `tests/migration-roundtrip.spec.ts` — Phase 1 will bump `EXPECTED_SCHEMA_VERSION` and add coverage. Phase 8's agency RLS tests live in a separate spec file to avoid the merge race.
- `.env.example` — Phase 1 owns `EXPECTED_SCHEMA_VERSION`. Bump to `36` (or `37` after Phase 6's finalize migration) as part of Phase 1's last commit.
- `src/lib/log/index.ts` and `instrumentation.ts` — Phase 1 already wires `bindSentry`; the breadcrumb helper hits Sentry directly via lazy `require`, so no changes here.

---

## Integration steps at merge time

### 1. Wire Sentry breadcrumbs into `assertPlanAllows`

In `src/lib/billing/limits.ts`, add one import and one call before each
`throw new PlanLimitError(...)`:

```ts
import { recordPlanLimitBreadcrumb } from "@/lib/agency/plan-limit-breadcrumb";
// …
recordPlanLimitBreadcrumb({
  capability: capability.kind,
  plan,
  organizationId: capability.kind === "add_client" ? capability.organizationId : undefined,
});
throw new PlanLimitError(...)
```

Alternatively, inline it in the `PlanLimitError` constructor — one place,
one call. Phase 2's preference wins.

### 2. Wire the three new email notifiers into Phase 1 / 2 / 5 route handlers

| Where to call | Function |
|---|---|
| `POST /api/organizations/[id]/members` (org invite) — Phase 1 owns this route | `sendOrgInviteNotification` |
| `POST /api/clients/[slug]/members` (client invite) — Phase 2 owns this route | `sendClientWorkspaceInviteNotification` |
| `POST /api/clients/[slug]/content/[id]/comments` — Phase 5 owns this route | `sendContentCommentNotification` (fanned out per recipient) |

Each notifier returns a `SendResult`. On `{ sent: false, reason: 'unconfigured' }`
in dev (no RESEND_API_KEY) treat as a no-op — the request still succeeds.
Log via `log.warn` on any other reason.

The content-comment notifier accepts `permalinkPath` — pass the agency
admin path (`/clients/<slug>/pipeline?card=<id>`) for staff recipients and
the workspace path (`/workspace/pipeline?card=<id>`) for client recipients.
Skip sending to client users when `isInternal: true`.

### 3. Mobile `ClientSubNav` horizontal scroll — **DEFERRED**

Phase 8 plan calls for "Mobile `SubNav` horizontal scroll." Phase 2 owns
`src/components/clients/ClientSubNav.tsx`. At merge, change the tab
container from a wrapping flex to a horizontally scrolling overflow-x:

```tsx
<nav
  aria-label="Client sections"
  className="flex gap-1 overflow-x-auto no-scrollbar -mx-4 px-4 lg:mx-0 lg:px-0 lg:overflow-visible"
>
  {tabs.map(...)}
</nav>
```

Add to `src/app/globals.css` (one block):

```css
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { scrollbar-width: none; }
```

That's the entire polish — no JS, no new component. Left undone here to
avoid the Phase 2 file collision.

### 4. Wire `useOptimisticErrorReporter` into `usePipelineState`

In `src/components/agency/pipeline/usePipelineState.ts`, replace the
`catch { setItems(prev); }` blocks with:

```ts
const reportError = useOptimisticErrorReporter();
// …
try {
  const res = await fetch(...);
  if (!res.ok) {
    setItems(prev);
    await reportError(res);
    return;
  }
} catch (e) {
  setItems(prev);
  await reportError(e);
}
```

Same wire for `ContentCardDialog`'s auto-save-on-blur PATCHes.

### 5. Empty states — adopt `TabEmptyState` in every tab

The component is drop-in. Recommended copy per tab:

| Tab | Title | Description | Primary CTA |
|---|---|---|---|
| Overview | "Set up this client's brand" | "Fill in the brand build to surface a snapshot here." | "Open brand build" → `/clients/<slug>/brand-build` |
| Brand Build | "Tell us about this creator" | "Paste a transcript or fill the 14 fields below." | none (form is below) |
| Strategy | "Define the next 4 steps" | "Short-form direction for the next 30 days." | none (form is below) |
| Pipeline | "No content yet" | "Add your first idea to start moving it through the funnel." | "New content item" |
| Calendar | "Nothing scheduled" | "Set a planned post date on a pipeline item to see it here." | "Open pipeline" → `…/pipeline` |
| Metrics | "No metrics yet" | "Add metrics to a published piece to start tracking." | "Open pipeline" |
| Assets | "No assets yet" | "Upload videos, drop links, or attach reference photos." | "Add asset" |
| Meetings | "No meeting notes yet" | "Capture an internal recap or a client touchpoint." | "New meeting note" |
| Internal (staff) | "No internal notes yet" | "Anything client-side users shouldn't see." | "Add note" |
| Settings | n/a — form is always editable | — | — |

### 6. Loading skeletons — pair with empty states

Suspense-boundaries or first-paint placeholders for each tab. Suggested
mapping:

| Tab | Skeleton |
|---|---|
| Pipeline | `<PipelineSkeleton />` |
| Calendar | `<CalendarSkeleton />` |
| Metrics | `<MetricsSkeleton />` |
| Assets | `<AssetsSkeleton />` |
| Brand Build / Strategy / Internal / Settings | `<FormSkeleton fields={N} />` |
| Meetings | `<ListSkeleton rows={5} />` |
| Overview | mix of `SkeletonCard` blocks (3 columns) |

Rule (from the file header): render the skeleton ONLY on initial fetch.
After first success, refetches should not flicker — keep the loaded data,
fade in updates.

### 7. Bump `EXPECTED_SCHEMA_VERSION` and re-run the migration round-trip

Phase 1's owning agent does this in their final commit:

```bash
# After 0036 lands:
echo 36 > /tmp/expected
# After 0037 (Stripe finalize) lands:
echo 37 > /tmp/expected
```

Update `.env.example` and `tests/migration-roundtrip.spec.ts` accordingly.
Phase 8 left them untouched.

### 8. Sentry breadcrumbs — operational tip

Once wired, search Sentry's UI for events with the breadcrumb tag
`code: plan_limit`. Each breadcrumb sits on the event timeline preceding
the next captured error — so a "user hit 7 plan-limit rejections in a row
then crashed somewhere else" pattern is one query away. Use that to spot
upgrade-funnel friction (lots of rejections, no Stripe checkout event).

---

## Acceptance — Phase 8 done-when

- [ ] `npm run lint` + `npm run build` clean.
- [ ] `npm run test:rls` clean (`tests/rls.spec.ts` + the new `tests/rls-agency.spec.ts`).
- [ ] `npm run test:migration` clean after `EXPECTED_SCHEMA_VERSION` bump.
- [ ] Every tab in `/clients/[slug]/*` and `/workspace/*` renders a Phase-8 empty state when the source table is empty.
- [ ] Every tab renders a Phase-8 skeleton on initial load.
- [ ] Dragging a pipeline card and getting a 4xx response produces a "Couldn't save your change…" toast (or a tailored `plan_limit` toast on 402).
- [ ] An org invite, client invite, and content comment each send an email when `RESEND_API_KEY` + `EMAIL_FROM` are set; gracefully no-op otherwise.
- [ ] Sentry shows a `plan_limit` breadcrumb on the next captured event after any plan rejection.
- [ ] Mobile `ClientSubNav` scrolls horizontally below `lg`.

---

## Risks called out

| Risk | Mitigation |
|---|---|
| Phase 1 agent already wrote `orgInviteEmail` somewhere | The Phase 8 templates use distinct names (`orgInviteEmail`, `clientWorkspaceInviteEmail`, `contentCommentEmail`). At merge: dedupe — keep one canonical set, prefer the version with the most complete plain-text fallback. |
| Phase 1 agent wires `recordPlanLimitBreadcrumb` differently | Helper is read-only side effect (`Sentry.addBreadcrumb` + `log.debug`). Calling it twice is harmless. |
| `@sentry/nextjs` `require` fails on the Edge runtime | The helper try/catches the `require`; falls back to `log.debug`. Edge handlers still get the local echo. |
| `useOptimisticErrorReporter` reads `Response` body twice if caller already did | Only call it with the raw `Response` (don't `.json()` first). The hook does the parse. |
| Test fixtures conflict with another agent's RLS suite | Agency RLS lives in `tests/rls-agency.spec.ts` (separate file). Skips itself if migrations not yet applied. |
| `EXPECTED_SCHEMA_VERSION` bumped twice (Phase 1 and Phase 8) | Phase 8 leaves `.env.example` and the migration round-trip untouched. Phase 1's owning agent owns the final bump. |
| The working tree got `git stash`-ed mid-build by a parallel agent | Phase 8 files were rewritten on disk after the stash. If the stash is later popped, identical content auto-merges; on a true conflict prefer the working-tree copy. |
