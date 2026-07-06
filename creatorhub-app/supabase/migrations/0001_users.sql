-- 0001_users.sql
-- App-side mirror of auth.users.
-- We don't read auth.users directly from app code; we mirror the bits we care
-- about into our own users table on first sign-in via a trigger.

create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  display_name text,
  handle text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Soft-delete: cleared at hard-delete (30 days after deleted_at).
  deleted_at timestamptz
);

create trigger touch_users_updated_at
  before update on users
  for each row execute function trg_touch_updated_at();

create index users_deleted_at on users(deleted_at) where deleted_at is not null;

-- ─── RLS ───────────────────────────────────────────────────────────────
alter table users enable row level security;

-- Users can read + update their own row only. INSERT goes through the trigger
-- below (service-role only); DELETE only via finalize_deletion job.
create policy users_self_read on users
  for select using (id = auth.uid());

create policy users_self_update on users
  for update using (id = auth.uid())
  with check (id = auth.uid());

-- ─── Trigger: mirror new auth.users into public.users ─────────────────
create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer
set search_path = public, auth as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- Migration version
insert into schema_migrations (version) values (1) on conflict do nothing;
