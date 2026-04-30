-- 0004_integrations.sql
-- Per-platform connection records. Tokens are envelope-encrypted: every
-- ciphertext column has a sibling _dek (encrypted with the KEK) and _key_id
-- (which KEK encrypted the DEK) so we can rotate keys without rewriting all
-- rows at once.

create table integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  platform platform_t not null,
  external_account_id text not null,
  status integration_status_t not null default 'active',
  account_type text,                              -- 'business'|'creator'|'personal'
  -- Envelope encryption
  access_token_ciphertext bytea not null,
  access_token_dek bytea not null,
  access_token_key_id text not null,
  refresh_token_ciphertext bytea,
  refresh_token_dek bytea,
  refresh_token_key_id text,
  token_expires_at timestamptz,
  scopes text[] not null default array[]::text[],
  connected_at timestamptz not null default now(),
  disconnected_at timestamptz,
  last_synced_at timestamptz,
  updated_at timestamptz not null default now(),

  -- Allow multiple historical rows for the same external account if they're
  -- not all active (one user converts personal → business and reconnects).
  unique (user_id, platform, external_account_id)
);

create trigger touch_integrations_updated_at
  before update on integrations
  for each row execute function trg_touch_updated_at();

-- Partial unique index: only ONE active row per (platform, external_account_id)
-- system-wide. Prevents the Meta data-deletion handler from picking the wrong
-- user when external IDs collide due to platform-side ID reuse / transfers.
create unique index integrations_platform_external_active
  on integrations(platform, external_account_id)
  where status = 'active';

create index integrations_user_platform on integrations(user_id, platform);

-- ─── RLS ─────────────────────────────────────────────────────────────
alter table integrations enable row level security;

create policy integrations_self_select on integrations
  for select using (user_id = auth.uid());

-- INSERT/UPDATE/DELETE are service-role only (cron, OAuth callback). App
-- code can READ but not write. Reduces blast radius of a compromised
-- session — even with a valid token, the user can't directly edit token
-- ciphertext from the browser.

-- Migration version
insert into schema_migrations (version) values (4) on conflict do nothing;
