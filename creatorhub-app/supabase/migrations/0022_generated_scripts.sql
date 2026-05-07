-- 0022_generated_scripts.sql
-- AI Script Generator output table. Each row is one generated script
-- with structured fields (hook / setup / key_points / cta / b_roll_notes)
-- so the UI can regenerate sections individually and the PDF renderer
-- can lay them out without reparsing prose.
--
-- Approval flow lives entirely in `status`:
--   draft → user reviews
--   approved → user clicked Approve; if linked_sequence_id is set the
--     script auto-populated the Calendar
--   used → script has been recorded/published; no further edits expected
--   archived → soft-deleted, hidden from default listings
--
-- Optional FKs:
--   source_analysis_id → which content_analyses row inspired this script
--   linked_sequence_id → calendar event created on approval
--   linked_post_id → published post that consumed this script

create type script_format_t as enum (
  'reel', 'longform', 'vsl', 'story_sequence', 'email'
);
create type script_status_t as enum (
  'draft', 'approved', 'used', 'archived'
);

create table generated_scripts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  source_analysis_id uuid references content_analyses(id) on delete set null,
  platform platform_t not null,
  format script_format_t not null,
  title text,
  hook text,
  setup text,
  /* jsonb: [{ title, body }, ...] — variable count of key points */
  key_points jsonb not null default '[]'::jsonb,
  cta text,
  b_roll_notes text,
  status script_status_t not null default 'draft',
  feedback text,
  linked_sequence_id uuid references sequences(id) on delete set null,
  linked_post_id uuid references posts(id) on delete set null,
  approved_at timestamptz,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger touch_generated_scripts_updated_at
  before update on generated_scripts
  for each row execute function trg_touch_updated_at();

create index generated_scripts_user_status_created_idx
  on generated_scripts(user_id, status, created_at desc);
create index generated_scripts_user_platform_idx
  on generated_scripts(user_id, platform);
create index generated_scripts_source_analysis_idx
  on generated_scripts(source_analysis_id)
  where source_analysis_id is not null;

alter table generated_scripts enable row level security;

create policy generated_scripts_self_select
  on generated_scripts for select using ((select auth.uid()) = user_id);
create policy generated_scripts_self_insert
  on generated_scripts for insert with check ((select auth.uid()) = user_id);
create policy generated_scripts_self_update
  on generated_scripts for update using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy generated_scripts_self_delete
  on generated_scripts for delete using ((select auth.uid()) = user_id);

insert into schema_migrations (version) values (22) on conflict do nothing;
