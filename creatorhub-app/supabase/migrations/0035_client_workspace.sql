-- 0035_client_workspace.sql
-- Phase 3 of the Agency Clients pivot — the long-form data layer for a client.
--
-- DEPENDS ON: 0033_organizations.sql (organizations, is_org_staff,
-- is_org_admin) and 0034_agency_clients.sql (clients, client_memberships,
-- has_client_access). Do not apply until both land.
--
-- All tables are RLS-enabled. RLS prevents cross-tenant leaks; fine-grained
-- role checks (e.g. "only directors edit internal_notes") live in route
-- handlers, not RLS. Both org_id and client_id are stored on every row so
-- RLS can short-circuit via is_org_staff(organization_id) without joining.

-- ─── Enums ────────────────────────────────────────────────────────────
create type content_status_t      as enum ('idea','script','film','edit','post');
create type content_type_t        as enum ('reel','story','carousel','short','long_form','image','other');
create type bunny_video_status_t  as enum ('uploading','processing','ready','failed');
create type visibility_t          as enum ('internal','client_visible');
create type asset_category_t      as enum ('journey','pictures','videos','raw','published','other');
create type review_status_t       as enum ('draft','in_review','changes_requested','approved');
create type task_status_t         as enum ('todo','doing','blocked','done');
create type metric_source_t       as enum ('manual','instagram_api');
create type folder_scope_t        as enum ('asset','sop');

-- ─── brand_profiles ───────────────────────────────────────────────────
-- 1:1 with clients. Houses both Brand Build (14 fields) and Strategy
-- (4 next-steps fields) on the same row to keep the AI analyzer's write
-- path single-table.
create table public.brand_profiles (
  client_id uuid primary key references public.clients(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  -- Brand Build (14 long-form fields)
  bio text,
  mission text,
  vision text,
  values_text text,
  voice text,
  visual_style text,
  audience_persona text,
  audience_pain_points text,
  unique_value_prop text,
  positioning_statement text,
  content_pillars text[] not null default '{}',
  flagship_offer text,
  signature_format text,
  do_not_post text,
  -- Strategy (4 next-steps fields, same row)
  next_steps_goal text,
  next_steps_focus text,
  next_steps_metrics text,
  next_steps_blockers text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index brand_profiles_org_idx on public.brand_profiles(organization_id);
create trigger trg_touch_brand_profiles before update on public.brand_profiles
  for each row execute function trg_touch_updated_at();

alter table public.brand_profiles enable row level security;
create policy brand_profiles_select on public.brand_profiles for select using (
  is_org_staff(organization_id)
  or (has_client_access(client_id))
);
create policy brand_profiles_write on public.brand_profiles for all
  using (is_org_staff(organization_id))
  with check (is_org_staff(organization_id));

-- ─── client_internal_notes ────────────────────────────────────────────
-- Staff-only scratch pad. Stripped of has_client_access in policies.
create table public.client_internal_notes (
  client_id uuid primary key references public.clients(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  body text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index client_internal_notes_org_idx on public.client_internal_notes(organization_id);
create trigger trg_touch_client_internal_notes before update on public.client_internal_notes
  for each row execute function trg_touch_updated_at();

alter table public.client_internal_notes enable row level security;
-- No has_client_access — client-side users must never read or write.
create policy internal_notes_select on public.client_internal_notes for select using (is_org_staff(organization_id));
create policy internal_notes_write on public.client_internal_notes for all
  using (is_org_staff(organization_id))
  with check (is_org_staff(organization_id));

-- ─── content_items ────────────────────────────────────────────────────
-- The 5-status pipeline. `position` is a float so dnd-kit reorders are O(1)
-- (compute midpoint between neighbors).
create table public.content_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  status content_status_t not null default 'idea',
  content_type content_type_t not null default 'reel',
  title text not null default '',
  hook_a text,
  hook_b text,
  hook_c text,
  script text,
  caption text,
  visual_notes text,
  bunny_video_id text,
  bunny_video_status bunny_video_status_t,
  bunny_video_duration_seconds numeric(6,2),
  planned_post_date date,
  published_at timestamptz,
  position double precision not null default 0,
  visibility visibility_t not null default 'client_visible',
  created_by uuid references public.profiles(user_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index content_items_client_status_idx on public.content_items(client_id, status);
create index content_items_client_date_idx on public.content_items(client_id, planned_post_date);
create index content_items_org_idx on public.content_items(organization_id);
create trigger trg_touch_content_items before update on public.content_items
  for each row execute function trg_touch_updated_at();

alter table public.content_items enable row level security;
create policy content_items_select on public.content_items for select using (
  is_org_staff(organization_id)
  or (has_client_access(client_id) and visibility = 'client_visible')
);
create policy content_items_write on public.content_items for all
  using (is_org_staff(organization_id))
  with check (is_org_staff(organization_id));

-- ─── content_comments ────────────────────────────────────────────────
-- Threaded comments. Attaches to a content_item OR an asset_video (defined
-- below). Exactly one of (content_item_id, asset_video_id) is set.
create table public.content_comments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  content_item_id uuid references public.content_items(id) on delete cascade,
  asset_video_id uuid,  -- FK added below after asset_videos exists
  parent_id uuid references public.content_comments(id) on delete cascade,
  author_id uuid references public.profiles(user_id),
  body text not null,
  is_internal boolean not null default false,
  timestamp_seconds numeric(8,2),  -- for video timestamp anchors
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (content_item_id is not null)::int + (asset_video_id is not null)::int = 1
  )
);
create index content_comments_content_idx on public.content_comments(content_item_id);
create index content_comments_video_idx on public.content_comments(asset_video_id);
create index content_comments_parent_idx on public.content_comments(parent_id);
create trigger trg_touch_content_comments before update on public.content_comments
  for each row execute function trg_touch_updated_at();

alter table public.content_comments enable row level security;
create policy content_comments_select on public.content_comments for select using (
  is_org_staff(organization_id)
  or (has_client_access(client_id) and is_internal = false)
);
create policy content_comments_write on public.content_comments for all
  using (
    is_org_staff(organization_id)
    or (has_client_access(client_id) and is_internal = false)
  )
  with check (
    is_org_staff(organization_id)
    or (has_client_access(client_id) and is_internal = false)
  );

-- ─── content_metrics ─────────────────────────────────────────────────
create table public.content_metrics (
  content_item_id uuid primary key references public.content_items(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  views bigint not null default 0,
  likes bigint not null default 0,
  comments_count bigint not null default 0,
  shares bigint not null default 0,
  saves bigint not null default 0,
  reach bigint,
  impressions bigint,
  source metric_source_t not null default 'manual',
  captured_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index content_metrics_client_idx on public.content_metrics(client_id);
create trigger trg_touch_content_metrics before update on public.content_metrics
  for each row execute function trg_touch_updated_at();

alter table public.content_metrics enable row level security;
create policy content_metrics_select on public.content_metrics for select using (
  is_org_staff(organization_id) or has_client_access(client_id)
);
create policy content_metrics_write on public.content_metrics for all
  using (is_org_staff(organization_id))
  with check (is_org_staff(organization_id));

-- ─── metric_snapshots ────────────────────────────────────────────────
-- Daily follower count rollup. Unique by (client, day) so a re-sync is
-- idempotent.
create table public.metric_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  captured_on date not null,
  followers_count bigint,
  source metric_source_t not null default 'manual',
  created_at timestamptz not null default now(),
  unique (client_id, captured_on)
);
create index metric_snapshots_client_date_idx on public.metric_snapshots(client_id, captured_on desc);

alter table public.metric_snapshots enable row level security;
create policy metric_snapshots_select on public.metric_snapshots for select using (
  is_org_staff(organization_id) or has_client_access(client_id)
);
create policy metric_snapshots_write on public.metric_snapshots for all
  using (is_org_staff(organization_id))
  with check (is_org_staff(organization_id));

-- ─── folders ─────────────────────────────────────────────────────────
-- Tree of folders, scoped per client. parent_id null = root. scope tells
-- the UI whether it's an asset folder or a SOP folder.
create table public.folders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  parent_id uuid references public.folders(id) on delete cascade,
  name text not null,
  scope folder_scope_t not null default 'asset',
  visibility visibility_t not null default 'internal',
  created_by uuid references public.profiles(user_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index folders_client_parent_idx on public.folders(client_id, parent_id);
create trigger trg_touch_folders before update on public.folders
  for each row execute function trg_touch_updated_at();

alter table public.folders enable row level security;
create policy folders_select on public.folders for select using (
  is_org_staff(organization_id)
  or (has_client_access(client_id) and visibility = 'client_visible')
);
create policy folders_write on public.folders for all
  using (is_org_staff(organization_id))
  with check (is_org_staff(organization_id));

-- ─── asset_links ─────────────────────────────────────────────────────
create table public.asset_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  folder_id uuid references public.folders(id) on delete set null,
  title text not null,
  url text not null,
  category asset_category_t not null default 'other',
  visibility visibility_t not null default 'internal',
  created_by uuid references public.profiles(user_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index asset_links_client_category_idx on public.asset_links(client_id, category);
create index asset_links_folder_idx on public.asset_links(folder_id);
create trigger trg_touch_asset_links before update on public.asset_links
  for each row execute function trg_touch_updated_at();

alter table public.asset_links enable row level security;
create policy asset_links_select on public.asset_links for select using (
  is_org_staff(organization_id)
  or (has_client_access(client_id) and visibility = 'client_visible')
);
create policy asset_links_write on public.asset_links for all
  using (is_org_staff(organization_id))
  with check (is_org_staff(organization_id));

-- ─── asset_videos ────────────────────────────────────────────────────
-- Per Phase-3 scope, Bunny columns exist but uploads land in Phase 5.
create table public.asset_videos (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  folder_id uuid references public.folders(id) on delete set null,
  title text not null,
  bunny_video_id text,
  bunny_video_status bunny_video_status_t not null default 'uploading',
  bunny_video_duration_seconds numeric(6,2),
  review_status review_status_t not null default 'draft',
  visibility visibility_t not null default 'internal',
  created_by uuid references public.profiles(user_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index asset_videos_client_review_idx on public.asset_videos(client_id, review_status);
create index asset_videos_folder_idx on public.asset_videos(folder_id);
create trigger trg_touch_asset_videos before update on public.asset_videos
  for each row execute function trg_touch_updated_at();

alter table public.asset_videos enable row level security;
create policy asset_videos_select on public.asset_videos for select using (
  is_org_staff(organization_id)
  or (has_client_access(client_id) and visibility = 'client_visible')
);
create policy asset_videos_write on public.asset_videos for all
  using (is_org_staff(organization_id))
  with check (is_org_staff(organization_id));

-- Now that asset_videos exists, hook the deferred FK on content_comments.
alter table public.content_comments
  add constraint content_comments_asset_video_fk
  foreign key (asset_video_id) references public.asset_videos(id) on delete cascade;

-- ─── meeting_notes ───────────────────────────────────────────────────
create table public.meeting_notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  meeting_date date not null,
  title text not null,
  body text,
  attendees text,
  action_items text,
  visibility visibility_t not null default 'internal',
  created_by uuid references public.profiles(user_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index meeting_notes_client_date_idx on public.meeting_notes(client_id, meeting_date desc);
create trigger trg_touch_meeting_notes before update on public.meeting_notes
  for each row execute function trg_touch_updated_at();

alter table public.meeting_notes enable row level security;
create policy meeting_notes_select on public.meeting_notes for select using (
  is_org_staff(organization_id)
  or (has_client_access(client_id) and visibility = 'client_visible')
);
create policy meeting_notes_write on public.meeting_notes for all
  using (is_org_staff(organization_id))
  with check (is_org_staff(organization_id));

-- ─── tasks ───────────────────────────────────────────────────────────
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  title text not null,
  description text,
  status task_status_t not null default 'todo',
  due_date date,
  assigned_to uuid references public.profiles(user_id),
  visibility visibility_t not null default 'internal',
  created_by uuid references public.profiles(user_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tasks_client_status_idx on public.tasks(client_id, status);
create index tasks_assigned_idx on public.tasks(assigned_to);
create trigger trg_touch_tasks before update on public.tasks
  for each row execute function trg_touch_updated_at();

alter table public.tasks enable row level security;
create policy tasks_select on public.tasks for select using (
  is_org_staff(organization_id)
  or (has_client_access(client_id) and visibility = 'client_visible')
);
create policy tasks_write on public.tasks for all
  using (
    is_org_staff(organization_id)
    or (has_client_access(client_id) and visibility = 'client_visible')
  )
  with check (
    is_org_staff(organization_id)
    or (has_client_access(client_id) and visibility = 'client_visible')
  );

insert into schema_migrations (version) values (35);
