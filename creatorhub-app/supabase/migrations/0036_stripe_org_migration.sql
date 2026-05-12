-- 0036_stripe_org_migration.sql
-- Phase 6 — Stripe org-level migration (additive half).
--
-- Moves billing ownership from user → organization. Additive only:
--   * subscriptions.organization_id is added (nullable) and indexed.
--   * subscriptions.user_id is relaxed to nullable.
--   * A CHECK constraint requires either user_id or organization_id (during
--     the cutover window we accept rows with only one of them set).
--   * A partial UNIQUE index prevents a second active subscription for the
--     same org (mirrors what subscriptions_user_idx implicitly did).
--   * An org-aware RLS read policy lets org members read their org's row.
--     The legacy "subscriptions self read" policy stays in place so the
--     existing UI continues to render while the TS backfill runs.
--   * stripe_events gets a covering index on (type, received_at desc) for
--     the webhook event-replay queries the runbook uses.
--
-- The destructive half (drop user_id, drop profiles.stripe_customer_id,
-- drop the legacy policy, promote organization_id to NOT NULL) lives in
-- 0037_subscriptions_finalize.sql and runs ONLY after the TS backfill at
-- scripts/backfill-subscriptions-to-orgs.ts verifies every row.

alter table public.subscriptions
  add column organization_id uuid references public.organizations(id) on delete cascade;

create index subscriptions_organization_idx on public.subscriptions(organization_id);

alter table public.subscriptions
  alter column user_id drop not null;

alter table public.subscriptions
  add constraint subscriptions_owner_present_chk
  check (user_id is not null or organization_id is not null);

create unique index subscriptions_organization_active_uidx
  on public.subscriptions(organization_id)
  where status in ('trialing','active','past_due') and organization_id is not null;

create policy "subscriptions org read" on public.subscriptions
  for select using (
    organization_id is not null and public.is_org_member(organization_id)
  );

create index stripe_events_type_received_idx
  on public.stripe_events(type, received_at desc);

insert into schema_migrations (version) values (36);
