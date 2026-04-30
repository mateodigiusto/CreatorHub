-- 0003_oauth_states.sql
-- Server-side OAuth state for CSRF + PKCE. Required for App Review.
-- Atomic consume + expiry check happens via:
--   UPDATE ... SET consumed_at = now()
--   WHERE state = $1 AND consumed_at IS NULL AND expires_at > now()
--   RETURNING ...
-- Zero rows = reject.

create table oauth_states (
  state text primary key,
  user_id uuid not null references users(id) on delete cascade,
  platform platform_t not null,
  -- PKCE: hash of the verifier we generated. Stored hashed so a leaked DB
  -- can't replay live OAuth flows.
  code_verifier_hash text,
  redirect_uri text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index oauth_states_expires_at on oauth_states(expires_at);

-- ─── RLS ─────────────────────────────────────────────────────────────
-- This table is service-role only; no app-side reads. Kept outside RLS so
-- the cleanup cron can sweep old rows efficiently.
alter table oauth_states enable row level security;
-- No policies = no rows visible to anon/authenticated. Service-role bypasses.

-- Migration version
insert into schema_migrations (version) values (3) on conflict do nothing;
