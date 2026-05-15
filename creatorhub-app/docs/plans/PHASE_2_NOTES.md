# Phase 2 — Agency clients core (build notes)

Built by a separate agent while Phase 1 is being built in parallel.
Phase 2 is the agency-side CRUD + Overview + Settings tabs.

## Status of this Phase 2 commit

Built, **not run**, because Phase 1 dependencies aren't merged yet:

- Migration `0034_agency_clients.sql` is written but **NOT applied** — it
  references `is_org_staff()`, `is_org_admin()`, `current_org_role()` and the
  `organizations` / `organization_memberships` tables that Phase 1's
  `0033_organizations.sql` introduces. Apply 0033 first, then 0034.
- App code in Phase 2 imports Phase-1 helpers via
  `src/lib/agency/_phase1_deps.ts`. That file is a STUB. When Phase 1 lands,
  the Phase 1 agent (or whoever merges) replaces the stub re-exports with
  real re-exports from `src/lib/auth/session.ts`, `require-org.ts`, etc.
- `npm run build` / `lint` / `test:rls` / `test:migration` will fail until
  Phase 1 is merged in. That's expected.

## Phase 1 contract — what Phase 2 assumes Phase 1 produces

### SQL (migration 0033)

Phase 2 RLS policies call these SQL helpers, so Phase 1 must create them:

```sql
public.is_org_staff(_org uuid)  -> boolean
public.is_org_admin(_org uuid)  -> boolean
public.current_org_role(_org uuid) -> org_role_t
```

And these tables / enums must exist before 0034 runs:

```
organizations
organization_memberships
organization_invites
org_role_t  ('user', 'editor', 'director')
org_plan_t  ('free', 'starter', 'pro', 'scale')
org_sub_status_t (see plan §3.2)
```

### TypeScript helpers

Phase 2 imports these from `src/lib/agency/_phase1_deps.ts` (stub). The real
implementations Phase 1 must export, with matching signatures:

```ts
// src/lib/auth/session.ts
export type OrgRole = 'user' | 'editor' | 'director';
export type Plan = 'free' | 'starter' | 'pro' | 'scale';
export type AgencySession = {
  userId: string;
  email: string;
  organization: { id: string; slug: string; name: string };
  orgRole: OrgRole;
  isAdmin: boolean;
  plan: Plan;
  subscriptionStatus: 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid' | 'incomplete' | 'incomplete_expired' | 'paused';
};

export async function getSession(): Promise<AgencySession | null>;

// src/lib/auth/require-org.ts
export async function requireOrg(): Promise<AgencySession>;  // redirects if no org

// src/lib/auth/require-org-role.ts
export async function requireOrgRole(min: OrgRole): Promise<AgencySession>;
export async function requireOrgAdmin(): Promise<AgencySession>;
```

Reconcile by editing `_phase1_deps.ts` to re-export from these paths once they exist.

### Drizzle schema

Phase 2's Drizzle additions live in `src/db/schema-agency.ts` (not the main
`schema.ts`) so the two phases don't fight over the same file. Phase 1 adds
`organizations` + `organizationMemberships` to `schema.ts`. After merge,
either file can import the other. Phase 2's tables use plain `uuid` columns
to reference org/profile rows — no `.references(...)` chains — so the
schema-agency file compiles before Phase 1 lands.

## Phase 2 file index

```
supabase/migrations/0034_agency_clients.sql         NEW — apply AFTER 0033
src/db/schema-agency.ts                              NEW — clients + client_memberships drizzle
src/lib/agency/_phase1_deps.ts                       NEW (STUB) — replace at merge time
src/lib/agency/types.ts                              NEW — agency-side row types
src/lib/agency/permissions.ts                        NEW — base-role + admin-flag helpers
src/lib/auth/require-client-access.ts                NEW — resolve client by slug + gate
src/lib/billing/plans.ts                             NEW — PLANS const
src/lib/billing/limits.ts                            NEW — assertPlanAllows + count helpers
src/app/api/clients/route.ts                         REPLACED — GET list, POST create (org-scoped)
src/app/api/clients/[slug]/route.ts                  NEW — GET, PATCH, DELETE
src/app/api/clients/[slug]/members/route.ts          NEW — POST/GET client_memberships
src/app/api/clients/[slug]/members/[id]/route.ts     NEW — DELETE client_membership
src/app/clients/page.tsx                             REPLACED — agency all-clients grid
src/app/clients/[slug]/layout.tsx                    NEW — sub-nav shell
src/app/clients/[slug]/overview/page.tsx             NEW — read-only summary
src/app/clients/[slug]/settings/page.tsx             NEW — edit form + members + danger
src/components/clients/AddClientDialog.tsx           NEW — native <dialog> modal
src/components/clients/ClientSubNav.tsx              NEW — 10 tab links
src/components/clients/ClientSettingsForm.tsx        NEW
src/components/clients/ClientMembersList.tsx         NEW
src/components/clients/ClientDangerZone.tsx          NEW
src/components/clients/ClientGrid.tsx                NEW — card grid for /clients
```

## Files Phase 2 does NOT touch

To avoid stomping on Phase 1's in-flight work:

- `src/db/schema.ts` — Phase 1 adds organizations there. Phase 2 lives in
  `schema-agency.ts`.
- `src/lib/auth/session.ts` etc. — Phase 1 owns. Phase 2 imports via the stub.
- The legacy `relationship_*` tables — Phase 1's 0032 drops them.
- The uncommitted `0031_relationship_retainer.sql` — Phase 1 deletes it.
- The existing `/clients/[id]/` route and `/components/clients/Cross*`,
  `Retainer*`, `ReportPanel.tsx`, etc. — see "Routing collision" below.
- Sidebar, signup, /onboarding/create-org, /invite/[token] — Phase 1 owns.

## Routing collision (must resolve at merge)

Next.js App Router rejects two sibling dynamic segments at the same path
level. The existing `/clients/[id]/page.tsx` and the new
`/clients/[slug]/...` conflict. **The merger step must remove `[id]/`**
(its replacement is `[slug]/`). This is Phase 5's "files to delete" cleanup
brought forward to merge time.

The simplest cleanup, once both phases land:

```bash
rm -rf src/app/clients/[id] src/app/clients/new \
       src/app/api/clients/[id] src/app/api/clients/pipeline \
       src/app/api/clients/tasks
rm -f  supabase/migrations/0031_relationship_retainer.sql \
       src/components/clients/CrossClientPipeline.tsx \
       src/components/clients/CrossClientTasks.tsx \
       src/components/clients/RetainerCard.tsx \
       src/components/clients/ReportPanel.tsx \
       src/components/clients/MessagesPanel.tsx \
       src/components/clients/TasksPanel.tsx \
       src/components/clients/DocsPanel.tsx \
       src/components/clients/LinksPanel.tsx \
       src/components/clients/StreakPanel.tsx
rm -f  src/lib/clients/types.ts
```

That's intentionally not done in this Phase 2 commit so the working tree
matches the user's "another agent owns the cleanup" instruction.

## Phase 2 acceptance criteria (from the plan)

- [ ] Create one client from the grid
- [ ] Edit its settings (name / slug / tagline / IG / status)
- [ ] Change its slug → URL updates → still resolvable
- [ ] Invite a creator user as `client_owner` via `/api/clients/[slug]/members`
- [ ] Delete the client → cascade verified (memberships rows gone)
- [ ] Upgrade tooltip appears at plan limit (free=1, starter=5, pro=20)

These cannot be verified until Phase 1 is merged and the migration applied.
