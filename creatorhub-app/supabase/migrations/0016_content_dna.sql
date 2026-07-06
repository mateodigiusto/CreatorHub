-- Content DNA Engine — analyses + drafts.
--
-- Step 1 (Import) writes a content_analyses row. Step 3 (Build) writes
-- a content_drafts row keyed to that analysis. Step 2 (Rebuild) is read-only
-- — variations live as jsonb on content_analyses.
--
-- Outputs are stubbed today (deterministic by URL hash); when real LLM
-- calls land, only the analyze + draft API routes change.

create type analysis_status_t as enum ('analyzing','ready','failed');
create type source_platform_t as enum ('youtube','instagram','tiktok','other');

create table content_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  source_url text not null,
  source_platform source_platform_t not null,
  source_title text,
  source_creator text,
  source_thumbnail text,
  transcription text,
  hook text,
  /* jsonb shapes (kept loose for stub flexibility):
     structure: [{ name, timestamp, description }, ...]
     why_it_worked: { hook_psychology, retention_triggers, emotional_pattern, story_structure }
     variations: { hooks: string[], angles: string[], titles: string[] } */
  structure jsonb,
  why_it_worked jsonb,
  variations jsonb,
  status analysis_status_t not null default 'analyzing',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger touch_updated_at before update on content_analyses
  for each row execute function trg_touch_updated_at();

create index content_analyses_user_created_idx
  on content_analyses(user_id, created_at desc);

alter table content_analyses enable row level security;

create policy "content_analyses self select"
  on content_analyses for select using ((select auth.uid()) = user_id);
create policy "content_analyses self insert"
  on content_analyses for insert with check ((select auth.uid()) = user_id);
create policy "content_analyses self update"
  on content_analyses for update using ((select auth.uid()) = user_id);
create policy "content_analyses self delete"
  on content_analyses for delete using ((select auth.uid()) = user_id);

create table content_drafts (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references content_analyses(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  angle text,
  audience text,
  target_platform text,
  tone text,
  script text,
  /* jsonb shapes:
     hooks: string[]
     shots: [{ description, duration_seconds }, ...]
     captions: string[] */
  hooks jsonb,
  shots jsonb,
  captions jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger touch_updated_at before update on content_drafts
  for each row execute function trg_touch_updated_at();

create index content_drafts_analysis_idx on content_drafts(analysis_id);
create index content_drafts_user_created_idx
  on content_drafts(user_id, created_at desc);

alter table content_drafts enable row level security;

create policy "content_drafts self select"
  on content_drafts for select using ((select auth.uid()) = user_id);
create policy "content_drafts self insert"
  on content_drafts for insert with check ((select auth.uid()) = user_id);
create policy "content_drafts self update"
  on content_drafts for update using ((select auth.uid()) = user_id);
create policy "content_drafts self delete"
  on content_drafts for delete using ((select auth.uid()) = user_id);

insert into schema_migrations (version) values (16) on conflict do nothing;
