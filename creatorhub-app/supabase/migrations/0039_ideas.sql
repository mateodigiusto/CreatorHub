-- 0039_ideas.sql
-- User-owned idea bank — the hooks/angles a creator has collected from
-- transcripts they analyzed, manual brainstorming, or AI suggestions.
--
-- /ideas was an empty stub before this. With v39 the bank persists, so
-- "Add hook to Idea Bank" from /content-dna/[id] actually lands somewhere
-- the user can revisit.
--
-- Self-CRUD via RLS. source_analysis_id is a soft FK (ON DELETE SET NULL)
-- so deleting a transcript doesn't erase ideas it inspired.

create table ideas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  /* The hook itself — the one line the creator would lead with. */
  hook text not null check (length(hook) > 0 and length(hook) <= 500),
  /* Optional angle / context (a paragraph of how the idea would play out). */
  angle text check (angle is null or length(angle) <= 2000),
  /* Where it came from — links back to the breakdown that inspired it. */
  source_analysis_id uuid references content_analyses(id) on delete set null,
  /* Optional snapshot of the source URL at save time. Survives transcript
     deletion since source_analysis_id is set null on cascade. */
  source_url text,
  /* Optional ML-derived numbers for sorting / surfacing the strongest ones. */
  estimated_reach text,
  score numeric(3, 1) check (score is null or (score >= 0 and score <= 10)),
  /* "Saved" tab vs "All" — same UX as the legacy demo had. */
  saved boolean not null default false,
  /* Marked once the idea has been turned into a script / sequence. Helps
     filter out the ones already shipped. */
  used boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger touch_ideas_updated_at
  before update on ideas
  for each row execute function trg_touch_updated_at();

alter table ideas enable row level security;

create policy ideas_self_select
  on ideas for select using ((select auth.uid()) = user_id);
create policy ideas_self_insert
  on ideas for insert with check ((select auth.uid()) = user_id);
create policy ideas_self_update
  on ideas for update using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy ideas_self_delete
  on ideas for delete using ((select auth.uid()) = user_id);

/* Most-recent-first listing on /ideas. */
create index ideas_user_created_desc on ideas (user_id, created_at desc);
/* Fast filter for the "Saved" tab (partial index keeps it small). */
create index ideas_user_saved
  on ideas (user_id, created_at desc)
  where saved = true;
/* Useful when listing all ideas tied to a specific transcript. */
create index ideas_source_analysis
  on ideas (source_analysis_id)
  where source_analysis_id is not null;

insert into schema_migrations (version) values (39) on conflict do nothing;
