# Multi-org-per-user forward compatibility

The schema supports a user belonging to N organizations (`organization_memberships` is a join table, not a 1:1). The v1 UI does not. To prevent "multi-org creep" — features that lock in single-org assumptions and become expensive to undo — every code path that resolves "the current org" funnels through one helper.

This runbook is the contract. It is **docs-only**; the code lives in `src/lib/auth/session.ts` (Phase 1 ownership). The Phase 1 agent is responsible for keeping the helper conformant.

---

## The contract

```ts
// src/lib/auth/session.ts (Phase 1)
export type AgencySession = {
  userId: string;
  email: string;
  organization: { id: string; slug: string; name: string };
  orgRole: OrgRole;
  isAdmin: boolean;
  plan: Plan;
  subscriptionStatus: OrgSubStatus;
};

export async function getSession(): Promise<AgencySession | null>;
```

`session.organization` is **always exactly one org** in v1. The resolver picks the user's first membership row (by `created_at ASC`). When multi-org lands:

1. Add `organization` selector UI somewhere (likely a topbar menu)
2. Persist the chosen org id in a cookie (`creatorhub_active_org`)
3. The resolver reads the cookie if set; falls back to "first membership" if not

That's a one-file change. Every other consumer reads `session.organization.id` and never re-resolves on its own.

---

## Rules for new code

### ✅ Do

- Call `getSession()` at the top of route handlers / server components. Use `session.organization.id` for queries.
- For non-session paths (cron, webhook handlers), accept `organizationId` as a parameter.
- For typed scopes / RLS helpers, take `organizationId` explicitly — don't infer from the user.

### ❌ Don't

- Don't query `organization_memberships` directly to find "the user's org" anywhere other than inside `getSession()` / `require-org.ts`.
- Don't store the active org id in client-side localStorage (cookie is server-readable; localStorage is not).
- Don't write code that loops over `(await sb.from("organization_memberships").select(...))` to do something to "all of a user's orgs". V1 only acts on one org per request.
- Don't assume `session.organization.id` equals a row in `organization_memberships` with `is_admin=true` — that's a separate check (`session.isAdmin`).

---

## The TODO marker

The Phase 1 `getSession()` should carry this comment near the membership lookup:

```ts
// TODO(multi-org): v1 picks the first membership row. When multi-org UI lands,
// read the active org id from cookie `creatorhub_active_org` first, then fall
// back to this lookup. The downstream API is forward-compatible — only this
// resolver needs to change.
const { data: memberships } = await supabase
  .from("organization_memberships")
  .select("organization_id, role, is_admin, organizations(id, slug, name, plan, subscription_status)")
  .eq("profile_id", user.id)
  .order("created_at", { ascending: true })
  .limit(1);
```

When the Phase 1 PR opens, the merger / reviewer enforces the comment + the `limit(1)` + the `order(...)` clause.

---

## Multi-org-creep checklist (review before every Phase merge)

Run these greps against the diff. Each must come back empty (or be reviewed):

```bash
# 1. Direct lookups of memberships outside the session helper
git diff --name-only main... | xargs grep -l 'organization_memberships' 2>/dev/null \
  | grep -v 'src/lib/auth/' | grep -v 'src/db/forUser' | grep -v 'tests/'

# 2. Plural "organizations" in session-flavored helpers
git diff --name-only main... | xargs grep -nE 'session\.organizations\b' 2>/dev/null

# 3. Active-org cookie introduced before the UI ships
git diff --name-only main... | xargs grep -nE 'creatorhub_active_org' 2>/dev/null
```

Any hit is either:
- a legitimate exception (cron / admin script), in which case it must be in `src/app/api/cron/` or `scripts/`, OR
- a creep — refactor through `getSession()`.

---

## When you actually build the multi-org UI

The schema, RLS, and route-handler signature are already ready. The work is:

1. Topbar org-switcher menu (lists orgs from `organization_memberships`, sets cookie, refreshes page).
2. Update `getSession()` to read cookie first.
3. `/settings/team` already shows the active org's members — no change needed.
4. New page `/settings/organizations` for "leave this org" + "create new org".
5. Stripe Customer is still per-org. No changes to billing.

That's the full surface. Ship the multi-org UI behind a feature flag (`session.profile.flags.multi_org`) until you've shipped at least one paying agency to confirm the pattern works for one org first.
