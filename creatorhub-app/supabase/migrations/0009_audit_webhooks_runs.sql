-- 0009_audit_webhooks_runs.sql
-- Three operational tables that don't fit any other migration:
-- audit_log, webhook_events, sync_runs.

-- ─── audit_log ────────────────────────────────────────────────────────
-- Logical user_id (no FK) so rows survive 1 year past hard-delete with the
-- user_id replaced by a hashed synthetic uuid.
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,                          -- logical reference only
  actor text not null,                            -- 'user'|'system'|'cron'|'webhook'
  action text not null,                           -- e.g. 'post.published'
  target_type text,
  target_id text,
  metadata jsonb,
  ip inet,
  user_agent text,
  at timestamptz not null default now()
);

create index audit_log_user_at_desc on audit_log(user_id, at desc);
create index audit_log_action on audit_log(action, at desc);

-- RLS: users can read their own audit. No app-side writes (service role + the
-- withAudit wrapper).
alter table audit_log enable row level security;

create policy audit_log_self_select on audit_log
  for select using (user_id = auth.uid());

-- ─── webhook_events ──────────────────────────────────────────────────
-- Idempotency. Meta retries aggressively; processing the same event twice
-- can republish posts or double-charge. unique(provider, external_id)
-- guarantees one row per platform-event-id; the worker checks
-- processed_at IS NULL before doing work.
create table webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider platform_t not null,
  external_id text not null,
  payload jsonb not null,
  signature_verified boolean not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  process_error text,
  unique (provider, external_id)
);

create index webhook_events_provider_received
  on webhook_events(provider, received_at desc);

-- Service-role only.
alter table webhook_events enable row level security;

-- ─── sync_runs ───────────────────────────────────────────────────────
-- One row per sync-job attempt. Surfaces "last synced" UX honestly.
create table sync_runs (
  id uuid primary key default gen_random_uuid(),
  integration_id uuid not null references integrations(id) on delete cascade,
  job_id uuid references jobs(id) on delete set null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null,                           -- 'running'|'success'|'failed'
  pages_fetched int default 0,
  posts_upserted int default 0,
  cursor jsonb,
  error_text text
);

create index sync_runs_integration_started_desc
  on sync_runs(integration_id, started_at desc);

alter table sync_runs enable row level security;

create policy sync_runs_self_select on sync_runs
  for select using (
    exists (
      select 1 from integrations i
      where i.id = sync_runs.integration_id
        and i.user_id = auth.uid()
    )
  );

-- Migration version
insert into schema_migrations (version) values (9) on conflict do nothing;
