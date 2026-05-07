-- 0021_content_analyses_expansion.sql
-- Expand content_analyses for the Transcription Engine. Adds the richer
-- output fields the new /content-dna sub-tabs render (hook analysis,
-- themes, tone, cta, content score, "what to steal"), plus the input
-- discriminator (url | username | upload) so a single table powers all
-- three Transcribe inputs.
--
-- Backwards-compatible: every existing row stays valid. New columns are
-- nullable; source_kind backfills to 'url' (the only input mode today).
-- source_url loses its NOT NULL constraint because username / upload
-- flows insert the row before a resolved URL exists.

-- 1. New enum for the input discriminator.
create type source_kind_t as enum ('url', 'username', 'upload');

-- 2. Add columns. All nullable so legacy rows remain valid.
alter table content_analyses
  add column source_kind source_kind_t not null default 'url',
  add column source_handle text,
  add column upload_asset_id uuid references assets(id) on delete set null,
  add column hook_analysis jsonb,
  add column themes text[] not null default array[]::text[],
  add column tone text,
  add column cta text,
  add column content_score numeric(3,1)
    check (content_score is null or (content_score >= 0 and content_score <= 10)),
  add column steal_notes text;

-- 3. source_url is no longer required — username/upload flows defer it.
alter table content_analyses alter column source_url drop not null;

-- 4. Indexes for the new query patterns.
--    GIN on themes for filtering by theme (Competitor Research).
--    Filtered index for History sort by source_kind.
create index content_analyses_themes_gin on content_analyses using gin (themes);
create index content_analyses_user_kind_created_idx
  on content_analyses(user_id, source_kind, created_at desc);

insert into schema_migrations (version) values (21) on conflict do nothing;
