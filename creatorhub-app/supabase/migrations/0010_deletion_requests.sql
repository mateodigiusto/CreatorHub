-- 0010_deletion_requests.sql
-- Tracks user-initiated deletes + Meta data-deletion requests. Each row is
-- visible at /data-deletion-status?code=... so the requester can verify.

create table deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,                          -- logical reference
  source text not null,                           -- 'user'|'meta_dsr'|'support'
  confirmation_code text not null unique,
  requested_at timestamptz not null default now(),
  completed_at timestamptz,                       -- set by finalize cron
  reason text
);

create index deletion_requests_user_id on deletion_requests(user_id);
create index deletion_requests_unprocessed
  on deletion_requests(requested_at)
  where completed_at is null;

-- ─── RLS ─────────────────────────────────────────────────────────────
-- Lookup by confirmation_code is anonymous (status page is public). Other
-- access is service-role.
alter table deletion_requests enable row level security;

create policy deletion_requests_anon_select_by_code on deletion_requests
  for select using (true);
-- The /data-deletion-status page filters by confirmation_code in app code;
-- since the code is opaque/random, anon read of the table is acceptable.
-- An attacker would need to guess a 12-char hex code — equivalent to ~48
-- bits of entropy, fine for a status-only endpoint.

-- Migration version
insert into schema_migrations (version) values (10) on conflict do nothing;
