-- 0038_onboarding_split.sql (schema v38)
--
-- Role-aware onboarding epic — Phase A (data model).
-- Depends on 0033 (organizations + memberships + is_org_* helpers) and
-- 0034 (clients + client_memberships + has_client_access).
--
-- NOTE ON NUMBERING: 0037_subscriptions_finalize.sql is shipped but NOT yet
-- applied (it is destructive and gated on the Stripe backfill). This
-- migration is unrelated to that work, so it takes the next number and the
-- cloud DB jumps 36 -> 38. The boot guard reads max(version); a gap is
-- harmless. EXPECTED_SCHEMA_VERSION must be set to 38.
--
-- Adds:
--   • organizations.kind                  — 'agency' | 'solo' (solo = org of one,
--                                            agency UI hidden)
--   • organizations.client_approval_required — gate for join-link approvals
--   • client_memberships.status           — 'pending' | 'active' | 'denied'
--   • client_memberships.approved_by/at   — approval audit
--   • client_invites                      — reusable join-link / QR tokens
--   • inbox_events                        — non-actionable inbox feed items
--
-- RLS:
--   • New columns inherit the existing organizations / client_memberships
--     policies.
--   • has_client_access() now requires status='active' — a pending member
--     can read their own membership row (to render the waiting screen) and
--     the client row (for display), but cannot reach /workspace content.
--   • client_invites + inbox_events: org staff manage; the public
--     /join/[token] lookup and the join-side insert run via service role.

-- ─── organizations: account kind + approval gate ────────────────────────────

create type org_kind_t as enum ('agency', 'solo');

alter table public.organizations
  add column kind org_kind_t not null default 'agency',
  add column client_approval_required boolean not null default true;

-- ─── client_memberships: pending/active/denied lifecycle ────────────────────

create type client_member_status_t as enum ('pending', 'active', 'denied');

alter table public.client_memberships
  add column status client_member_status_t not null default 'active',
  add column approved_by uuid references public.profiles(user_id),
  add column approved_at timestamptz;

create index client_members_pending_idx
  on public.client_memberships(organization_id)
  where status = 'pending';

-- has_client_access() previously counted ANY membership row. A pending
-- member must NOT reach workspace content — tighten to status='active'.
create or replace function public.has_client_access(_client uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.clients c
    where c.id = _client
      and (
        is_org_staff(c.organization_id)
        or exists (
          select 1 from public.client_memberships m
          where m.client_id = _client
            and m.profile_id = (select auth.uid())
            and m.status = 'active'
        )
      )
  )
$$;

-- ─── client_invites: reusable join-link / QR tokens ─────────────────────────

create table public.client_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  access_role client_access_role_t not null default 'client_owner',
  token text unique not null,
  -- Reusable: many people can redeem the same token until it expires or is
  -- revoked. Per-person consumption is tracked via client_memberships.
  expires_at timestamptz,
  revoked_at timestamptz,
  created_by uuid references public.profiles(user_id),
  created_at timestamptz not null default now()
);
create index client_invites_org_idx on public.client_invites(organization_id);
create index client_invites_client_idx on public.client_invites(client_id);
create index client_invites_created_by_idx on public.client_invites(created_by);
create index client_invites_token_active_idx
  on public.client_invites(token) where revoked_at is null;

alter table public.client_invites enable row level security;
-- Org staff manage their org's join links. The public /join/[token] route
-- looks up tokens via the service-role client (bypasses RLS) because the
-- redeemer is not yet a member of anything.
create policy client_invites_select on public.client_invites
  for select using (is_org_staff(organization_id));
create policy client_invites_insert on public.client_invites
  for insert with check (is_org_staff(organization_id));
create policy client_invites_update on public.client_invites
  for update using (is_org_staff(organization_id))
  with check (is_org_staff(organization_id));
create policy client_invites_delete on public.client_invites
  for delete using (is_org_staff(organization_id));

-- ─── inbox_events: non-actionable inbox feed ────────────────────────────────
--
-- The actionable part of the inbox (pending approvals) is derived from
-- client_memberships where status='pending'. This table holds the
-- confirmation/denial feed items that an admin can mark read.

create type inbox_event_kind_t as enum (
  'client_join_request',
  'client_joined',
  'client_denied'
);

create table public.inbox_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  kind inbox_event_kind_t not null,
  client_id uuid references public.clients(id) on delete cascade,
  -- The user the event is about (the joiner).
  actor_id uuid references public.profiles(user_id) on delete set null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index inbox_events_org_idx on public.inbox_events(organization_id, created_at desc);
create index inbox_events_client_idx on public.inbox_events(client_id);
create index inbox_events_actor_idx on public.inbox_events(actor_id);
create index inbox_events_unread_idx
  on public.inbox_events(organization_id) where read_at is null;

alter table public.inbox_events enable row level security;
-- Org staff read + mark-read + clear their org's inbox. Inserts happen via
-- the service-role client at join time (no staff session in that path).
create policy inbox_events_select on public.inbox_events
  for select using (is_org_staff(organization_id));
create policy inbox_events_update on public.inbox_events
  for update using (is_org_staff(organization_id))
  with check (is_org_staff(organization_id));
create policy inbox_events_delete on public.inbox_events
  for delete using (is_org_staff(organization_id));

insert into schema_migrations (version) values (38);
