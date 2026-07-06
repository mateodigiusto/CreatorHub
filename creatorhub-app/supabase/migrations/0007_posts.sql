-- 0007_posts.sql
-- Single posts table for both imported (from sync) and native (created in
-- CreatorHub) posts. source enum + lifecycle_state enum keep them
-- distinguished; unified queries everywhere else.

create table posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  -- Nullable: native posts (drafts) start without an integration; published
  -- posts always have one. ON DELETE SET NULL covers user-disconnects-but-
  -- doesn't-delete-account; full account deletion removes the row.
  integration_id uuid references integrations(id) on delete set null,
  platform platform_t not null,
  -- Platform's post id. Null while the post is a draft / publishing.
  external_id text,
  source post_source_t not null,
  type text,                                     -- 'reel'|'carousel'|'story'|'static'|'longform'
  lifecycle_state post_lifecycle_t not null,
  caption text,
  thumbnail_url text,
  scheduled_at timestamptz,
  scheduled_at_timezone text,
  published_at timestamptz,
  reach int,
  likes int,
  comments int,
  saves int,
  shares int,
  engagement_rate numeric,
  imported_at timestamptz,
  last_insight_sync_at timestamptz,
  publish_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger touch_posts_updated_at
  before update on posts
  for each row execute function trg_touch_updated_at();

-- Indexes (per plan spec)
create index posts_user_published_desc on posts(user_id, published_at desc)
  where published_at is not null;
create index posts_user_scheduled on posts(user_id, scheduled_at)
  where lifecycle_state = 'scheduled';
-- Upsert key for sync workers. NULL external_id is excluded so drafts don't
-- conflict with each other.
create unique index posts_user_integration_external
  on posts(user_id, integration_id, external_id)
  where external_id is not null;

-- ─── RLS ─────────────────────────────────────────────────────────────
alter table posts enable row level security;

create policy posts_self_select on posts
  for select using (user_id = auth.uid());

create policy posts_self_insert on posts
  for insert with check (user_id = auth.uid());

create policy posts_self_update on posts
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy posts_self_delete on posts
  for delete using (user_id = auth.uid());

-- Migration version
insert into schema_migrations (version) values (7) on conflict do nothing;
