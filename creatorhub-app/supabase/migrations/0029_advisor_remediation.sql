-- 0029_advisor_remediation.sql
-- Remediation for advisor issues introduced by v21-v28:
--   1. trg_touch_target_status_change had a mutable search_path (security WARN).
--      Lock it to pg_catalog, public — same pattern as v18's helper functions.
--   2. Four FKs without covering indexes (perf INFO, but cascade-relevant).
--   3. editor_portfolios had two overlapping SELECT policies (perf WARN).
--      Consolidate into one policy that ORs owner-access + is_public.

-- 1. Lock trigger function's search_path.
create or replace function trg_touch_target_status_change()
returns trigger language plpgsql
set search_path = pg_catalog, public as $$
begin
  if new.status is distinct from old.status then
    new.last_status_change_at := now();
  end if;
  return new;
end $$;

-- 2. Covering indexes for cascade-relevant FKs.
create index content_analyses_upload_asset_idx
  on content_analyses(upload_asset_id)
  where upload_asset_id is not null;

create index editor_creator_targets_creator_idx
  on editor_creator_targets(creator_id);

create index generated_scripts_linked_sequence_idx
  on generated_scripts(linked_sequence_id)
  where linked_sequence_id is not null;

create index generated_scripts_linked_post_idx
  on generated_scripts(linked_post_id)
  where linked_post_id is not null;

-- 3. Collapse editor_portfolios SELECT policies. The OR'd version evaluates
--    both branches in a single policy pass instead of running two policies
--    sequentially per query.
drop policy editor_portfolios_owner_select on editor_portfolios;
drop policy editor_portfolios_public_select on editor_portfolios;

create policy editor_portfolios_select
  on editor_portfolios for select
  to anon, authenticated
  using (is_public = true or (select auth.uid()) = user_id);

insert into schema_migrations (version) values (29) on conflict do nothing;
