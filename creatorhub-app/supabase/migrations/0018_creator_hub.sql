-- 0018_creator_hub.sql
-- Multi-user "Creator Management Hub" — first multi-tenant data model in
-- the codebase. Lets a manager invite a creator (by email) into a managed
-- relationship, then assign tasks, share files (via assets), share links,
-- DM, and track daily streaks.
--
-- Design notes:
--   * Files reuse the existing `assets` table via a join (relationship_documents)
--     instead of a parallel store — single bucket, single upload flow.
--   * Streaks are derived from `relationship_task_completions` (insert-only
--     log, one row per (task, local-day)). No counter to keep in sync; "longest
--     contiguous run ending at today/yesterday" is a SQL query.
--   * `is_relationship_member()` SECURITY DEFINER fn keeps every child-table
--     RLS policy as a single fast call instead of duplicated subqueries.
--   * Notifications are generic from day 1 (recipient_id + kind enum) so
--     invite emails, new messages, and task pings share one persistence stack.

-- ─── Enums ───────────────────────────────────────────────────────────
create type relationship_status_t as enum (
  'pending', 'active', 'declined', 'ended', 'expired'
);
create type task_recurrence_t as enum ('none', 'daily');
create type task_status_t as enum ('pending', 'in_progress', 'done');
create type notification_kind_t as enum (
  'invite', 'message', 'task_assigned', 'task_due', 'streak_at_risk'
);

-- ─── creator_relationships ───────────────────────────────────────────
create table creator_relationships (
  id uuid primary key default gen_random_uuid(),
  manager_id uuid not null references users(id) on delete cascade,
  -- Null while pending; populated when invitee signs up + auto-promotion fires.
  creator_id uuid references users(id) on delete cascade,
  invited_email text,
  invite_token text unique,
  status relationship_status_t not null default 'pending',
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  ended_at timestamptz,
  expires_at timestamptz not null default (now() + interval '14 days'),
  updated_at timestamptz not null default now(),
  -- One of (creator_id, invited_email) must be set so we always know who
  -- the relationship targets.
  check (creator_id is not null or invited_email is not null)
);

create trigger touch_creator_relationships_updated_at
  before update on creator_relationships
  for each row execute function trg_touch_updated_at();

create index creator_relationships_manager_idx
  on creator_relationships(manager_id, status);
create index creator_relationships_creator_idx
  on creator_relationships(creator_id, status)
  where creator_id is not null;
create index creator_relationships_pending_email_idx
  on creator_relationships(invited_email)
  where status = 'pending';

-- ─── relationship_tasks ──────────────────────────────────────────────
create table relationship_tasks (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references creator_relationships(id) on delete cascade,
  created_by uuid not null references users(id),
  assigned_to uuid not null references users(id),
  title text not null,
  notes text,
  creator_note text,
  recurrence task_recurrence_t not null default 'none',
  -- For one-off tasks; null on daily recurring.
  deadline timestamptz,
  -- For one-off tasks; daily recurring uses the completions log instead.
  status task_status_t not null default 'pending',
  created_at timestamptz not null default now(),
  -- Soft-delete for daily tasks (they keep historical completions but stop
  -- counting toward today's streak after this).
  ended_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create trigger touch_relationship_tasks_updated_at
  before update on relationship_tasks
  for each row execute function trg_touch_updated_at();

create index relationship_tasks_rel_idx
  on relationship_tasks(relationship_id, recurrence, ended_at);
create index relationship_tasks_assigned_idx
  on relationship_tasks(assigned_to, status);

-- ─── relationship_task_completions ───────────────────────────────────
-- One row per (daily-task, local-day) when completed. Streak derived from
-- this. No update path; insert-only with ON CONFLICT DO NOTHING.
create table relationship_task_completions (
  task_id uuid not null references relationship_tasks(id) on delete cascade,
  day date not null,
  completed_at timestamptz not null default now(),
  primary key (task_id, day)
);

create index relationship_task_completions_day_idx
  on relationship_task_completions(day, task_id);

-- ─── relationship_documents ──────────────────────────────────────────
-- Join row: a file shared inside a relationship is just a pointer to an
-- existing asset (which the uploader owns). The counterparty downloads via
-- a server-minted signed URL after membership check.
create table relationship_documents (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references creator_relationships(id) on delete cascade,
  asset_id uuid not null references assets(id) on delete cascade,
  shared_by uuid not null references users(id),
  created_at timestamptz not null default now(),
  unique (relationship_id, asset_id)
);

create index relationship_documents_rel_idx
  on relationship_documents(relationship_id, created_at desc);

-- ─── relationship_links ──────────────────────────────────────────────
create table relationship_links (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references creator_relationships(id) on delete cascade,
  added_by uuid not null references users(id),
  url text not null,
  title text,
  description text,
  created_at timestamptz not null default now()
);

create index relationship_links_rel_idx
  on relationship_links(relationship_id, created_at desc);

-- ─── relationship_messages ───────────────────────────────────────────
create table relationship_messages (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references creator_relationships(id) on delete cascade,
  sender_id uuid not null references users(id),
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index relationship_messages_rel_idx
  on relationship_messages(relationship_id, created_at desc);
create index relationship_messages_unread_idx
  on relationship_messages(relationship_id)
  where read_at is null;

-- ─── notifications ───────────────────────────────────────────────────
create table notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references users(id) on delete cascade,
  kind notification_kind_t not null,
  target_type text,
  target_id text,
  body text,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index notifications_unread_idx
  on notifications(recipient_id, created_at desc)
  where read_at is null;

-- ─── Helper function: is_relationship_member ─────────────────────────
-- Used by every child-table RLS policy. SECURITY DEFINER + locked search_path
-- so it always sees the parent table even if the caller has no select grant.
create or replace function public.is_relationship_member(rel_id uuid)
returns boolean language sql stable security definer
set search_path = pg_catalog, public as $$
  select exists (
    select 1 from creator_relationships r
    where r.id = rel_id
      and ((select auth.uid()) = r.manager_id
           or (select auth.uid()) = r.creator_id)
  );
$$;

revoke execute on function public.is_relationship_member(uuid) from public, anon;
grant execute on function public.is_relationship_member(uuid) to authenticated;

-- ─── RLS: creator_relationships ──────────────────────────────────────
alter table creator_relationships enable row level security;

create policy creator_relationships_self_select
  on creator_relationships for select
  using ((select auth.uid()) = manager_id or (select auth.uid()) = creator_id);

create policy creator_relationships_manager_insert
  on creator_relationships for insert
  with check ((select auth.uid()) = manager_id);

create policy creator_relationships_manager_update
  on creator_relationships for update
  using ((select auth.uid()) = manager_id)
  with check ((select auth.uid()) = manager_id);

-- Creator can flip status from active → ended/declined.
create policy creator_relationships_creator_end
  on creator_relationships for update
  using ((select auth.uid()) = creator_id and status = 'active')
  with check ((select auth.uid()) = creator_id and status in ('ended', 'declined'));

-- ─── RLS: relationship_tasks ─────────────────────────────────────────
alter table relationship_tasks enable row level security;

create policy relationship_tasks_select
  on relationship_tasks for select
  using (is_relationship_member(relationship_id));

create policy relationship_tasks_insert
  on relationship_tasks for insert
  with check (
    is_relationship_member(relationship_id)
    and exists (
      select 1 from creator_relationships r
      where r.id = relationship_id and r.status = 'active'
    )
  );

create policy relationship_tasks_update
  on relationship_tasks for update
  using (is_relationship_member(relationship_id))
  with check (
    is_relationship_member(relationship_id)
    and exists (
      select 1 from creator_relationships r
      where r.id = relationship_id and r.status = 'active'
    )
  );

create policy relationship_tasks_delete
  on relationship_tasks for delete
  using (is_relationship_member(relationship_id));

-- ─── RLS: relationship_task_completions ──────────────────────────────
alter table relationship_task_completions enable row level security;

create policy relationship_task_completions_select
  on relationship_task_completions for select
  using (
    exists (
      select 1 from relationship_tasks t
      where t.id = task_id and is_relationship_member(t.relationship_id)
    )
  );

create policy relationship_task_completions_insert
  on relationship_task_completions for insert
  with check (
    exists (
      select 1 from relationship_tasks t
      where t.id = task_id and is_relationship_member(t.relationship_id)
    )
  );

create policy relationship_task_completions_delete
  on relationship_task_completions for delete
  using (
    exists (
      select 1 from relationship_tasks t
      where t.id = task_id and is_relationship_member(t.relationship_id)
    )
  );

-- ─── RLS: relationship_documents ─────────────────────────────────────
alter table relationship_documents enable row level security;

create policy relationship_documents_select
  on relationship_documents for select
  using (is_relationship_member(relationship_id));

create policy relationship_documents_insert
  on relationship_documents for insert
  with check (
    is_relationship_member(relationship_id)
    and shared_by = (select auth.uid())
    and exists (
      select 1 from creator_relationships r
      where r.id = relationship_id and r.status = 'active'
    )
  );

create policy relationship_documents_delete
  on relationship_documents for delete
  using (is_relationship_member(relationship_id) and shared_by = (select auth.uid()));

-- ─── RLS: relationship_links ─────────────────────────────────────────
alter table relationship_links enable row level security;

create policy relationship_links_select
  on relationship_links for select
  using (is_relationship_member(relationship_id));

create policy relationship_links_insert
  on relationship_links for insert
  with check (
    is_relationship_member(relationship_id)
    and added_by = (select auth.uid())
    and exists (
      select 1 from creator_relationships r
      where r.id = relationship_id and r.status = 'active'
    )
  );

create policy relationship_links_delete
  on relationship_links for delete
  using (is_relationship_member(relationship_id) and added_by = (select auth.uid()));

-- ─── RLS: relationship_messages ──────────────────────────────────────
alter table relationship_messages enable row level security;

create policy relationship_messages_select
  on relationship_messages for select
  using (is_relationship_member(relationship_id));

create policy relationship_messages_insert
  on relationship_messages for insert
  with check (
    is_relationship_member(relationship_id)
    and sender_id = (select auth.uid())
    and exists (
      select 1 from creator_relationships r
      where r.id = relationship_id and r.status = 'active'
    )
  );

-- Recipient (anyone who's a member but didn't send) can mark as read.
create policy relationship_messages_recipient_update
  on relationship_messages for update
  using (
    is_relationship_member(relationship_id)
    and sender_id != (select auth.uid())
  )
  with check (
    is_relationship_member(relationship_id)
    and sender_id != (select auth.uid())
  );

-- ─── RLS: notifications ──────────────────────────────────────────────
-- Read + mark-read by recipient. Inserts go through service role only
-- (notify() helper in src/lib/notifications.ts).
alter table notifications enable row level security;

create policy notifications_self_select
  on notifications for select
  using ((select auth.uid()) = recipient_id);

create policy notifications_self_update
  on notifications for update
  using ((select auth.uid()) = recipient_id)
  with check ((select auth.uid()) = recipient_id);

-- ─── Trigger: auto-promote pending invites on signup ─────────────────
-- When public.users gets a new row (via handle_new_auth_user firing on
-- auth.users insert), match the email against any pending invites and
-- flip them to active. Atomic, no first-login app code needed.
create or replace function public.promote_pending_invites()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public as $$
begin
  update creator_relationships
  set creator_id = new.id,
      status = 'active',
      accepted_at = now(),
      invited_email = null,
      invite_token = null
  where invited_email = new.email
    and status = 'pending'
    and expires_at > now();
  return new;
end $$;

create trigger promote_invites_on_user_insert
  after insert on users
  for each row execute function public.promote_pending_invites();

revoke execute on function public.promote_pending_invites() from public, anon, authenticated;

insert into schema_migrations (version) values (18) on conflict do nothing;
