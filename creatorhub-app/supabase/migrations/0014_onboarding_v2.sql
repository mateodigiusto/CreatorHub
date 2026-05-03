-- Onboarding v2: trial fields + force re-onboarding for legacy rows.

-- 1. Add trial columns to profiles. All nullable so legacy rows aren't broken.
alter table profiles
  add column trial_plan text
    check (trial_plan is null or trial_plan in ('standard','pro')),
  add column trial_cycle text
    check (trial_cycle is null or trial_cycle in ('monthly','annual')),
  add column trial_started_at timestamptz,
  add column trial_expires_at timestamptz;

-- 2. Force re-onboarding: clear completed_at on legacy rows so the app gate
--    routes every existing user back through /onboarding. Completion writes
--    schema_version = 2 + completed_at = now() (new flow only).
update profiles
set completed_at = null
where completed_at is not null;

-- 3. Bump schema_migrations.
insert into schema_migrations (version) values (14) on conflict do nothing;
