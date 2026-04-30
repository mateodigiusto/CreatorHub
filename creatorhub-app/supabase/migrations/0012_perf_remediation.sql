-- 0012_perf_remediation.sql
-- Address performance advisor findings:
--   - auth_rls_initplan: rewrite every RLS policy to use (select auth.uid())
--     instead of auth.uid() so Postgres caches the value per-query.
--   - unindexed_foreign_keys: add covering indexes for FK columns where
--     cascade-delete and joins are expected to run hot.

-- ─── RLS policy rewrites ────────────────────────────────────────────
-- Postgres pattern: replace `auth.uid()` with `(select auth.uid())` —
-- the subquery is evaluated once per query, not per row, when the
-- planner recognizes the InitPlan opportunity.

-- users
drop policy users_self_read on users;
drop policy users_self_update on users;
create policy users_self_read on users
  for select using (id = (select auth.uid()));
create policy users_self_update on users
  for update using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- profiles
drop policy profiles_self_select on profiles;
drop policy profiles_self_insert on profiles;
drop policy profiles_self_update on profiles;
create policy profiles_self_select on profiles
  for select using (user_id = (select auth.uid()));
create policy profiles_self_insert on profiles
  for insert with check (user_id = (select auth.uid()));
create policy profiles_self_update on profiles
  for update using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- integrations
drop policy integrations_self_select on integrations;
create policy integrations_self_select on integrations
  for select using (user_id = (select auth.uid()));

-- assets
drop policy assets_self_select on assets;
drop policy assets_self_insert on assets;
drop policy assets_self_update on assets;
drop policy assets_self_delete on assets;
create policy assets_self_select on assets
  for select using (user_id = (select auth.uid()));
create policy assets_self_insert on assets
  for insert with check (user_id = (select auth.uid()));
create policy assets_self_update on assets
  for update using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy assets_self_delete on assets
  for delete using (user_id = (select auth.uid()));

-- sequences
drop policy sequences_self_select on sequences;
drop policy sequences_self_insert on sequences;
drop policy sequences_self_update on sequences;
drop policy sequences_self_delete on sequences;
create policy sequences_self_select on sequences
  for select using (user_id = (select auth.uid()));
create policy sequences_self_insert on sequences
  for insert with check (user_id = (select auth.uid()));
create policy sequences_self_update on sequences
  for update using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy sequences_self_delete on sequences
  for delete using (user_id = (select auth.uid()));

-- posts
drop policy posts_self_select on posts;
drop policy posts_self_insert on posts;
drop policy posts_self_update on posts;
drop policy posts_self_delete on posts;
create policy posts_self_select on posts
  for select using (user_id = (select auth.uid()));
create policy posts_self_insert on posts
  for insert with check (user_id = (select auth.uid()));
create policy posts_self_update on posts
  for update using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy posts_self_delete on posts
  for delete using (user_id = (select auth.uid()));

-- jobs
drop policy jobs_self_select on jobs;
create policy jobs_self_select on jobs
  for select using (user_id = (select auth.uid()));

-- audit_log
drop policy audit_log_self_select on audit_log;
create policy audit_log_self_select on audit_log
  for select using (user_id = (select auth.uid()));

-- sync_runs
drop policy sync_runs_self_select on sync_runs;
create policy sync_runs_self_select on sync_runs
  for select using (
    exists (
      select 1 from integrations i
      where i.id = sync_runs.integration_id
        and i.user_id = (select auth.uid())
    )
  );

-- ─── FK covering indexes ────────────────────────────────────────────
-- Cascade-delete performance + join performance.

create index if not exists jobs_asset_id on jobs(asset_id) where asset_id is not null;
create index if not exists jobs_integration_id on jobs(integration_id) where integration_id is not null;
create index if not exists jobs_post_id on jobs(post_id) where post_id is not null;
create index if not exists oauth_states_user_id on oauth_states(user_id);
create index if not exists posts_integration_id on posts(integration_id) where integration_id is not null;
create index if not exists sync_runs_job_id on sync_runs(job_id) where job_id is not null;

insert into schema_migrations (version) values (12) on conflict do nothing;
