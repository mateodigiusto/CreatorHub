-- 0008_jobs.sql
-- Unified background-jobs table. One table, many kinds — sync, transcode,
-- publish, refresh_token, finalize_deletion, cleanup. Workers claim with
-- FOR UPDATE SKIP LOCKED; sweeper uses heartbeat_at, not claimed_at.

create table jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,                          -- logical only — no FK
                                                  -- (audit-style retention)
  kind job_kind_t not null,
  -- Per-kind FKs (nullable; only the relevant one is set).
  integration_id uuid references integrations(id) on delete cascade,
  asset_id uuid references assets(id) on delete cascade,
  post_id uuid references posts(id) on delete cascade,
  sub_type text,                                  -- 'full'|'incremental'|'backfill' for sync
  payload jsonb not null default '{}'::jsonb,    -- kind-specific args
  status job_status_t not null default 'queued',
  cursor jsonb,
  attempts int not null default 0,
  max_attempts int not null default 5,
  next_attempt_at timestamptz not null default now(),
  -- Observability only — sweeper does not use this.
  claimed_at timestamptz,
  -- Sweeper key. Workers bump every 30s while alive; sweeper reclaims jobs
  -- whose heartbeat_at is older than 90s.
  heartbeat_at timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  error_text text,
  created_at timestamptz not null default now()
);

-- Claim index: covers the queued-job lookup with kind filter.
create index jobs_status_kind_next_attempt
  on jobs(status, kind, next_attempt_at)
  where status in ('queued','running');

create index jobs_user_kind on jobs(user_id, kind);

-- Sweeper helper index
create index jobs_running_heartbeat
  on jobs(heartbeat_at)
  where status = 'running';

-- ─── RLS ─────────────────────────────────────────────────────────────
-- Service-role only. Users see job *status* via UI by joining sync_runs +
-- integrations (separate read paths). The jobs table itself is internal.
alter table jobs enable row level security;

create policy jobs_self_select on jobs
  for select using (user_id = auth.uid());
-- No write policies for app code; cron + workers use service role.

-- Migration version
insert into schema_migrations (version) values (8) on conflict do nothing;
