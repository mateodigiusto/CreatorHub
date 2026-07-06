# Stripe org-level migration runbook

Phase 6 moves billing from `profiles.stripe_customer_id` (user-level) to `organizations.stripe_customer_id` (org-level). Three SQL migrations plus one TypeScript backfill script run in sequence; a botched run can either dual-bill, silently un-bill, or strand a paying customer with no plan attached.

The script — `scripts/backfill-subscriptions-to-orgs.ts` — is already in tree. This runbook is how you run it safely.

---

## Order of operations

```
1. Apply migration 0036 (adds organization_id NULLable to subscriptions)
2. Dry-run the backfill — review log for skip / conflict warnings
3. Resolve any "admins N orgs" / "stripe_customer_id conflict" rows manually
4. Live-run the backfill
5. Reconciliation queries (§5) all return 0
6. Smoke-test one webhook event end-to-end (§6)
7. Apply migration 0037 (NOT NULL, drop user_id, drop profiles.stripe_customer_id)
```

Each step is recoverable until step 7. Step 7 is the point-of-no-return for `subscriptions.user_id`; do not apply it the same day as 0036.

---

## 1. Apply 0036 — add `organization_id` to `subscriptions`

```
mcp__supabase__apply_migration 0036_stripe_org_migration
```

Confirm:

```sql
select column_name, is_nullable, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'subscriptions'
  and column_name in ('user_id', 'organization_id');
-- expect both columns; organization_id is NULLABLE for now.
```

The migration does **not** drop `profiles.stripe_customer_id`. It stays for one release.

---

## 2. Dry run the backfill

```bash
cd creatorhub-app
# Required env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
npx tsx scripts/backfill-subscriptions-to-orgs.ts --dry-run
```

The script logs one line per subscription. Look for:

| Log line | Meaning | Action |
|---|---|---|
| `attaching to existing org <slug>` | User admins exactly one org — clean | none |
| `would create org "<name>" (slug=<slug>)` | User admins zero orgs — script will create a personal one | OK if name + slug look reasonable |
| `admins N orgs — needs manual review, skipping` | Ambiguous | §3 — resolve manually |
| `customer X but org Y already has Z — skipping` | Stripe customer mismatch | §3 — investigate |

Tally the totals at the end. `errors=0` is required before §4.

---

## 3. Manual resolution (only if §2 surfaced skips)

### Case A — user admins multiple orgs

Pick one. The simplest heuristic:

```sql
-- Which org is the user *actively* using?
select om.organization_id, o.slug, count(c.id) as client_count
from public.organization_memberships om
join public.organizations o on o.id = om.organization_id
left join public.clients c on c.organization_id = o.id
where om.profile_id = '<user_uuid>' and om.is_admin
group by om.organization_id, o.slug
order by client_count desc;
```

Update `subscriptions.organization_id` directly via service-role:

```sql
update public.subscriptions
   set organization_id = '<chosen_org_uuid>'
 where id = '<sub_uuid>';

update public.organizations
   set stripe_customer_id     = (select stripe_customer_id     from public.subscriptions where id = '<sub_uuid>')
     , stripe_subscription_id = (select stripe_subscription_id from public.subscriptions where id = '<sub_uuid>')
     , plan                   = case (select plan from public.subscriptions where id = '<sub_uuid>')
                                  when 'pro' then 'pro'::org_plan_t
                                  else 'starter'::org_plan_t end
     , subscription_status    = (select status                 from public.subscriptions where id = '<sub_uuid>')::org_sub_status_t
     , current_period_end     = (select current_period_end     from public.subscriptions where id = '<sub_uuid>')
 where id = '<chosen_org_uuid>'
   and stripe_customer_id is null;
```

### Case B — stripe customer id conflict

The user's org already has a different `stripe_customer_id`. Don't overwrite — that would break the existing subscription. Options:

1. **Merge in Stripe.** Migrate the user's customer to the org's customer via Stripe Dashboard → Customers → "Update customer details". Then update `subscriptions.stripe_customer_id` to the surviving customer id.
2. **Two subscriptions, one org.** Allowed by schema — but the org's `stripe_subscription_id` only stores one. Cancel the duplicate in Stripe Dashboard and refund prorated amount.

Either way, document the decision in the PR / ticket.

---

## 4. Live run

```bash
npx tsx scripts/backfill-subscriptions-to-orgs.ts
```

Tail the log. If errors > 0, the process exits with code 2 and you should not proceed.

---

## 5. Reconciliation queries

All four must return **zero rows**:

```sql
-- a) every subscription has an org attached
select id from public.subscriptions where organization_id is null;

-- b) every org with a customer id has it mirrored on at least one subscription
select o.id, o.slug from public.organizations o
left join public.subscriptions s on s.organization_id = o.id
where o.stripe_customer_id is not null and s.id is null;

-- c) no subscription points to an org that has no admin
select s.id from public.subscriptions s
left join public.organization_memberships om
       on om.organization_id = s.organization_id and om.is_admin
where s.organization_id is not null and om.id is null;

-- d) no profile still references a customer id its org doesn't have
select p.user_id from public.profiles p
where p.stripe_customer_id is not null
  and not exists (
    select 1 from public.organization_memberships om
    join public.organizations o on o.id = om.organization_id
    where om.profile_id = p.user_id
      and o.stripe_customer_id = p.stripe_customer_id
  );
```

Any non-empty result is an unresolved row — go back to §3.

---

## 6. Smoke-test a webhook event

In Stripe Test mode, trigger a `customer.subscription.updated` event for a migrated customer:

```bash
stripe trigger customer.subscription.updated
```

Then verify the **org** row updated, not the legacy `profiles` row:

```sql
select id, slug, plan, subscription_status, current_period_end
from public.organizations
order by updated_at desc
limit 5;
```

If `organizations.updated_at` is recent and `profiles.updated_at` did not move, the webhook handler is org-scoped correctly.

If `profiles.updated_at` moved instead, the handler still writes to the legacy table — **stop and fix the handler** before §7.

---

## 7. Apply 0037 — finalize (point-of-no-return)

Wait at least 24 hours after §6 passes. During that window, real webhook events fire — if any error surfaces, you can re-run the backfill on the affected row.

When you're ready:

```
mcp__supabase__apply_migration 0037_subscriptions_finalize
```

This migration:

1. `alter table subscriptions alter column organization_id set not null`
2. `alter table subscriptions drop column user_id`
3. `alter table profiles drop column stripe_customer_id`

After it lands, `EXPECTED_SCHEMA_VERSION` becomes 37 — bump it per `schema-version-bump.md`.

---

## 8. Rollback (last resort, only between §1 and §7)

If §5 fails and you can't manually resolve:

```sql
-- Untangle the backfill
update public.subscriptions set organization_id = null;
update public.organizations set
  stripe_customer_id = null,
  stripe_subscription_id = null,
  subscription_status = 'trialing',
  current_period_end = null
where id in (
  select organization_id from public.subscriptions where organization_id is not null
);
```

This restores the pre-§4 state. You can re-run the backfill once the underlying data conflict is resolved.

After §7, only PITR restores `subscriptions.user_id`. There is no soft rollback.

---

## Sign-off checklist

- [ ] §1 migration applied; schema version bumped to 36.
- [ ] §2 dry-run logged; PR comment lists `migrated / skipped / errors` totals.
- [ ] §3 manual rows resolved with notes in PR.
- [ ] §4 live run finished with `errors=0`.
- [ ] §5 four reconciliation queries returned zero rows.
- [ ] §6 webhook smoke test moved an org row, not a profile row.
- [ ] (24h soak) §7 finalize migration applied.
- [ ] `EXPECTED_SCHEMA_VERSION` bumped per `schema-version-bump.md`.
