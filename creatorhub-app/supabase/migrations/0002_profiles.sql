-- 0002_profiles.sql
-- 1:1 with users. Stores the onboarding wizard's answers — the source of
-- truth for personalization across Sidebar, Dashboard, Sequence Studio, etc.

create table profiles (
  user_id uuid primary key references users(id) on delete cascade,
  -- Identity (optional; falls back to creator-type-derived defaults)
  display_name text,
  handle text,
  avatar_url text,
  -- Core personalization
  creator_type text not null,
  niche text not null,
  primary_goal text not null,
  secondary_goals text[] not null default array[]::text[],
  platforms text[] not null default array[]::text[],
  content_formats text[] not null default array[]::text[],
  frequency text,
  planning_workflow text[] not null default array[]::text[],
  biggest_problem text,
  audience_who text,
  audience_wants text,
  audience_problem text,
  selling text[] not null default array[]::text[],
  offer_name text,
  cta_style text,
  custom_cta text,
  brand_tones text[] not null default array[]::text[],
  sequence_uses text[] not null default array[]::text[],
  wants_niche_presets boolean not null default true,
  asset_types text[] not null default array[]::text[],
  reports_needs text[] not null default array[]::text[],
  team text,
  start_mode text not null default 'demo',
  -- Schedule timezone for creator-local "post at 9am" UX. IANA zone name.
  timezone text not null default 'UTC',
  -- Onboarding-answers schema version. Bumped when types.ts adds/removes
  -- fields; the localStorage migration step refuses to import incompatible
  -- versions.
  schema_version int not null default 1,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger touch_profiles_updated_at
  before update on profiles
  for each row execute function trg_touch_updated_at();

-- ─── RLS ─────────────────────────────────────────────────────────────
alter table profiles enable row level security;

create policy profiles_self_select on profiles
  for select using (user_id = auth.uid());

create policy profiles_self_insert on profiles
  for insert with check (user_id = auth.uid());

create policy profiles_self_update on profiles
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Migration version
insert into schema_migrations (version) values (2) on conflict do nothing;
