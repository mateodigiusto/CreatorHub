-- 0037_subscriptions_finalize.sql
-- Phase 6 — destructive finalization of the Stripe org migration.
--
-- Runs AFTER scripts/backfill-subscriptions-to-orgs.ts has attached every
-- existing subscriptions row to an organization. The guarded raise below
-- refuses to apply when there is still a row with organization_id IS NULL,
-- so re-running the backfill is the only path forward in that case.
--
-- After this migration:
--   * subscriptions.user_id is dropped (org is the sole owner).
--   * profiles.stripe_customer_id is dropped (now lives on organizations).
--   * The legacy "subscriptions self read" RLS policy + subscriptions_user_idx
--     are dropped.
--   * The temporary owner-present CHECK is dropped; organization_id is
--     promoted to NOT NULL.

do $$
declare unmigrated int;
begin
  select count(*) into unmigrated
  from public.subscriptions
  where organization_id is null;
  if unmigrated > 0 then
    raise exception
      'subscriptions has % rows with organization_id IS NULL — run scripts/backfill-subscriptions-to-orgs.ts before applying 0037', unmigrated;
  end if;
end $$;

drop policy if exists "subscriptions self read" on public.subscriptions;

drop index if exists public.subscriptions_user_idx;

alter table public.subscriptions
  drop constraint if exists subscriptions_owner_present_chk;

alter table public.subscriptions
  drop column user_id;

alter table public.subscriptions
  alter column organization_id set not null;

alter table public.profiles
  drop column if exists stripe_customer_id;

insert into schema_migrations (version) values (37);
