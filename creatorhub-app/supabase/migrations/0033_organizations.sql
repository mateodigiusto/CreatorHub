-- 0033_organizations.sql
-- Multi-tenant foundation for the agency Clients module.
--
-- Model:
--   * organizations is the agency (or solo workspace). Stripe lives here, not on profiles.
--   * organization_memberships joins profiles to organizations with a base
--     role (user | editor | director) and an orthogonal is_admin flag.
--     WhatsApp-style: any role can also be admin; multiple admins allowed.
--   * organization_invites is the pre-signup ledger.
--   * stripe_events is webhook idempotency.
--
-- See docs/plans/agency-clients-module.md §3.3 for design notes.

create type org_role_t as enum ('user', 'editor', 'director');
create type org_plan_t as enum ('free', 'starter', 'pro', 'scale');
create type org_sub_status_t as enum (
  'trialing', 'active', 'past_due', 'canceled', 'unpaid',
  'incomplete', 'incomplete_expired', 'paused'
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  created_by uuid references public.users(id) on delete set null,
  plan org_plan_t not null default 'free',
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  subscription_status org_sub_status_t not null default 'trialing',
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger touch_organizations_updated_at
  before update on public.organizations
  for each row execute function trg_touch_updated_at();

create table public.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid not null references public.users(id) on delete cascade,
  role org_role_t not null default 'user',
  is_admin boolean not null default false,
  invited_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, profile_id)
);
create index org_members_profile_idx on public.organization_memberships(profile_id);
create index org_members_org_idx on public.organization_memberships(organization_id);
create index org_members_admin_idx
  on public.organization_memberships(organization_id) where is_admin;
create trigger touch_org_members_updated_at
  before update on public.organization_memberships
  for each row execute function trg_touch_updated_at();

create or replace function public.enforce_org_has_admin()
returns trigger language plpgsql as $$
declare remaining int;
begin
  if tg_op = 'DELETE' then
    if old.is_admin then
      select count(*) into remaining
      from public.organization_memberships
      where organization_id = old.organization_id and is_admin and id <> old.id;
      if remaining = 0 then
        raise exception 'Cannot remove the last admin of an organization';
      end if;
    end if;
    return old;
  elsif tg_op = 'UPDATE' then
    if old.is_admin and not new.is_admin then
      select count(*) into remaining
      from public.organization_memberships
      where organization_id = old.organization_id and is_admin and id <> old.id;
      if remaining = 0 then
        raise exception 'Cannot demote the last admin of an organization';
      end if;
    end if;
    return new;
  end if;
  return null;
end $$;
create trigger trg_org_members_admin_guard
  before update or delete on public.organization_memberships
  for each row execute function public.enforce_org_has_admin();

create table public.organization_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role org_role_t not null default 'user',
  is_admin boolean not null default false,
  token text unique not null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index org_invites_org_idx on public.organization_invites(organization_id);
create index org_invites_email_idx on public.organization_invites(email) where accepted_at is null;

create table public.stripe_events (
  id text primary key,
  type text not null,
  payload jsonb not null,
  received_at timestamptz not null default now()
);

create or replace function public.current_org_role(_org uuid)
returns org_role_t language sql security definer stable as $$
  select role from public.organization_memberships
  where organization_id = _org and profile_id = (select auth.uid())
  limit 1
$$;

create or replace function public.is_org_member(_org uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.organization_memberships
    where organization_id = _org and profile_id = (select auth.uid())
  )
$$;

create or replace function public.is_org_staff(_org uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.organization_memberships
    where organization_id = _org and profile_id = (select auth.uid())
  )
$$;

create or replace function public.is_org_admin(_org uuid)
returns boolean language sql security definer stable as $$
  select coalesce((
    select is_admin from public.organization_memberships
    where organization_id = _org and profile_id = (select auth.uid())
    limit 1
  ), false)
$$;

alter table public.organizations enable row level security;
create policy organizations_select on public.organizations
  for select using (public.is_org_member(id));
create policy organizations_update on public.organizations
  for update using (public.is_org_admin(id))
  with check (public.is_org_admin(id));

alter table public.organization_memberships enable row level security;
create policy org_members_select on public.organization_memberships
  for select using (public.is_org_member(organization_id));
create policy org_members_insert on public.organization_memberships
  for insert with check (public.is_org_admin(organization_id));
create policy org_members_update on public.organization_memberships
  for update using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));
create policy org_members_delete on public.organization_memberships
  for delete using (public.is_org_admin(organization_id));

alter table public.organization_invites enable row level security;
create policy org_invites_select on public.organization_invites
  for select using (public.is_org_admin(organization_id));
create policy org_invites_insert on public.organization_invites
  for insert with check (public.is_org_admin(organization_id));
create policy org_invites_delete on public.organization_invites
  for delete using (public.is_org_admin(organization_id));

alter table public.stripe_events enable row level security;
revoke all on public.stripe_events from anon, authenticated;

insert into schema_migrations (version) values (33);
