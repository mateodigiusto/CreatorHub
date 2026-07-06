-- 0027_creator_outreach_log.sql
-- Append-only log of every outreach the editor sends. Powers the
-- "previous outreach" panel on a creator detail page and the editor's
-- conversion tracking.
--
-- Append-only by RLS: SELECT + INSERT for the owning editor; no UPDATE
-- or DELETE policy. If outcomes need to evolve (no_response → responded
-- a week later), the editor logs a new row with method='followup' rather
-- than mutating history.
--
-- source_analysis_ids ties this row back to the transcripts the AI used
-- when drafting the message, so the editor can see "these are the videos
-- that informed the outreach" alongside the message.

create type outreach_method_t as enum (
  'dm', 'email', 'comment', 'followup', 'voice_note'
);
create type outreach_outcome_t as enum (
  'pending', 'no_response', 'declined', 'interested', 'converted'
);

create table creator_outreach_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  creator_id uuid not null references creator_directory(id) on delete cascade,
  target_id uuid references editor_creator_targets(id) on delete set null,
  outreach_method outreach_method_t not null,
  message_text text not null,
  /* Transcripts that informed the AI draft. Logical references; no FK
     so deleting a transcription doesn't bork the outreach record. */
  source_analysis_ids uuid[] not null default array[]::uuid[],
  outcome outreach_outcome_t not null default 'pending',
  outreach_date timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index creator_outreach_log_user_date_idx
  on creator_outreach_log(user_id, outreach_date desc);
create index creator_outreach_log_creator_idx
  on creator_outreach_log(creator_id, outreach_date desc);
create index creator_outreach_log_target_idx
  on creator_outreach_log(target_id)
  where target_id is not null;

alter table creator_outreach_log enable row level security;

create policy creator_outreach_log_self_select
  on creator_outreach_log for select using ((select auth.uid()) = user_id);
create policy creator_outreach_log_self_insert
  on creator_outreach_log for insert with check ((select auth.uid()) = user_id);
-- Intentionally no update/delete policy — append-only.

insert into schema_migrations (version) values (27) on conflict do nothing;
