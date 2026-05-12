# Phase 6 — Stripe org-level migration + Billing page + Plan gates

Status doc for the Phase 6 build of the Agency Clients pivot. Phase 6 ran **in parallel** with Phases 1–5, so every route handler, page, and stub lives in a non-routed location (`src/app/_phase6-pending/...` or `src/lib/agency/_phase1_deps.ts`) until the upstream phases land.

This doc is the single source of truth for what was built, what was deferred, and the exact post-Phase-1/2/3/5 cutover steps.

> **Note for the next session:** parallel agents reset the working tree several times during this build. This worktree was rebased onto Phase 1's commit (`4201e12`) so the org/membership schema in `src/db/schema.ts` is present. Phase 2/3/5 work (clients tables, brand_profiles, content_metrics, asset_videos) is **not** in this worktree — Phase 6 imports from those paths conditionally and the billing page falls back gracefully if they are missing at run time.

---

## What Phase 6 delivers

### Migrations

- `supabase/migrations/0036_stripe_org_migration.sql` — additive. Adds `subscriptions.organization_id` + index, relaxes `user_id` to nullable, adds the `subscriptions_owner_present_chk` CHECK, adds the partial unique `subscriptions_organization_active_uidx`, adds the `"subscriptions org read"` RLS policy, adds `stripe_events_type_received_idx`. Bumps schema to 36.
- `supabase/migrations/0037_subscriptions_finalize.sql` — destructive. Guards on `organization_id IS NULL = 0`. Drops `subscriptions.user_id`, `profiles.stripe_customer_id`, `subscriptions_user_idx`, the legacy `"subscriptions self read"` policy, and the temporary CHECK. Promotes `organization_id` to NOT NULL. Bumps schema to 37.

### Stripe lib

- `src/lib/stripe/org-plan-map.ts` — `orgPriceIdFor`, `orgPlanCycleFromPriceId`, `mapStripeSubscriptionStatus`, plus the `Cycle | PaidPlan | SubscriptionStatus` type exports. Reads `STRIPE_PRICE_${PLAN}_${CYCLE}` env vars.
- The legacy `src/lib/stripe/client.ts` is untouched — it still serves the onboarding paywall flow.

### Billing lib

- `src/lib/billing/plan-limit-response.ts` — `PlanLimitError` class + `planLimitResponse(err)` helper that maps to a 402 JSON body.

### Route handlers — STAGED in `src/app/_phase6-pending/`

- `_phase6-pending/api/webhooks/stripe/route.ts` — full rewrite of the Stripe webhook. Idempotency via `stripe_events` insert/conflict. On handler error: `DELETE stripe_events WHERE id = $1` so Stripe's retry actually re-runs. Handles `checkout.session.completed`, `customer.subscription.created|updated|deleted`, `invoice.payment_failed`, `invoice.payment_succeeded`. Writes to `organizations`, mirrors into legacy `subscriptions` (with `organization_id` set, `user_id` null) for audit history.
- `_phase6-pending/api/stripe/checkout/route.ts` — org-scoped Checkout. `requireOrgAdmin()`. Reuses `organizations.stripe_customer_id`. Stamps `metadata.organization_id`. Body `{ plan, cycle }` validated against the paid-plan set.
- `_phase6-pending/api/stripe/portal/route.ts` — org-scoped Customer Portal. `requireOrgAdmin()`. 404 with `{error:'no_customer'}` if missing.

### Auth stub

- `src/lib/agency/_phase1_deps.ts` — **created**. Phase 1 did not commit `src/lib/auth/session.ts`. Phase 2/3/5 already follow this import path, so Phase 6 does too. Every function `redirect('/login')`s at runtime so the stub is never reached in production before Phase 1's real session helpers ship.

### Backfill script

- `scripts/backfill-subscriptions-to-orgs.ts` — TS one-off using `@supabase/supabase-js` with the service-role key. Idempotent. `--dry-run` supported. Exits 2 on any error.

### Billing UI

- `src/components/billing/PlanCard.tsx` — `"use client"`. Status badge, trial / renewal copy, Manage subscription → `/api/stripe/portal`, Upgrade → `/api/stripe/checkout`. Monthly / Annual segmented toggle. Non-admin variant.
- `src/components/billing/UsageCard.tsx` — server component. Two meters. Tones: `--accent` normal, `--warning` ≥80%, `--error` ≥100%. Infinity → "Unlimited".
- `src/components/billing/PastDueBanner.tsx` — server component. Shows for `past_due` / `unpaid` only. Intended to drop into Phase 2's `clients/[slug]/layout.tsx` and Phase 7's `workspace/layout.tsx`.
- `src/components/billing/PlanLimitToast.tsx` — `"use client"`. `showPlanLimit(body)` placeholder until Phase 8 wires the real `Toaster`.

### Billing page

- `src/app/_phase6-pending/settings/billing/page.tsx` — server component. `requireOrg()`. Renders PageHeader + PlanCard + UsageCard + a PlanGrid showing all four tiers with the current one highlighted.

---

## Dependencies on Phases 1 / 2 / 3 / 5

| Phase 6 import | Owner | File path (real) | Behavior if missing at cutover |
|---|---|---|---|
| `requireOrg` / `requireOrgAdmin` from `@/lib/agency/_phase1_deps` | Phase 1 | `src/lib/auth/session.ts` (Phase 1 final) | Stub redirects to `/login`. Cutover step 10 deletes the stub once Phase 1 ships. |
| `getSupabaseServer` from `@/lib/supabase/server` | Already shipped | Same path | No cutover work. |
| `countActiveClients(orgId)` from `@/lib/billing/limits` | Phase 2 | `src/lib/billing/limits.ts` | Billing page falls back to a direct `clients.status='active'` count query. After Phase 2 ships, swap the fallback for the real helper. |
| `assertPlanAllows(plan, capability)` from `@/lib/billing/limits` | Phase 2 | `src/lib/billing/limits.ts` | Not imported anywhere in Phase 6's own code — Phase 6 only ships the **response mapper** (`planLimitResponse`). The actual wiring (steps 6a–c) is a cutover step. |
| `content_metrics` table | Phase 3 | `0035_client_workspace.sql` | `sumMonthlyViews` is wrapped in `try/catch` and returns 0 when the table is missing. |
| `clients` table | Phase 2 | `0034_agency_clients.sql` | `countActiveClientsFallback` returns 0 when the table is missing. |
| `asset_videos` table | Phase 5 | `0035_client_workspace.sql` | Not read by Phase 6. Plan-gate at video upload is a cutover step. |

---

## Cutover checklist (run AFTER Phases 1–5 are merged)

1. **Apply 0036_stripe_org_migration.sql**
   ```bash
   mcp__supabase__apply_migration   # or npm run db:migrate
   ```
   After it lands, every existing `subscriptions` row still has `organization_id IS NULL` — that is expected; step 8 backfills.

2. **Run advisors**
   ```bash
   mcp__supabase__get_advisors security
   mcp__supabase__get_advisors performance
   ```
   Ship a remediation migration if any new WARN appears (likely an `unused_index` INFO on the new partial unique — that one is fine).

3. **Move the webhook into place.** The legacy webhook at `src/app/api/webhooks/stripe/route.ts` writes `profiles` and the user-keyed `subscriptions`. Replace it:
   ```bash
   git mv src/app/_phase6-pending/api/webhooks/stripe/route.ts \
          src/app/api/webhooks/stripe/route.ts
   ```
   Confirm `STRIPE_WEBHOOK_SECRET` is still set in Vercel env. The endpoint URL does not change — Stripe Dashboard already points at `/api/webhooks/stripe`.

4. **Move checkout + portal into place.** The legacy `/api/stripe/checkout-session` and `/api/stripe/portal-session` still serve the onboarding step-8 paywall (per `docs/runbooks/stripe-activation.md`). Decision: keep them alive as user-level endpoints for the trial onboarding flow, and add the org-scoped versions side-by-side:
   ```bash
   mkdir -p src/app/api/stripe/checkout src/app/api/stripe/portal
   git mv src/app/_phase6-pending/api/stripe/checkout/route.ts \
          src/app/api/stripe/checkout/route.ts
   git mv src/app/_phase6-pending/api/stripe/portal/route.ts \
          src/app/api/stripe/portal/route.ts
   ```
   Phase 7+ may retire `checkout-session` / `portal-session` once the org flow covers the full lifecycle — flagged below.

5. **Move the billing page into place.** Requires Phase 1's `/settings` layout (or fall back to the existing `/settings/page.tsx` neighbour):
   ```bash
   mkdir -p src/app/settings/billing
   git mv src/app/_phase6-pending/settings/billing/page.tsx \
          src/app/settings/billing/page.tsx
   rm -rf src/app/_phase6-pending
   ```

6. **Wire `assertPlanAllows` into Phase 2/3/5 handlers** (Phase 6 deliberately did not edit these files — see §"Things Phase 6 intentionally did NOT do"). Pattern to apply at each site:
   ```ts
   import { assertPlanAllows } from "@/lib/billing/limits";
   import { planLimitResponse } from "@/lib/billing/plan-limit-response";

   try {
     await assertPlanAllows(session.plan, { kind: '<capability>', organizationId: session.organization.id });
   } catch (err) {
     const res = planLimitResponse(err);
     if (res) return res;
     throw err;
   }
   ```
   - **6a** `src/app/api/clients/route.ts` POST — `kind: 'add_client'`. Owner: Phase 2.
   - **6b** `src/app/api/clients/[slug]/brand-profile/analyze/route.ts` POST — `kind: 'ai_analyzer'`. Owner: Phase 3.
   - **6c** `src/app/api/clients/[slug]/assets/videos/route.ts` POST — `kind: 'video_upload'`. Owner: Phase 5.

7. **Drop the PastDueBanner into the layouts** Phase 2 and Phase 7 own:
   - `src/app/clients/[slug]/layout.tsx` — render `<PastDueBanner status={session.subscriptionStatus} isAdmin={session.isAdmin} />` at the top of the main content area, above the SubNav.
   - `src/app/workspace/layout.tsx` (Phase 7) — same; pass the **agency org's** status here, not the workspace user's.

8. **Run the backfill**
   ```bash
   npx tsx scripts/backfill-subscriptions-to-orgs.ts --dry-run
   npx tsx scripts/backfill-subscriptions-to-orgs.ts
   ```
   Read the summary line. If `errors > 0` or `skipped_multi > 0`, attach those manually in Supabase Studio before step 9. Re-run as many times as needed — it is idempotent.

9. **Apply 0037_subscriptions_finalize.sql.** The DO-block at the top will refuse to apply if any row still has `organization_id IS NULL`. That is the safety net for step 8.

10. **Delete the stub.** Once Phase 1 ships `src/lib/auth/session.ts`:
    ```bash
    rm src/lib/agency/_phase1_deps.ts
    grep -rl "@/lib/agency/_phase1_deps" src/ scripts/ | xargs sed -i '' \
      -e 's|@/lib/agency/_phase1_deps|@/lib/auth/session|g'
    ```
    Phase 2 and Phase 3 maintain the same file independently — coordinate the deletion with them.

11. **Bump `EXPECTED_SCHEMA_VERSION`** in `.env.example` + `tests/migration-roundtrip.spec.ts` to 37. Phase 1 already bumped to 33; subsequent phases may have bumped further. The final value after Phase 6 finalize is **37** (assuming Phase 2/3/4/5 each ship exactly one migration as planned).

12. **Lint + test pass**
    ```bash
    npm run lint
    npm run build
    npm run test:migration
    npm run test:rls
    ```

---

## Stripe Price IDs (deferred)

Six new Price IDs must exist in Stripe Dashboard before checkout works:

| Plan | Cycle | Env var |
|---|---|---|
| Starter | Monthly | `STRIPE_PRICE_STARTER_MONTHLY` |
| Starter | Annual | `STRIPE_PRICE_STARTER_ANNUAL` |
| Pro | Monthly | `STRIPE_PRICE_PRO_MONTHLY` |
| Pro | Annual | `STRIPE_PRICE_PRO_ANNUAL` |
| Scale | Monthly | `STRIPE_PRICE_SCALE_MONTHLY` |
| Scale | Annual | `STRIPE_PRICE_SCALE_ANNUAL` |

`Free` has no Stripe price — the plan is set by webhook when a subscription is canceled and by the initial signup flow (Phase 1's signup route handler sets the org to `plan = 'pro'`, `subscription_status = 'trialing'`, `trial_ends_at = now() + 14d`; the trial-expiry cron downgrades to `free` if no Stripe sub is attached).

Reference `docs/runbooks/stripe-activation.md` for the existing two-tier (`standard`, `pro`) setup that the onboarding paywall still uses. The runbook should be amended at cutover with the six new IDs.

---

## Acceptance criteria (manual, post-cutover)

Copied from §6 Phase 6 in `docs/plans/agency-clients-module.md`:

- [ ] Stripe Checkout in test mode upgrades the org's plan via webhook.
- [ ] Cancellation downgrades the org to `free`.
- [ ] `past_due` shows the `PastDueBanner` in the admin layout for admins.
- [ ] Free-plan org cannot create a second client (handler returns 402 with `error: 'plan_limit'`, `upgrade_to: 'starter'`).
- [ ] AI brand analyzer button on `/clients/[slug]/brand-build` returns 402 on Free.
- [ ] Video upload on `/clients/[slug]/assets` returns 402 on Free.
- [ ] Webhook redelivery for the same `event.id` returns `{received:true, duplicate:true}` and does NOT double-write.
- [ ] Webhook handler error causes Stripe to retry (verified by triggering an exception in `handleSubscriptionUpsert` and watching the second delivery succeed).

---

## Things Phase 6 intentionally did NOT do

- **Did not edit Phase 2's `src/app/api/clients/route.ts`.** That file is currently the demo route from the pre-pivot tree; Phase 2 owns the org-aware rewrite. `assertPlanAllows` is wired at cutover step 6a.
- **Did not edit Phase 3's `src/app/api/clients/[slug]/brand-profile/analyze/route.ts`.** Phase 3 stages this handler in `_phase3-pending/`. `assertPlanAllows` is wired at cutover step 6b after Phase 3 moves the file.
- **Did not edit Phase 5's `src/app/api/clients/[slug]/assets/videos/route.ts`.** The file may not exist yet (Phase 5 builds Bunny.net upload). `assertPlanAllows` is wired at cutover step 6c.
- **Did not edit Phase 2's `src/app/clients/[slug]/layout.tsx`.** `PastDueBanner` drop-in is cutover step 7.
- **Did not modify the legacy webhook at `src/app/api/webhooks/stripe/route.ts`.** It serves the onboarding paywall trial flow and continues to work alongside the org webhook until cutover step 3 replaces it.
- **Did not delete the legacy `/api/stripe/checkout-session` and `/api/stripe/portal-session` user-level handlers.** They serve the onboarding-step-8 paywall flow which writes `profiles.trial_*`. Decide at cutover (step 4) whether to redirect them to the org-scoped versions or retire them entirely once the org signup flow covers the full lifecycle.
- **Did not modify `tests/migration-roundtrip.spec.ts`.** Bumps to 37 at cutover step 11.
- **Did not modify `src/lib/stripe/client.ts`.** Stays in place. The new `org-plan-map.ts` lives alongside.
- **Did not modify `src/db/schema.ts`.** Drizzle mirrors for the 0036/0037 changes are part of the cutover (Phase 6 left them out to avoid colliding with parallel-session edits). After 0037 applies, update `subscriptions` in `schema.ts`: drop `userId`, add `organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' })`, add `subscriptions_organization_idx` + `subscriptions_organization_active_uidx`, and drop `stripeCustomerId` from `profiles`.
- **Did not install any new deps.** `@supabase/supabase-js` is already a dep used by the script; Stripe SDK is already a dep used by the legacy webhook.
- **Did not wire a real Toaster.** `PlanLimitToast` uses `window.alert()` as a placeholder; Phase 8 swaps for the real `Toaster` via `useAppState().showToast`.
