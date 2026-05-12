# Phase 9 — Multi-org-per-user

Built in parallel with Phases 1 + 2. The plan (`agency-clients-module.md` §9)
listed this as deferred: *"Multi-org-per-user — Phase 9+. The schema supports
it; the UI assumes the first org."* This phase delivers the cookie-based
active-org resolution, the switcher UI, and the create-additional-org flow
so a single user can belong to multiple agencies and toggle between them.

## Multi-agent context

Phases 1 and 2 are landing concurrently with this work. To avoid stepping on
either agent, Phase 9 is built entirely in **new** files. The only legacy
touch points are documented in §"Cutover checklist" below — they all happen
*after* Phase 1's `lib/auth/session.ts` lands, not during this session.

## What Phase 9 builds

```
src/lib/orgs/types.ts                                   OrgSummary type
src/lib/orgs/active-org.ts                              cookie helpers + resolve()
src/lib/orgs/queries.ts                                 listOrganizationsForUser

src/app/api/organizations/mine/route.ts                 GET  user's orgs
src/app/api/organizations/switch/route.ts               POST { organizationId } → cookie
src/app/api/organizations/create-additional/route.ts    POST { name, slug? } → new org

src/components/orgs/OrgSwitcher.tsx                     Sidebar/Topbar dropdown
src/components/orgs/CreateOrgDialog.tsx                 Inline dialog
```

No schema migration. Active-org state lives in the cookie
`creatorhub-active-org` (UUID of the active org). The schema from Phase 1
(`organization_memberships` with a (`organization_id`, `profile_id`) unique
key) is already many-to-many — Phase 9 just exercises that surface.

## How active-org resolution works

```
                                                  ┌────────────────────────┐
  request enters server →                         │ resolveActiveOrgId()    │
  ┌────────────────────────────────┐              ├────────────────────────┤
  │ getActiveOrgIdFromCookie()      │ ── exists? ─▶ verify membership for   │
  │ reads `creatorhub-active-org`   │              │ (orgId, userId) row    │
  └────────────────────────────────┘              │     │      │            │
                │                                  │   yes      no          │
                │ missing                          │     │      │            │
                ▼                                  │     ▼      ▼            │
  fall back to user's first membership            │ keep   discard cookie   │
  (same behavior as Phase 1 v1)                   │       fall back as left │
                                                  └────────────────────────┘
```

This means the **default behavior is unchanged** if no cookie is set —
Phase 1's `getSession()` keeps working with its "first membership" rule.
When `getSession()` is updated to call `resolveActiveOrganization(...)`
(see §"Cutover checklist"), users get true multi-org.

## Dependencies on other phases

### Phase 1 (foundation)
**Needs:**
- `organizations` + `organization_memberships` tables and their columns
  (`role`, `is_admin`, `plan`, `subscription_status`, `slug`, `name`).
  All present in migration 0033 already applied.
- A session resolver. Until Phase 1 ships `lib/auth/session.ts`, Phase 9
  routes call Supabase Auth directly (`supabase.auth.getUser()`) and look
  up memberships via RLS-filtered SELECT. This matches how `phase3-stubs`
  and `/api/workspace/pick` already operate.

**Cutover (after Phase 1 lands):**
1. Edit `src/lib/auth/session.ts` so `getSession()` calls
   `resolveActiveOrgId({ supabase, userId })` from `@/lib/orgs/active-org`
   instead of `SELECT … FROM organization_memberships ORDER BY created_at
   LIMIT 1`. The fallback inside `resolveActiveOrgId` is exactly that
   query, so existing single-org users are unaffected.
2. Edit `src/lib/agency/phase3-stubs.ts → getAgencySession()` likewise,
   for as long as that stub file exists.
3. Re-point Phase 9 API routes from `supabase.auth.getUser()` to
   `getSession()` once it exists. (Cosmetic — current code works.)

### Phase 2 (clients CRUD + Sidebar/Topbar)
**Needs:** a place to mount `<OrgSwitcher />` in the chrome.

**Cutover (after Phase 2 lands the new sidebar shell):**
1. Import `<OrgSwitcher />` in `src/components/shell/Sidebar.tsx` (or
   wherever Phase 2 places the org name header — likely top of sidebar).
   Pass no props. The component fetches `/api/organizations/mine` itself.
2. Confirm `Topbar.tsx` still works — switcher belongs in the sidebar
   header, not the topbar, so Topbar should not need a change.
3. Add the switcher's "Create new org" action to settings/team or a
   dedicated `/settings/organizations` page if Phase 2 created one.

### Phase 6 (Stripe org-level migration)
**No conflict.** `create-additional` route writes `plan = 'free'` and
`subscription_status = 'trialing'` with a 14-day trial end (matches
signup-creates-org logic in §6 Phase 1 of the plan). When Phase 6's
webhook handler lands, additional orgs go through the same plan upgrade
path as the founding org.

### Phase 8 (Polish, RLS regression tests)
**Adds:** these Phase 9 test cases to the existing RLS suite —
- User A with two memberships sees both orgs in `/api/organizations/mine`.
- User A switching to Org B updates the cookie and subsequent
  `clients_select` queries return Org B's clients only.
- User A *without* membership for Org Z cannot switch (`/switch` returns
  403 `not_a_member`).
- Creating an additional org via `/create-additional` auto-adds the
  caller as `is_admin = true` (last-admin trigger is satisfied).

## Files Phase 9 deliberately does NOT touch

To stay out of the parallel agents' way, the following files are left
exactly as-is, even where they would benefit from a Phase 9 import:

- `src/lib/auth/session.ts` — does not exist yet (Phase 1 territory).
- `src/lib/auth/require-*.ts` — does not exist yet (Phase 1 / 2).
- `src/lib/agency/phase3-stubs.ts` — Phase 3 owns this; deleted at
  cutover.
- `src/components/shell/Sidebar.tsx` — currently `M` in git status from
  the Phase 1 agent. Adding `<OrgSwitcher />` here is a cutover step,
  not a Phase 9 step.
- `src/components/shell/Topbar.tsx` — also `M` in git status. Same
  reasoning.
- `src/app/api/organizations/route.ts` — Phase 1 will create this file
  (POST → create org from /signup). Phase 9 deliberately uses
  `api/organizations/mine`, `…/switch`, `…/create-additional` as
  *sibling paths* so the two agents do not write to the same file.
- `supabase/migrations/` — Phase 9 needs no migration. The schema
  already supports the many-to-many shape.
- `src/db/schema.ts` — no schema change, no mirror edit.

## Acceptance check (manual, post-cutover)

1. Sign up as Agency A; sign up as Agency B *with the same email* (or
   accept an invite). The user should now have two membership rows.
2. Open `/api/organizations/mine` — returns both orgs in
   `created_at desc` order (most recent first).
3. Mount `<OrgSwitcher />` in the sidebar header. Verify dropdown lists
   both orgs with the user's `role` + `isAdmin` badge.
4. Click "Switch" on the inactive org → cookie `creatorhub-active-org`
   gets set, redirect refreshes the page; all `/clients/*` queries now
   return Org B's clients.
5. Click "Create new org" → `CreateOrgDialog` collects a name, POSTs to
   `/create-additional`, the new org appears in the dropdown, becomes
   active, and the user is `is_admin = true` in it.
6. Delete the active-org cookie manually → `resolveActiveOrgId()` falls
   back to the user's first membership and the app continues to work.

## Plan-limit considerations

`/api/organizations/create-additional` does **not** call
`assertPlanAllows`. The reason: plan limits in Phase 6 are
**per-organization** (max clients, max monthly views), not per-user.
There's no "max orgs per user" gate in the plan. If a future product
decision adds one, the call site is one line — wire it inside the
handler.

## Cutover checklist (run this after Phase 1 + 2 + 8 have all landed)

- [ ] Update `lib/auth/session.ts → getSession()` to call
      `resolveActiveOrgId({ supabase, userId })`.
- [ ] Update `lib/agency/phase3-stubs.ts → getAgencySession()` likewise
      (or delete the stub file if Phase 3 cleanup already happened).
- [ ] Mount `<OrgSwitcher />` in `components/shell/Sidebar.tsx` header
      area; pass no props.
- [ ] Add the Phase 9 RLS regression cases listed in §"Phase 8".
- [ ] Bump `EXPECTED_SCHEMA_VERSION` — **no change** (Phase 9 adds no
      migration).
- [ ] Verify the cookie domain. In dev (`http://localhost:3000`) it sets
      with `path=/`, no `domain`. In prod (`https://creatorhub.app`) the
      `Secure` flag is added automatically by `cookies().set` because the
      request is HTTPS — no extra wiring needed.

## Risks called out

| Risk | Mitigation |
|---|---|
| Stale cookie pointing to an org the user no longer belongs to (admin removed them) | `resolveActiveOrgId` always re-verifies membership and falls back silently to first membership. Cookie is overwritten by the next `/switch` call. |
| User in two orgs accidentally publishes in the wrong one | Mitigation is UX: `<OrgSwitcher />` shows the active org name prominently in the sidebar; cookie persists across sessions. Confirmation dialogs on destructive actions are a Phase 8 polish item. |
| Two browser tabs in different orgs | The cookie is shared across tabs. Last switch wins. Document this in the help center; do not engineer around it in v1. |
| Org-create rate abuse (user creates dozens of orgs) | Out of scope. If observed in production, add a `max(1 org created per minute, 5 per day)` rate limit at the handler. |
