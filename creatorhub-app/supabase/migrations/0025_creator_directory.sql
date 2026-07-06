-- 0025_creator_directory.sql
-- Curated global directory of creators that editors can browse to find
-- pitch targets. Maintained by the CreatorHub team via an internal admin
-- route (gated by ADMIN_EMAILS env var, not RLS).
--
-- Read-mostly: every authenticated user can SELECT. Writes go through
-- the service role only (no INSERT/UPDATE/DELETE policy for authenticated
-- — defaults to deny under RLS).
--
-- Dedup: one row per (handle, primary platform). Uniqueness uses lower()
-- on the handle so casing collisions ("@HubermanLab" vs "@hubermanlab")
-- still dedupe.

create type follower_range_t as enum (
  'under_10k', '10k_50k', '50k_250k', '250k_1m', 'over_1m'
);
create type posting_frequency_t as enum (
  'rarely', 'weekly', 'few_per_week', 'daily', 'multi_daily'
);

create table creator_directory (
  id uuid primary key default gen_random_uuid(),
  handle text not null,
  display_name text,
  primary_platform platform_t not null,
  niche text not null,
  follower_range follower_range_t,
  platforms platform_t[] not null default array[]::platform_t[],
  posting_frequency posting_frequency_t,
  bio text,
  avatar_url text,
  /* jsonb: { engagement_rate?, content_themes?, language?, region?, notes? } */
  metadata jsonb not null default '{}'::jsonb,
  /* Source-tracking for audit; not user-facing. */
  curated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index creator_directory_handle_platform_uniq
  on creator_directory(lower(handle), primary_platform);

create index creator_directory_niche_idx
  on creator_directory(niche);
create index creator_directory_follower_range_idx
  on creator_directory(follower_range)
  where follower_range is not null;

create trigger touch_creator_directory_updated_at
  before update on creator_directory
  for each row execute function trg_touch_updated_at();

alter table creator_directory enable row level security;

-- Any signed-in user can browse. Anon cannot — the directory is a
-- subscription perk for editors.
create policy creator_directory_authenticated_select
  on creator_directory for select
  to authenticated
  using (true);

-- No INSERT/UPDATE/DELETE policies → service-role-only writes.

insert into schema_migrations (version) values (25) on conflict do nothing;
