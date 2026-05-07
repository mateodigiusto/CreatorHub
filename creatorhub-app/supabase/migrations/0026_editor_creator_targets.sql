-- 0026_editor_creator_targets.sql
-- Per-editor pitch list. Editor saves a creator from the directory, then
-- works it through pitched → responded → client (or pass).
--
-- One row per (user, creator) — saving the same creator twice is a no-op.
-- Status transitions are unrestricted in SQL; the UI nudges the natural
-- progression but doesn't block back-stepping (an editor may un-pass a
-- creator after re-evaluating).

create type target_status_t as enum (
  'pitched', 'responded', 'client', 'pass'
);

create table editor_creator_targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  creator_id uuid not null references creator_directory(id) on delete cascade,
  status target_status_t not null default 'pitched',
  notes text,
  added_at timestamptz not null default now(),
  last_status_change_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, creator_id)
);

create index editor_creator_targets_user_status_idx
  on editor_creator_targets(user_id, status, added_at desc);

create trigger touch_editor_creator_targets_updated_at
  before update on editor_creator_targets
  for each row execute function trg_touch_updated_at();

-- Stamp last_status_change_at whenever status flips.
-- NOTE: search_path locked in 0029 for advisor compliance.
create or replace function trg_touch_target_status_change()
returns trigger language plpgsql as $$
begin
  if new.status is distinct from old.status then
    new.last_status_change_at := now();
  end if;
  return new;
end $$;

create trigger touch_target_status_change
  before update on editor_creator_targets
  for each row execute function trg_touch_target_status_change();

alter table editor_creator_targets enable row level security;

create policy editor_creator_targets_self_select
  on editor_creator_targets for select using ((select auth.uid()) = user_id);
create policy editor_creator_targets_self_insert
  on editor_creator_targets for insert with check ((select auth.uid()) = user_id);
create policy editor_creator_targets_self_update
  on editor_creator_targets for update using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy editor_creator_targets_self_delete
  on editor_creator_targets for delete using ((select auth.uid()) = user_id);

insert into schema_migrations (version) values (26) on conflict do nothing;
