-- 0006_sequences.sql
-- Generated story sequences. Slides live in jsonb because the structure is
-- stable (Hook → Context → Proof → Insight → CTA) and we want the whole
-- sequence to load in one row.

create table sequences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  title text not null,
  goal text,
  content_style text,
  brand_tone text,
  persona text,
  brief text,
  slides jsonb not null default '[]'::jsonb,    -- [{ assetId, overlay, purpose, ... }]
  status text not null default 'draft',
  scheduled_at timestamptz,
  scheduled_at_timezone text,                   -- IANA zone the user picked
  published_at timestamptz,
  accent_color text,
  decorations text[] not null default array[]::text[],
  version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger touch_sequences_updated_at
  before update on sequences
  for each row execute function trg_touch_updated_at();

create index sequences_user_created_desc on sequences(user_id, created_at desc);

-- ─── RLS ─────────────────────────────────────────────────────────────
alter table sequences enable row level security;

create policy sequences_self_select on sequences
  for select using (user_id = auth.uid());

create policy sequences_self_insert on sequences
  for insert with check (user_id = auth.uid());

create policy sequences_self_update on sequences
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy sequences_self_delete on sequences
  for delete using (user_id = auth.uid());

-- Migration version
insert into schema_migrations (version) values (6) on conflict do nothing;
