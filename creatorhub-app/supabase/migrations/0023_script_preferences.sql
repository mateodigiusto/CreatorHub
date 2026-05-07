-- 0023_script_preferences.sql
-- Per-user generation cadence + defaults for the AI Script Generator.
-- Lives in its own table (rather than as columns on profiles) because it
-- grows over time — additional knobs (model temperature, voice presets,
-- approval routing) land here without bloating the core profile row.
--
-- One row per user, lazily created on first visit to /scripts. Defaults
-- match the PDF's "weekly, 3 short-form Reels for IG" sample preset.

create type script_frequency_t as enum (
  'daily', 'three_x_week', 'weekly', 'biweekly', 'monthly', 'custom'
);

create table script_preferences (
  user_id uuid primary key references users(id) on delete cascade,
  scripts_per_period integer not null default 3
    check (scripts_per_period >= 1 and scripts_per_period <= 100),
  frequency script_frequency_t not null default 'weekly',
  /* For frequency = 'custom' only — a 5-field cron expression. */
  custom_cron text,
  default_format script_format_t not null default 'reel',
  default_platforms platform_t[] not null default array['instagram']::platform_t[],
  /* jsonb shape: { system_prompt: string?, style_guide: string?, banned_phrases: string[]? } */
  system_prompt_overrides jsonb not null default '{}'::jsonb,
  /* Soft cap surfaced in /api/scripts/generate. Null → use plan-tier default. */
  monthly_cap integer
    check (monthly_cap is null or monthly_cap > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    frequency != 'custom' or (custom_cron is not null and length(custom_cron) > 0)
  )
);

create trigger touch_script_preferences_updated_at
  before update on script_preferences
  for each row execute function trg_touch_updated_at();

alter table script_preferences enable row level security;

create policy script_preferences_self_select
  on script_preferences for select using ((select auth.uid()) = user_id);
create policy script_preferences_self_insert
  on script_preferences for insert with check ((select auth.uid()) = user_id);
create policy script_preferences_self_update
  on script_preferences for update using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy script_preferences_self_delete
  on script_preferences for delete using ((select auth.uid()) = user_id);

insert into schema_migrations (version) values (23) on conflict do nothing;
