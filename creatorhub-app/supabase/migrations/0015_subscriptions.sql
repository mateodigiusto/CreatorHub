-- Subscriptions: source of truth for billing state. Stripe webhooks write
-- here; UI reads from here for "Active / Past due / Canceled" copy. The
-- profiles.trial_* columns from migration 0014 stay as the mock fallback
-- when Stripe isn't configured.

create type subscription_status_t as enum (
  'trialing','active','past_due','canceled',
  'incomplete','incomplete_expired','unpaid','paused'
);

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  stripe_customer_id text not null,
  stripe_subscription_id text not null unique,
  plan text not null check (plan in ('standard','pro')),
  cycle text not null check (cycle in ('monthly','annual')),
  status subscription_status_t not null,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger touch_updated_at before update on subscriptions
  for each row execute function trg_touch_updated_at();

create index subscriptions_user_idx on subscriptions(user_id);
create index subscriptions_customer_idx on subscriptions(stripe_customer_id);

alter table subscriptions enable row level security;

-- RLS: users read their own subscription. Writes happen via service-role
-- (Stripe webhook handler) so no INSERT/UPDATE policy needed.
create policy "subscriptions self read" on subscriptions
  for select using ((select auth.uid()) = user_id);

-- Stripe customer id on profiles — set on first checkout. Lets us reuse
-- the customer on subsequent Portal/Checkout calls for the same user.
alter table profiles add column stripe_customer_id text;

insert into schema_migrations (version) values (15) on conflict do nothing;
