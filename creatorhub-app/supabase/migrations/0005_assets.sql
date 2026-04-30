-- 0005_assets.sql
-- Photos + short videos. Originals live in Supabase Storage; transcoded
-- video variants live in Cloudflare Stream and are referenced via the
-- transcoded_variants jsonb column.

create table assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  kind asset_kind_t not null,
  title text not null,
  mood text,
  scene text,
  aesthetic_score numeric,
  tags text[] not null default array[]::text[],
  duration_seconds numeric,
  -- Supabase Storage path: bucket-relative key.
  storage_key text not null,
  thumbnail_storage_key text,
  -- Transcoded variants. Consumer state machine (see plan):
  --   ready_at !== null && error === null  → playable
  --   error !== null                        → 'transcode failed' UX
  --   neither set                           → 'processing' UX
  -- Read only via the assetState() helper; ESLint blocks direct field reads.
  transcoded_variants jsonb,
  source text not null default 'upload',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger touch_assets_updated_at
  before update on assets
  for each row execute function trg_touch_updated_at();

create index assets_user_created_desc on assets(user_id, created_at desc);

-- ─── RLS ─────────────────────────────────────────────────────────────
alter table assets enable row level security;

create policy assets_self_select on assets
  for select using (user_id = auth.uid());

create policy assets_self_insert on assets
  for insert with check (user_id = auth.uid());

create policy assets_self_update on assets
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy assets_self_delete on assets
  for delete using (user_id = auth.uid());

-- Migration version
insert into schema_migrations (version) values (5) on conflict do nothing;
