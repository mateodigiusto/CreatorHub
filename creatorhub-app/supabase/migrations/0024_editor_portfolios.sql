-- 0024_editor_portfolios.sql
-- Editor Portfolio Builder. One private editing form (the user's own
-- portfolio) and one public-readable rendered page at /portfolio/[slug].
--
-- is_public gates the public read policy. While false the only reader
-- is the owner; flipping to true (via /api/portfolio/publish) makes the
-- row visible to anon — RLS does the gating, no separate cache layer.
--
-- slug is unique across the table; reserved slugs are enforced in the
-- API route, not the DB (to keep the reserved list editable without
-- migrations).

create table editor_portfolios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references users(id) on delete cascade,
  slug text not null,
  bio text,
  specialties text[] not null default array[]::text[],
  platforms platform_t[] not null default array[]::platform_t[],
  years_experience integer
    check (years_experience is null or (years_experience >= 0 and years_experience <= 80)),
  contact_email text,
  /* jsonb: { website?, twitter?, instagram?, youtube?, linkedin?, calendly? } */
  contact_links jsonb not null default '{}'::jsonb,
  /* jsonb: [{ video_url, description, results, thumbnail_url? }, ...] */
  work_samples jsonb not null default '[]'::jsonb,
  niche_tags text[] not null default array[]::text[],
  /* jsonb: [{ name, logo_url? }, ...] */
  client_logos jsonb not null default '[]'::jsonb,
  /* jsonb: [{ quote, attribution, link?, avatar_url? }, ...] */
  testimonials jsonb not null default '[]'::jsonb,
  is_public boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  /* Slug rules: 3-50 chars, lowercase letters/digits/hyphens, no leading/trailing hyphen. */
  check (slug ~ '^[a-z0-9](?:[a-z0-9-]{1,48}[a-z0-9])?$')
);

create unique index editor_portfolios_slug_uniq on editor_portfolios(lower(slug));

create trigger touch_editor_portfolios_updated_at
  before update on editor_portfolios
  for each row execute function trg_touch_updated_at();

alter table editor_portfolios enable row level security;

-- Owner: full CRUD.
create policy editor_portfolios_owner_select
  on editor_portfolios for select using ((select auth.uid()) = user_id);
create policy editor_portfolios_owner_insert
  on editor_portfolios for insert with check ((select auth.uid()) = user_id);
create policy editor_portfolios_owner_update
  on editor_portfolios for update using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy editor_portfolios_owner_delete
  on editor_portfolios for delete using ((select auth.uid()) = user_id);

-- Public read when published. Anon role + authenticated other-users.
-- NOTE: Collapsed in 0029 into a single combined policy for advisor compliance.
create policy editor_portfolios_public_select
  on editor_portfolios for select
  to anon, authenticated
  using (is_public = true);

insert into schema_migrations (version) values (24) on conflict do nothing;
