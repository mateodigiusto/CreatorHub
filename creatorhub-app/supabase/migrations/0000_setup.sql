-- 0000_setup.sql
-- Extensions, enums, helper functions, and the schema_migrations tracking table.
-- This migration is the foundation; nothing else can apply before it.

-- ─── Extensions ─────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";        -- gen_random_uuid alternative
create extension if not exists "pgcrypto";          -- digest(), gen_random_bytes()
create extension if not exists "pgsodium";          -- envelope encryption helpers
-- pg_trgm and citext are loaded by Supabase by default; not required here.

-- ─── Enums (Postgres ENUM types vs raw text — see plan §Schema conventions) ──
create type platform_t as enum ('instagram','tiktok','youtube','linkedin','x','facebook');
create type integration_status_t as enum ('active','expired','revoked','unsupported');
create type post_source_t as enum ('imported','native');
create type post_lifecycle_t as enum (
  'draft','review','scheduled','publishing','published','failed','analyzed'
);
create type asset_kind_t as enum ('photo','video','screenshot','testimonial','proof');
create type job_status_t as enum ('queued','running','completed','failed','dead');
create type job_kind_t as enum (
  'sync','transcode','publish','refresh_token','finalize_deletion','cleanup'
);

-- ─── Helper: BEFORE UPDATE trigger that bumps updated_at ───────────────
-- Every mutable table installs this trigger. Forgetting in app code is
-- impossible (DB enforces).
create or replace function trg_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ─── Schema migration version tracking ────────────────────────────────
-- Used by the boot-time schema-version assertion in instrumentation.ts.
-- Plain integer that we increment by 1 per migration in this directory.
create table if not exists schema_migrations (
  version int primary key,
  applied_at timestamptz not null default now(),
  checksum text
);

insert into schema_migrations (version) values (0)
on conflict (version) do nothing;

comment on table schema_migrations is
  'Tracks applied migrations. Version = filename ordinal. instrumentation.ts asserts code expectation matches max(version).';
