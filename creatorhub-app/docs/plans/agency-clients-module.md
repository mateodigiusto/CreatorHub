# Agency Clients Module — Implementation Plan

Pivot CreatorHub from single-user to a multi-tenant B2B SaaS for agencies, content teams, and creative directors. Replace the existing relationship-based `/clients` UI with a 10-tab agency workspace plus a client-facing portal.

**Status when this plan was written:** schema v31, uncommitted work on `/clients` and `0031_relationship_retainer.sql`.

---

## 0. Pre-flight — decisions already locked

| Topic | Decision |
|---|---|
| Existing `/clients` UI + `relationship_*` tables | **Drop entirely.** Discard the uncommitted work touching these files (see §1). |
| Multi-tenancy | **On.** Agencies are `organizations`. Membership has a **base role** (`user` / `editor` / `director`) **plus an orthogonal `is_admin` flag** (WhatsApp-style — any role can also be admin; multiple admins allowed; first member of a new org is auto-admin). Each org owns N `clients` (a `clients` row is the *creator being managed*, not a user). Real users access clients via `client_memberships` with `access_role: client_owner | team_assigned` and use the `/workspace/*` portal. |
| Admin powers | Only `is_admin = true` members can: invite/remove org members; promote/demote others to admin; edit billing & plan; delete/archive clients. Everything else (brand profile, pipeline, comments, video upload, etc.) is gated by base role, not admin. |
| Mount points | Agency admin at `/clients/*`. Client-facing portal at `/workspace/*`. |
| UI stack | Existing CreatorHub UI library (`Card`, `Button`, `Badge`, `Tabs`, `Toaster`, `AiCallout`, `EmptyState`, `IconButton`, `PageHeader`). **No shadcn, sonner, react-hook-form, zod** for v1. |
| Forms | Native `<form>` + route handlers + `useFormStatus`. No Server Actions (AGENTS.md mandate). |
| Brand | Navy + blue palette only. **No violet/amber/emerald accents.** Use `--accent` (blue), `--success` (green), `--warning` (orange, sparingly), `--error` (red), `--text-muted`. |
| Video | **Bunny.net Stream** (decision reversed from initial plan — cheaper delivery, user preference). Schema columns: `bunny_video_id`, `bunny_video_status`, `bunny_video_duration_seconds`. New `src/lib/bunny/client.ts` (TUS upload + signed playback/download/thumbnail). `<VideoPlayer>` updated to read a signed Bunny URL. `AGENTS.md` must be updated to reference Bunny, not Cloudflare Stream. Existing `src/lib/stream.ts` is retired. |
| Drag-drop | `@dnd-kit/core` + `@dnd-kit/sortable`. New deps. |
| AI | `@anthropic-ai/sdk`, model `claude-sonnet-4-6` for transcript analyzer. New dep. |
| Email | `resend`. New dep. |
| Calendar math | `date-fns`. New dep. |
| Stripe | Migrate `subscriptions` from user-level to org-level. Re-key existing `stripe_customer_id` from `profiles` onto `organizations`. |
| Server Actions | **Not used.** All mutations are POST/PATCH/DELETE route handlers. |

---

## 1. Pre-execution checklist (do this BEFORE Phase 1)

The first execution session must begin with these steps. If skipped, work is lost.

1. **Stash or commit current uncommitted work.** Affected files:
   - `M src/app/clients/[id]/page.tsx`, `M src/app/clients/page.tsx`, `M src/app/api/clients/[id]/route.ts`
   - `M src/components/clients/ReportPanel.tsx`
   - `?? src/components/clients/{CrossClientPipeline,CrossClientTasks,RetainerCard}.tsx`
   - `?? src/app/api/clients/pipeline/`, `?? src/app/api/clients/tasks/`, `?? src/app/api/clients/[id]/retainer/`
   - `?? supabase/migrations/0031_relationship_retainer.sql`
   - Plus the other unrelated work in the working tree (PDF expansion etc.) — orthogonal but tangled.

   Recommend: `git switch -c pre-agency-snapshot && git add -A && git commit -m "WIP: snapshot before agency clients pivot"` then `git switch main`.

2. **Confirm Stripe is currently safe to refactor.** Re-read `docs/runbooks/stripe-activation.md`. If a live customer exists, the org migration is a data-migration not a schema-rewrite. (Likely zero live customers — confirm.)

3. **Create a feature branch:** `git switch -c feat/agency-clients`.

4. **Bump `EXPECTED_SCHEMA_VERSION`** in `.env.example` once per migration session (final value after Phase 1 schema = 32; final value after Phase 6 = 36).

---

## 2. Files to delete

When Phase 5 finishes, these are removed (Phase 1 leaves them in place so the existing UI keeps booting during the build):

```
src/app/clients/page.tsx                      → rewritten as agency all-clients grid
src/app/clients/[id]/page.tsx                 → replaced by [slug]/layout.tsx + per-tab pages
src/app/clients/new/                          → replaced by AddClientDialog
src/app/api/clients/                          → entire tree replaced
src/components/clients/                       → entire folder replaced
src/lib/clients/types.ts                      → replaced by org-aware types
```

Tables dropped in Phase 1 migration:

```
relationship_messages
relationship_documents
relationship_links
relationship_task_completions
relationship_tasks
creator_relationships
notifications   ← drop only if unused elsewhere; verify with grep first
```

Migration `0031_relationship_retainer.sql` is **never applied** (it's currently uncommitted). It just gets deleted.

---

## 3. Migration plan (4 SQL files, schema v31 → v36)

### 3.1 `0032_drop_relationships.sql` (v32)
Drop the relationship_* tables and their helper functions. Drop `notifications` if grep confirms zero references outside the Clients module.

```sql
drop table if exists public.relationship_messages cascade;
drop table if exists public.relationship_documents cascade;
drop table if exists public.relationship_links cascade;
drop table if exists public.relationship_task_completions cascade;
drop table if exists public.relationship_tasks cascade;
drop table if exists public.creator_relationships cascade;
drop function if exists public.is_relationship_member(uuid);
-- drop notifications only if unused
insert into schema_migrations (version) values (32);
```

### 3.2 `0033_organizations.sql` (v33)
Organizations + memberships + invites + Stripe event idempotency.

```sql
-- Base role (per-member). `user` is the catch-all for solo workspaces / non-agency setups.
create type org_role_t as enum ('user', 'editor', 'director');
create type org_plan_t as enum ('free', 'starter', 'pro', 'scale');
create type org_sub_status_t as enum ('trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete', 'incomplete_expired', 'paused');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  -- created_by is the founding member; admin powers are derived from
  -- organization_memberships.is_admin, NOT from a single owner_id column.
  created_by uuid references public.profiles(user_id),
  plan org_plan_t not null default 'free',
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  subscription_status org_sub_status_t not null default 'trialing',
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create trigger trg_touch_organizations before update on public.organizations
  for each row execute function trg_touch_updated_at();

create table public.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid not null references public.profiles(user_id) on delete cascade,
  role org_role_t not null default 'user',
  -- Orthogonal admin flag. WhatsApp-style: any role can also be admin; multiple admins allowed.
  -- The first member of a new org is auto-set is_admin=true on insert (in app code).
  is_admin boolean not null default false,
  invited_by uuid references public.profiles(user_id),
  created_at timestamptz default now(),
  unique (organization_id, profile_id)
);
create index org_members_profile_idx on public.organization_memberships(profile_id);
create index org_members_org_idx on public.organization_memberships(organization_id);
create index org_members_admin_idx on public.organization_memberships(organization_id) where is_admin;

-- Safety net: an org must always have at least one admin. Enforced via a trigger
-- that blocks DELETE or "demote last admin" UPDATEs.
create or replace function public.enforce_org_has_admin()
returns trigger language plpgsql as $$
declare remaining int;
begin
  if tg_op = 'DELETE' then
    if old.is_admin then
      select count(*) into remaining from public.organization_memberships
        where organization_id = old.organization_id and is_admin and id <> old.id;
      if remaining = 0 then raise exception 'Cannot remove the last admin of an organization'; end if;
    end if;
    return old;
  elsif tg_op = 'UPDATE' then
    if old.is_admin and not new.is_admin then
      select count(*) into remaining from public.organization_memberships
        where organization_id = old.organization_id and is_admin and id <> old.id;
      if remaining = 0 then raise exception 'Cannot demote the last admin of an organization'; end if;
    end if;
    return new;
  end if;
  return null;
end $$;
create trigger trg_org_members_admin_guard
  before update or delete on public.organization_memberships
  for each row execute function public.enforce_org_has_admin();

create table public.organization_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role org_role_t not null default 'user',
  is_admin boolean not null default false,            -- pre-flag invite as admin
  token text unique not null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_by uuid references public.profiles(user_id),
  created_at timestamptz default now()
);
create index org_invites_org_idx on public.organization_invites(organization_id);
create index org_invites_token_idx on public.organization_invites(token);

create table public.stripe_events (
  id text primary key,           -- Stripe event id, idempotency
  type text not null,
  payload jsonb not null,
  received_at timestamptz default now()
);

-- Helper functions
create or replace function public.current_org_role(_org uuid)
returns org_role_t language sql security definer stable as $$
  select role from public.organization_memberships
  where organization_id = _org and profile_id = (select auth.uid())
  limit 1
$$;

create or replace function public.is_org_member(_org uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.organization_memberships
    where organization_id = _org and profile_id = (select auth.uid())
  )
$$;

-- Any role with any standing in the org. Used by RLS to allow read/edit of
-- client-scoped data. Role-specific gating happens in route handlers, not RLS.
create or replace function public.is_org_staff(_org uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.organization_memberships
    where organization_id = _org and profile_id = (select auth.uid())
  )
$$;

-- The admin flag — gates org-management actions (invites, billing, client delete).
create or replace function public.is_org_admin(_org uuid)
returns boolean language sql security definer stable as $$
  select coalesce((
    select is_admin from public.organization_memberships
    where organization_id = _org and profile_id = (select auth.uid())
    limit 1
  ), false)
$$;

-- RLS
alter table public.organizations enable row level security;
create policy organizations_select on public.organizations for select using (is_org_member(id));
create policy organizations_update on public.organizations for update using (is_org_admin(id)) with check (is_org_admin(id));
-- inserts via service-role only

alter table public.organization_memberships enable row level security;
create policy org_members_select on public.organization_memberships for select using (is_org_member(organization_id));
create policy org_members_insert on public.organization_memberships for insert with check (is_org_admin(organization_id));
create policy org_members_update on public.organization_memberships for update using (is_org_admin(organization_id));
create policy org_members_delete on public.organization_memberships for delete using (is_org_admin(organization_id));

alter table public.organization_invites enable row level security;
create policy org_invites_select on public.organization_invites for select using (is_org_admin(organization_id));
create policy org_invites_insert on public.organization_invites for insert with check (is_org_admin(organization_id));
create policy org_invites_delete on public.organization_invites for delete using (is_org_admin(organization_id));

revoke all on public.stripe_events from anon, authenticated;

insert into schema_migrations (version) values (33);
```

### 3.3 `0034_agency_clients.sql` (v34)
The agency-side client model. `clients` is a row (the creator the agency manages), not a user. `client_memberships` links real users to those rows so the creator can log in to `/workspace/*`.

```sql
create type client_status_t as enum ('active', 'paused', 'archived');
create type client_access_role_t as enum ('client_owner', 'team_assigned');

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9-]+$'),
  display_name text not null,
  tagline text,
  status client_status_t not null default 'active',
  instagram_handle text,
  created_by uuid references public.profiles(user_id),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (organization_id, slug)
);
create index clients_org_idx on public.clients(organization_id);
create trigger trg_touch_clients before update on public.clients
  for each row execute function trg_touch_updated_at();

create table public.client_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  profile_id uuid not null references public.profiles(user_id) on delete cascade,
  access_role client_access_role_t not null,
  created_at timestamptz default now(),
  unique (client_id, profile_id)
);
create index client_members_profile_idx on public.client_memberships(profile_id);
create index client_members_client_idx on public.client_memberships(client_id);

-- Resolve "does the current user have access to this client?"
create or replace function public.has_client_access(_client uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.clients c
    where c.id = _client
      and (
        is_org_staff(c.organization_id)
        or exists (
          select 1 from public.client_memberships m
          where m.client_id = _client and m.profile_id = (select auth.uid())
        )
      )
  )
$$;

-- RLS
alter table public.clients enable row level security;
create policy clients_select on public.clients for select using (
  is_org_staff(organization_id)
  or exists (
    select 1 from public.client_memberships m
    where m.client_id = clients.id and m.profile_id = (select auth.uid())
  )
);
create policy clients_insert on public.clients for insert with check (is_org_staff(organization_id));
create policy clients_update on public.clients for update using (is_org_staff(organization_id));
create policy clients_delete on public.clients for delete using (is_org_admin(organization_id));

alter table public.client_memberships enable row level security;
create policy client_members_select on public.client_memberships for select using (
  is_org_staff(organization_id) or profile_id = (select auth.uid())
);
create policy client_members_write on public.client_memberships for all using (is_org_staff(organization_id))
  with check (is_org_staff(organization_id));

insert into schema_migrations (version) values (34);
```

### 3.4 `0035_client_workspace.sql` (v35)
The 10-tab data: brand profile, internal notes, content pipeline, comments, metrics, assets, folders, meetings, tasks.

Tables (column lists abbreviated — see §4 of the source plan for full shapes; rename `bunny_video_*` → `cf_stream_*`):

```
brand_profiles            (1:1 client, 14 long-form fields, content_pillars text[])
client_internal_notes     (1:1 client, admin/director/editor only)
content_items             (5-status enum pipeline, hooks×3, bunny_video_id, position)
content_comments          (threaded, attached to content_item OR asset_video, is_internal flag)
content_metrics           (1:1 content_item, views/likes/comments/shares/saves)
metric_snapshots          (client × date, followers count)
folders                   (client-scoped tree, scope='asset' | 'sop')
asset_links               (client-scoped, category enum, visibility enum)
asset_videos              (client-scoped, bunny_video_id, review_status enum)
meeting_notes             (client-scoped, visibility enum)
tasks                     (client-scoped + status/due_date/visibility/assigned_to)
```

Enums:
```
content_status_t ('idea','script','film','edit','post')
content_type_t   ('reel','story','carousel','short','long_form','image','other')
bunny_video_status_t ('uploading','processing','ready','failed')
visibility_t     ('internal','client_visible')
asset_category_t ('journey','pictures','videos','raw','published','other')
review_status_t  ('draft','in_review','changes_requested','approved')
task_status_t    ('todo','doing','blocked','done')
metric_source_t  ('manual','instagram_api')
folder_scope_t   ('asset','sop')
```

Each table gets:
- `organization_id` (FK, indexed, cascade delete)
- `client_id` (FK, indexed, cascade delete) — except `metric_snapshots` which has `(client_id, captured_on)` unique
- `BEFORE UPDATE` trigger for `updated_at`
- RLS policies using `is_org_staff(organization_id)` for staff and `has_client_access(client_id) AND visibility = 'client_visible'` for clients (where visibility applies)
- `client_internal_notes` strips the `has_client_access` clause entirely (staff-only)

Indexes:
```
content_items(client_id, status)        -- kanban column queries
content_items(client_id, planned_post_date)  -- calendar
content_metrics(content_item_id)
metric_snapshots(client_id, captured_on desc)
asset_links(client_id, category)
asset_videos(client_id, review_status)
tasks(client_id, status)
folders(client_id, parent_id)
```

### 3.5 `0036_stripe_org_migration.sql` (v36)
Move billing from user-level to org-level.

```sql
-- 1. Add legacy linkage columns on subscriptions for an audit trail
alter table public.subscriptions add column organization_id uuid references public.organizations(id) on delete cascade;
-- 2. For every existing subscriptions row, find/create an org owned by that user
--    (data migration written in TypeScript, run once after deploy — see §6)
-- 3. After backfill: make organization_id NOT NULL and drop user_id (separate
--    migration once backfill is verified — defer to 0037)

-- Drop legacy stripe_customer_id from profiles (now lives on organizations)
-- Defer this drop too; we want a window where both columns exist.

insert into schema_migrations (version) values (36);
```

A follow-up `0037_subscriptions_finalize.sql` runs after the TS backfill flips `subscriptions.user_id` → `organization_id` and drops `profiles.stripe_customer_id`.

After every migration: run `mcp__supabase__get_advisors security` and `performance`. Add a remediation migration if any new WARNs appear (e.g., missing index on `organization_id` join columns, RLS policies using `auth.uid()` instead of `(select auth.uid())`).

---

## 4. Dependency adds

```bash
cd creatorhub-app
npm i @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
npm i date-fns
npm i @anthropic-ai/sdk
npm i resend
npm i tus-js-client
```

No additions for: shadcn/ui (use existing components), sonner (use `Toaster`), react-hook-form / zod (use native `<form>` + manual validation in route handlers), Cloudflare Stream SDK (Bunny replaces it).

Decision reversal note: the original plan had Bunny → swapped to Cloudflare → swapped back to Bunny per user preference (cheaper bandwidth-based pricing, simpler TUS upload). `src/lib/stream.ts` (Cloudflare wrapper) is retired in Phase 5; new wrapper at `src/lib/bunny/client.ts`. ESLint rule `creatorhub/no-bare-video` keeps enforcing `<VideoPlayer>` as the only render path — the player just reads a different URL shape.

New `.env.example` entries (append, don't replace):

```
# ─── Anthropic (Brand AI transcript analyzer) ─────────────────────
ANTHROPIC_API_KEY=

# ─── Resend (transactional email) ─────────────────────────────────
# Domain TBD — user will provide before Phase 1 invite emails go live.
RESEND_API_KEY=
RESEND_FROM=

# ─── Bunny.net Stream (video) ─────────────────────────────────────
BUNNY_STREAM_LIBRARY_ID=
BUNNY_STREAM_API_KEY=
BUNNY_STREAM_CDN_HOSTNAME=
BUNNY_STREAM_TOKEN_AUTH_KEY=

# ─── Site URL (Stripe redirects, invite links, email links) ───────
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

The legacy `CLOUDFLARE_ACCOUNT_ID` / `CLOUDFLARE_STREAM_API_TOKEN` env vars are removed from `.env.example` as part of Phase 5.

Stripe Price IDs (`STRIPE_PRICE_*`) and `STRIPE_WEBHOOK_SECRET` already live in `docs/runbooks/stripe-activation.md`.

---

## 5. Route map

```
src/app/
  (auth)/
    signup/page.tsx                    # email+pw+agency name → create org with trial=pro/14d
    login/page.tsx                     # already exists or stubbed in Phase 1 part 2
  (onboarding)/
    onboarding/                        # existing 14-step wizard (unchanged for now)
    onboarding/create-org/page.tsx     # NEW — fallback if signup didn't capture agency name
  invite/[token]/page.tsx              # NEW — accept org invite

  clients/                             # AGENCY ADMIN (replaces existing /clients UI)
    page.tsx                           # All-clients grid + Add client dialog
    [slug]/
      layout.tsx                       # Resolve client by (currentOrg.id, slug), 404 if no access
      overview/page.tsx
      brand-build/page.tsx
      strategy/page.tsx
      pipeline/page.tsx
      calendar/page.tsx
      metrics/page.tsx
      assets/page.tsx
      meetings/page.tsx
      internal/page.tsx                # staff only (RLS-enforced)
      settings/page.tsx
  workspace/                           # CLIENT-FACING PORTAL
    layout.tsx                         # Resolve single client this user is member of
    overview/page.tsx
    brand-build/page.tsx
    strategy/page.tsx
    pipeline/page.tsx                  # filtered visibility, no internal_notes
    calendar/page.tsx
    metrics/page.tsx
    assets/page.tsx                    # visibility='client_visible' only
    meetings/page.tsx                  # visibility='client_visible' only

  settings/billing/page.tsx            # Org plan + usage + Stripe portal (replaces user-level)
  settings/team/page.tsx               # Org members + invites
  settings/                            # existing user-level prefs untouched

  api/
    organizations/
      route.ts                         # POST → create org (called by /signup)
      [id]/route.ts                    # PATCH → rename / update slug
      [id]/members/route.ts            # POST invite, GET list
      [id]/members/[membershipId]/route.ts  # PATCH role, DELETE
      [id]/invites/[token]/accept/route.ts  # POST → consume invite
    clients/
      route.ts                         # GET list (org-scoped), POST create
      [slug]/route.ts                  # GET, PATCH, DELETE
      [slug]/members/route.ts          # POST/DELETE client_memberships
      [slug]/brand-profile/route.ts    # PATCH all 14 fields
      [slug]/brand-profile/analyze/route.ts  # POST transcript → Anthropic suggestions
      [slug]/internal-notes/route.ts   # PATCH (staff only)
      [slug]/content/route.ts          # POST create content_item, GET list
      [slug]/content/[id]/route.ts     # PATCH, DELETE
      [slug]/content/[id]/move/route.ts        # POST { status, position }
      [slug]/content/[id]/comments/route.ts    # GET, POST (triggers Resend)
      [slug]/content/[id]/comments/[commentId]/route.ts  # PATCH (resolve), DELETE
      [slug]/content/[id]/metrics/route.ts     # PATCH
      [slug]/folders/route.ts          # GET, POST
      [slug]/folders/[id]/route.ts     # PATCH, DELETE
      [slug]/assets/links/route.ts     # GET, POST
      [slug]/assets/links/[id]/route.ts # PATCH, DELETE
      [slug]/assets/videos/route.ts    # GET, POST (creates Cloudflare Stream upload URL)
      [slug]/assets/videos/[id]/route.ts # PATCH, DELETE
      [slug]/meetings/route.ts         # GET, POST
      [slug]/meetings/[id]/route.ts    # PATCH, DELETE
      [slug]/tasks/route.ts            # GET, POST
      [slug]/tasks/[id]/route.ts       # PATCH, DELETE
    stripe/
      checkout/route.ts                # POST → Stripe Checkout for org plan upgrade
      portal/route.ts                  # POST → Stripe Billing Portal
      webhook/route.ts                 # existing — update to write org row, not profile

src/lib/
  auth/
    session.ts                         # getSession() → { user, profile, organization, orgRole, plan }
    require-org.ts                     # redirect to /onboarding/create-org if none
    require-org-role.ts                # requireOrgRole('owner'|'admin'|'director'|'editor')
    require-client-access.ts           # resolves client by slug, gates by org+RLS
  agency/
    types.ts                           # all agency-side row types
    permissions.ts                     # contentItemSelectColumns(role), scrubForClient(...)
    actions/                           # ⚠ misleading name; these are route-handler helpers,
                                       #   not Server Actions. Just call them "handlers".
  billing/
    plans.ts                           # PLANS const with org-level limits
    limits.ts                          # assertPlanAllows(org, capability)
    stripe.ts                          # SDK init + price→plan map
    checkout.ts
    portal.ts
  ai/
    anthropic.ts                       # client init (server-only)
    analyze-transcript.ts              # systemPrompt + parse → typed suggestions
  email/
    resend.ts                          # client init
    notify.ts                          # commentNotification, inviteEmail
  bunny/                               # new — replaces src/lib/stream.ts (retired in Phase 5)
    client.ts                          # createVideo, getVideo, deleteVideo, signedPlaybackUrl, signedDownloadUrl, thumbnailUrl
    tus.ts                             # tus-js-client browser config (chunk size, auth headers, retry)
```

---

## 6. Phase order (each phase = roughly one session)

### Phase 1 — Foundation (schema + auth + orgs)
**Goal:** two agencies can sign up, each gets a trial org, they cannot see each other.

- Drop `relationship_*` (migration 0032)
- Add `organizations` + memberships + invites + RLS helpers (0033)
- `lib/auth/session.ts` returns the org context (currently single-org per user; structure for future multi-org)
- Signup page collects email + password + agency name; route handler creates `auth.users` → trigger creates `profiles` → handler creates `organization` (slug from name, `trial_ends_at = now() + 14d`, `plan = 'pro'`, `subscription_status = 'trialing'`) + first `organization_membership` row with `role = 'user'` and `is_admin = true` (the founding admin)
- `/onboarding/create-org` fallback for OAuth/Google users
- Invite flow: org admin → email → Resend → `/invite/[token]/accept` consumes
- Sidebar updated to show "Org name" header and replace per-client list with new agency-style client list (placeholder during Phase 1, real in Phase 2)

**Acceptance:** sign up as Agency A and Agency B in two browsers → both land in `/clients` (empty grid). Postgres query as anon returns zero rows for `organizations`; as Agency A returns only A's row.

### Phase 2 — Agency clients core (CRUD + Settings tab + Overview tab)
**Goal:** an agency can add a client and see Overview + Settings tabs.

- Migration 0034 (clients + memberships + RLS)
- `src/app/clients/page.tsx` — agency all-clients grid using existing `Card`/`Badge` components + `AddClientDialog` (uses `<dialog>` element or a small custom modal — no shadcn)
- `[slug]/layout.tsx` resolves client via `requireClientAccess`
- `ClientPageHeader` + `SubNav` (10 tab links, `usePathname` for active state — plain `<Link>` elements, no tabs library)
- `overview/page.tsx` — read-only, shows brand snapshot + 6 callout cards linking to other tabs
- `settings/page.tsx` — `ClientSettingsForm` (name/slug/tagline/IG/status), `ClientMembersList`, `ClientDangerZone`
- `lib/billing/plans.ts` + `limits.ts` with `assertPlanAllows`
- Add Client button is disabled with tooltip "Upgrade to add more clients" when at limit

**Acceptance:** create one client, edit its settings, change its slug (URL updates), invite a creator user as `client_owner`, delete the client (cascade verified), upgrade-tooltip appears at plan limit.

### Phase 3 — Workspace data tables + Brand Build + Strategy tabs
**Goal:** the long-form data layer for a client is editable.

- Migration 0035 (brand_profiles, client_internal_notes, content_items + enums, content_metrics, metric_snapshots, asset_links, asset_videos, folders, meeting_notes, tasks, content_comments)
- `brand-build/page.tsx` with `BrandBuildForm` (14 fields, save via `PATCH /api/clients/[slug]/brand-profile`)
- `strategy/page.tsx` with `NextStepsForm` (4 fields, same row as brand_profiles)
- `internal/page.tsx` — staff only
- `TranscriptAnalyzer` component → Anthropic SDK in `lib/ai/analyze-transcript.ts`. Plan-gated.

**Acceptance:** brand fields persist across reload. Pasting a transcript returns ≥5 suggested fills. Applying selected ones writes to DB. Client portal user cannot see `internal` tab and `internal_notes` writes throw via RLS.

### Phase 4 — Pipeline + Calendar + Metrics tabs
**Goal:** kanban + calendar + analytics work end-to-end.

- `pipeline/page.tsx` + `KanbanBoard` with `@dnd-kit`. Optimistic drag, `moveContentItemAction` does **not** revalidate.
- `ContentCardDialog` with 3 tabs (Overview / Script & Caption / Media). Each field auto-saves on blur via PATCH.
- `calendar/page.tsx` + `MonthCalendar` (date-fns). Read-only.
- `metrics/page.tsx` + `MetricsDashboard` with hand-rolled SVG bars (reuse existing `BarRow`).

**Acceptance:** drag a card across all 5 columns, refresh, order persists. Calendar shows scheduled posts. Metrics tab aggregates total views, top posts, format breakdown.

### Phase 5 — Assets + Meetings + Comments + Video (Bunny.net Stream)
**Goal:** files, threaded comments, Bunny.net Stream video upload.

- `assets/page.tsx` — folder tree + asset_links + asset_videos (filtered by visibility)
- **Bunny.net Stream upload pipeline**:
  - Route handler `POST /api/clients/[slug]/assets/videos` calls `src/lib/bunny/client.ts → createVideo()` which hits the Bunny API to create a video object, returns `{ video_id, tus_endpoint, auth_headers }`.
  - Browser uploads directly to Bunny's TUS endpoint via `tus-js-client` (resumable, chunked). DB row `asset_videos.bunny_video_id` is set immediately; `bunny_video_status` starts at `uploading`.
  - Status poller (client-side) hits `/api/clients/[slug]/assets/videos/[id]` every 5s; route handler calls `bunny/client.ts → getVideo()` and writes the new status (`processing → ready` or `failed`).
- Retire `src/lib/stream.ts` (Cloudflare wrapper) — delete file. Remove `CLOUDFLARE_*` env vars from `.env.example`.
- Update `<VideoPlayer>` to read a Bunny **signed playback URL** (HLS .m3u8 served from `BUNNY_STREAM_CDN_HOSTNAME` with HMAC token). Keep poster-only-by-default UX. ESLint rule `creatorhub/no-bare-video` continues to enforce the player as the only render path.
- `VideoCommentThread` component (timestamp-anchored, threaded replies) — comments stored in `content_comments` with `asset_video_id` set.
- `meetings/page.tsx` — CRUD list.

**Acceptance:** upload an MP4 via TUS, status transitions `uploading → processing → ready`, plays in `<VideoPlayer>` from a signed Bunny URL, timestamp comment lands at the right second. Total cost to upload + view a 30s test video is under the Bunny free-tier threshold during dev. `AGENTS.md` is updated to reference Bunny.net Stream, not Cloudflare Stream.

### Phase 6 — Stripe org-level migration + Billing page + Plan gates
**Goal:** plans actually gate features, billing lives on the org.

- Migration 0036 (add `organization_id` to `subscriptions`)
- TS backfill script: for each existing `subscriptions` row, create or attach an organization, copy `stripe_customer_id` from `profiles` to `organizations`
- Update Stripe webhook handler to write `organizations` instead of `profiles` for `customer.*` and `invoice.*` events. Idempotency via `stripe_events`.
- `settings/billing/page.tsx` — current plan + usage (clients used/max, monthly views used/max) + "Manage subscription" → portal + upgrade CTAs
- `assertPlanAllows` enforced at every gated handler:
  - `addClient` — on `POST /api/clients`
  - `aiAnalyzer` — on `POST /api/clients/[slug]/brand-profile/analyze`
  - `videoUpload` — on `POST /api/clients/[slug]/assets/videos`
- Migration 0037 finalizes: drop `subscriptions.user_id`, drop `profiles.stripe_customer_id`

**Acceptance:** Stripe Checkout in test mode upgrades the org's plan via webhook. Cancellation downgrades. `past_due` shows a banner in the admin layout. Free-plan org cannot create a second client; Pro can. AI button is disabled on Free.

### Phase 7 — Client-facing portal (`/workspace/*`)
**Goal:** invited creator client sees their own filtered workspace.

- `/workspace/layout.tsx` resolves the single client this user is a `client_membership` of (404 if zero, picker if >1)
- Mirror 8 tabs (no Internal, no Settings — settings handled by the agency)
- Reuse the same page components, pass a `viewerRole` prop that flips:
  - Pipeline: hide `internal_notes` field in dialog, omit comments with `is_internal=true`
  - Assets/Meetings: filter `visibility='client_visible'`
  - Brand Build / Strategy: editable depending on `client_owner` vs `team_assigned`

**Acceptance:** log in as a creator, see only your workspace. RLS proves it: query as the creator returns only their client's rows.

### Phase 8 — Polish
- Empty states for every tab
- Loading skeletons
- Mobile `SubNav` horizontal scroll
- Resend templates for: org invite, client invite, new content comment
- Sentry breadcrumbs on every plan-limit rejection (`code: 'plan_limit'`)
- Toast on optimistic-revert
- TS + lint clean
- RLS regression tests:
  - anon can't read `organizations`, `clients`, any agency table
  - Agency A staff can't read Agency B's clients
  - `team_assigned` member can't update internal_notes
- Migration round-trip test updated for new tables
- `EXPECTED_SCHEMA_VERSION=36` (or 37 after finalize)

---

## 7. Roles matrix

Two orthogonal axes:

- **Base role** on `organization_memberships.role` ∈ `user | editor | director` — gates *what work* a member can do inside a client.
- **Admin flag** on `organization_memberships.is_admin` (boolean) — gates *org-management* actions. Independent of role. Any role can also be admin. Multiple admins per org. First member is auto-admin. Cannot demote the last admin (DB trigger).
- **Client-side users** (creators being managed) are **not** org members. They appear in `client_memberships` with `access_role ∈ client_owner | team_assigned` and use `/workspace/*`.

### Admin-flag capabilities (orthogonal to base role)

| Capability | Requires `is_admin = true`? |
|---|---|
| Invite / remove org members | Yes |
| Promote / demote others to admin | Yes |
| Edit billing, change plan, Stripe portal | Yes |
| Delete / archive a client | Yes |

Non-admins of any role cannot do the above. The DB trigger `enforce_org_has_admin` guarantees at least one admin remains at all times.

### Base-role capabilities (inside a client workspace)

| Capability | user | editor | director | client_owner | team_assigned |
|---|---|---|---|---|---|
| Read brand_profile / strategy | ✓ | ✓ | ✓ | ✓ | — |
| Edit brand_profile / strategy | ✓ | ✓ | ✓ | ✓ (own only) | — |
| Read internal_notes | ✓ | ✓ | ✓ | — | — |
| Edit internal_notes | — | — | ✓ | — | — |
| Create client (= add a creator row in the org) | ✓ | — | ✓ | — | — |
| Add client_memberships | ✓ | — | ✓ | — | — |
| Read pipeline | ✓ | ✓ | ✓ | ✓ | ✓ |
| Move pipeline cards | ✓ | ✓ | ✓ | — | ✓ (limited to assigned cards) |
| Edit content scripts / captions | ✓ | ✓ | ✓ | — | ✓ |
| Read internal comments | ✓ | ✓ | ✓ | — | — |
| Post `is_internal = true` comments | ✓ | ✓ | ✓ | — | — |
| Post regular comments | ✓ | ✓ | ✓ | ✓ | ✓ |
| Upload video | ✓ | ✓ | ✓ | — | — |
| Mark video `approved` | — | — | ✓ | ✓ (their own review path) | — |
| Read metrics | ✓ | ✓ | ✓ | ✓ | ✓ |
| Edit metrics | ✓ | ✓ | ✓ | — | — |
| Create / edit asset_links | ✓ | ✓ | ✓ | — | ✓ |
| Create / edit meetings | ✓ | ✓ | ✓ | — | — |
| Create / edit tasks | ✓ | ✓ | ✓ | ✓ (assigned to self) | ✓ |

`user` is the catch-all base role for solo workspaces / non-agency setups — same access surface as `editor`/`director` minus org-internal escalations. `director` differs from `editor` only in being able to (a) edit internal_notes and (b) create new clients and add client_memberships. Everything else they share.

### Enforcement

- **Route handlers** check both `requireOrgRole(role)` and `requireOrgAdmin()` where applicable. Plan limits checked via `assertPlanAllows`.
- **RLS** allows reads/writes for *any* org member, plus client-side users when `has_client_access` is true. Fine-grained role gating (e.g. "only directors edit internal_notes") happens in the handler, not RLS — RLS prevents cross-tenant leaks; role gating prevents in-tenant escalations.
- **DB triggers** enforce: at least one admin per org; on `clients` delete, only `is_org_admin` may run the delete.

---

## 8. Plan limits (initial cut)

```ts
// lib/billing/plans.ts
export const PLANS = {
  free:    { maxClients: 1,        maxMonthlyViews: 10_000,        features: { ai: false, video: false, customDomain: false } },
  starter: { maxClients: 5,        maxMonthlyViews: 100_000,       features: { ai: true,  video: true,  customDomain: false } },
  pro:     { maxClients: 20,       maxMonthlyViews: 1_000_000,     features: { ai: true,  video: true,  customDomain: true  } },
  scale:   { maxClients: Infinity, maxMonthlyViews: Infinity,      features: { ai: true,  video: true,  customDomain: true  } },
} as const;
```

Trial: `plan = 'pro'`, `subscription_status = 'trialing'` for 14 days, then a daily cron downgrades to `free` if no Stripe sub is attached.

---

## 9. Things we are NOT doing in this build

- **shadcn/ui** — use existing CreatorHub components.
- **Server Actions** — route handlers only.
- **Cloudflare Stream** — retired in Phase 5; Bunny.net Stream replaces it. `AGENTS.md` updated accordingly.
- **sonner / react-hook-form / zod** — use `Toaster` + native `<form>` + manual validation.
- **`relationship_*` legacy tables** — deleted in Phase 1.
- **Existing `/clients` UI** — replaced wholesale in Phase 2.
- **Multi-org-per-user** — Phase 9+. The schema supports it; the UI assumes the first org.
- **`team` role in petar plan** — split into `director` + `editor` per user's role list.
- **Magic-link invite for org members** — use Resend with a `/invite/[token]` URL that requires signup/login first.
- **Custom domains** — listed as a feature flag but not built in this scope.
- **Instagram metrics sync** — `content_metrics.source='manual'` only; `instagram_api` is forward-compatible.

---

## 10. Risks called out

| Risk | Mitigation |
|---|---|
| Dropping `relationship_*` deletes any real data | Confirm zero live users on those tables before running 0032 in production. The uncommitted `0031_relationship_retainer.sql` is **never applied** to prod. |
| Stripe org migration corrupts billing | Run backfill in a transaction; keep `profiles.stripe_customer_id` for one release before dropping. Add a reconciliation query in the runbook. |
| RLS gaps let one agency see another | Tests must include: anon cannot read; Agency A staff cannot read Agency B; `client_owner` of Client X cannot read Client Y; `editor` cannot escalate to admin. Run on every PR. |
| Bunny.net cost / delivery spike | `<VideoPlayer>` rules already enforce poster-then-play (no autoplay, no `preload="metadata"`). Bunny pricing is bandwidth-based — a single embed loop on a high-traffic page can rack up cost faster than per-minute Cloudflare. Keep these rules and add a per-org monthly bandwidth alert in Phase 8. |
| Bunny TUS upload reliability | TUS is resumable — but flaky on aggressive corporate networks. Configure `tus-js-client` with chunkSize=8MB, retryDelays=[0,3000,5000,10000]; surface a "resume upload" affordance if a chunk fails twice. |
| Anthropic costs from long transcripts | Cap input at 25k tokens; reject longer. Charge against plan AI quota. |
| Resend deliverability | Configure SPF/DKIM on `creatorhub.app` domain before Phase 1 ends. |
| Multi-org-per-user creep | Resolve `getSession().organization` to the user's *first* membership row in v1. Document that the API is forward-compatible. |
| `EXPECTED_SCHEMA_VERSION` drift | Bump in each migration session. Boot guard refuses to serve on mismatch in production. |

---

## 11. Open questions — status

1. **Resend domain** — **DEFERRED**. User will provide the sending domain (and SPF/DKIM/DMARC records) before Phase 1 invite flow goes live. Email-sending code is wired in Phase 1; `RESEND_FROM` left blank in `.env.example`. Invite flow is testable but un-deliverable until domain is set.
2. **Stripe Price IDs** — **DEFERRED to Phase 6**. The existing `standard | pro` Prices may not map cleanly onto `free | starter | pro | scale`; the user will create the four-tier Prices in Stripe Dashboard before Phase 6 finalizes. Pricing values themselves are decided at the end.
3. **Role model** — **RESOLVED**. WhatsApp-style: base role (`user` / `editor` / `director`) plus orthogonal `is_admin` flag. Admin powers gated to: invite/remove members, promote/demote admins, billing, delete clients. See §7.
4. **Video provider** — **RESOLVED → Bunny.net Stream**. Cheaper bandwidth-based pricing. `AGENTS.md` will be updated as part of Phase 5. Existing Cloudflare Stream wrapper (`src/lib/stream.ts`) is retired.
5. **Live data on `relationship_*` tables** — **CHECK PENDING.** User will run the count query in Supabase Studio (see below). If zero rows: Phase 1's `0032_drop_relationships.sql` runs clean. If non-zero: add a JSON export step before drop.

### Pre-Phase-1 SQL check (run in Supabase Studio)

```sql
select
  (select count(*) from public.creator_relationships)         as relationships,
  (select count(*) from public.relationship_tasks)            as tasks,
  (select count(*) from public.relationship_task_completions) as completions,
  (select count(*) from public.relationship_documents)        as documents,
  (select count(*) from public.relationship_links)            as links,
  (select count(*) from public.relationship_messages)         as messages,
  (select count(*) from public.notifications)                 as notifications;
```

If all seven are 0 (or only test rows from your own user_id), Phase 1 is unblocked. Otherwise, add an export-to-JSON step to the Phase 1 pre-flight.

---

## 12. Definition of done

The whole pivot is done when:

- [ ] Two agencies signed up via `/signup` see strictly isolated data.
- [ ] Agency admin can create up to plan limit of clients; upgrade CTA appears at limit.
- [ ] All 10 admin tabs render real data backed by the new schema.
- [ ] Pipeline drag-drop is smooth, persists, doesn't double-revalidate.
- [ ] Brand AI returns ≥5 suggestions and applies cleanly.
- [ ] Cloudflare Stream video upload + signed playback + threaded comments work.
- [ ] `/workspace/*` portal shows the creator's view with internal data filtered out.
- [ ] Stripe webhook updates `organizations.plan` / `subscription_status` idempotently.
- [ ] `npm run build` / `lint` / `test:rls` / `test:migration` all green.
- [ ] `EXPECTED_SCHEMA_VERSION` matches `max(schema_migrations.version)` in prod.
- [ ] CLAUDE.md §6 ("Out of scope: Multi-workspace / team mode") and §3 (Navigation) updated to reflect the pivot.
