-- 0034_agency_clients.sql (schema v34)
--
-- Phase 2 of the agency-clients pivot.
-- Depends on 0033_organizations.sql (organizations + memberships + the
-- `is_org_staff` / `is_org_admin` / `current_org_role` helpers).
--
-- Adds:
--   • clients               — the creator-being-managed row, owned by an org
--   • client_memberships    — links real users (creator + their teammates)
--                              to a client for /workspace/* access
--   • has_client_access()   — SQL helper used by Phase 3+ RLS policies
--
-- RLS:
--   • Org staff (any membership row, role independent) can read & write
--     their org's clients.
--   • Only org admins (is_admin=true) can DELETE a client.
--   • A user with a `client_memberships` row can READ that client (so they
--     can log into /workspace/*). Writes require org staff.

create type client_status_t as enum ('active', 'paused', 'archived');
create type client_access_role_t as enum ('client_owner', 'team_assigned');

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9-]+$'),
  display_name text not null,
  tagline text,
  status client_status_t not null default 'active',
  instagram_handle text,
  created_by uuid references public.profiles(user_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug)
);
create index clients_org_idx on public.clients(organization_id);
create index clients_org_status_idx on public.clients(organization_id, status);
create trigger trg_touch_clients before update on public.clients
  for each row execute function trg_touch_updated_at();

create table public.client_memberships (
  id uuid primary key default gen_random_uuid(),
  -- Denormalised organization_id mirrors clients.organization_id; trigger
  -- below keeps it in sync. Stored here so RLS policies on this table can
  -- gate by org without a join, and so an org-cascade delete fans out.
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  profile_id uuid not null references public.profiles(user_id) on delete cascade,
  access_role client_access_role_t not null,
  invited_by uuid references public.profiles(user_id),
  created_at timestamptz not null default now(),
  unique (client_id, profile_id)
);
create index client_members_profile_idx on public.client_memberships(profile_id);
create index client_members_client_idx on public.client_memberships(client_id);
create index client_members_org_idx on public.client_memberships(organization_id);

-- Keep client_memberships.organization_id in sync with clients.organization_id.
-- A client can't change orgs in practice, but the trigger keeps the invariant
-- under any future re-parenting and prevents app code from inserting a row
-- pointing at the wrong org.
create or replace function public.sync_client_membership_org()
returns trigger language plpgsql as $$
declare cli_org uuid;
begin
  select organization_id into cli_org from public.clients where id = new.client_id;
  if cli_org is null then
    raise exception 'client_memberships.client_id % does not exist', new.client_id;
  end if;
  new.organization_id := cli_org;
  return new;
end $$;
create trigger trg_sync_client_membership_org
  before insert or update of client_id on public.client_memberships
  for each row execute function public.sync_client_membership_org();

-- "Can the current user touch this client?" Either they're org staff, or
-- they hold a client_memberships row for it.
create or replace function public.has_client_access(_client uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.clients c
    where c.id = _client
      and (
        is_org_staff(c.organization_id)
        or exists (
          select 1 from public.client_memberships m
          where m.client_id = _client and m.profile_id = (select auth.uid())
        )
      )
  )
$$;

-- ─── RLS ─────────────────────────────────────────────────────────────────

alter table public.clients enable row level security;

create policy clients_select on public.clients
  for select
  using (
    is_org_staff(organization_id)
    or exists (
      select 1 from public.client_memberships m
      where m.client_id = clients.id and m.profile_id = (select auth.uid())
    )
  );

create policy clients_insert on public.clients
  for insert
  with check (is_org_staff(organization_id));

create policy clients_update on public.clients
  for update
  using (is_org_staff(organization_id))
  with check (is_org_staff(organization_id));

-- Hard delete is admin-only. Soft archive (status='archived') is via update.
create policy clients_delete on public.clients
  for delete
  using (is_org_admin(organization_id));

alter table public.client_memberships enable row level security;

create policy client_members_select on public.client_memberships
  for select
  using (
    is_org_staff(organization_id)
    or profile_id = (select auth.uid())
  );

create policy client_members_insert on public.client_memberships
  for insert
  with check (is_org_staff(organization_id));

create policy client_members_update on public.client_memberships
  for update
  using (is_org_staff(organization_id))
  with check (is_org_staff(organization_id));

create policy client_members_delete on public.client_memberships
  for delete
  using (is_org_staff(organization_id));

insert into schema_migrations (version) values (34);
