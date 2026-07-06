/**
 * Agency RLS regression tests.
 *
 * Connects via DIRECT_URL with the service-role privilege, then runs each
 * assertion inside a transaction that impersonates a role + JWT claims via
 * `set_config(..., is_local => true)` — `SET` can't take bind parameters,
 * but `set_config()` can, so this is the safe way to parameterise an
 * impersonated query.
 *
 * Coverage:
 *   1. anon can't read organizations / clients / client_invites /
 *      inbox_events.
 *   2. Agency A staff can't read Agency B's clients / invites / inbox.
 *   3. client_internal_notes is staff-only — client-side users can't read.
 *   4. A `pending` client_membership grants no has_client_access(); flipping
 *      to `active` does.
 *
 * Each test seeds its own fixture rows and tears them down via a cascade
 * delete through `organizations` + `auth.users`. Idempotent — safe to re-run.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import postgres from "postgres";

let sql: ReturnType<typeof postgres>;

const A_USER = "00000000-0000-0000-0000-00000000000a";
const B_USER = "00000000-0000-0000-0000-00000000000b";
const A_ORG = "11111111-1111-1111-1111-11111111111a";
const B_ORG = "11111111-1111-1111-1111-11111111111b";
const A_CLIENT = "22222222-2222-2222-2222-22222222222a";
const B_CLIENT = "22222222-2222-2222-2222-22222222222b";

/**
 * Run `queryFn` inside a transaction impersonating `role`. Pass `sub` to set
 * `request.jwt.claims` (so RLS's `auth.uid()` resolves); pass null for anon.
 * `set_config(..., true)` scopes both to the transaction.
 */
async function asRole<T>(
  role: "anon" | "authenticated",
  sub: string | null,
  queryFn: (tx: postgres.TransactionSql) => Promise<T>,
): Promise<T> {
  return sql.begin(async (tx) => {
    if (sub) {
      await tx`select set_config('request.jwt.claims', ${JSON.stringify({ sub })}, true)`;
    }
    await tx`select set_config('role', ${role}, true)`;
    return queryFn(tx);
  }) as Promise<T>;
}

/**
 * Seed a test user. `public.users` FKs to `auth.users` (the
 * `on_auth_user_created` trigger fans the row out), and several agency
 * tables FK to `public.profiles` — so a test user needs all three.
 */
async function seedUser(id: string, email: string) {
  await sql`insert into auth.users (id, email) values (${id}, ${email}) on conflict (id) do nothing`;
  await sql`insert into profiles (user_id, creator_type, niche, primary_goal)
            values (${id}, 'agency', 'rls-test', 'audience')
            on conflict (user_id) do nothing`;
}

beforeAll(async () => {
  sql = postgres(process.env.DIRECT_URL!, { prepare: false });

  // Two isolated agencies, one client each. Service-role bypasses RLS.
  await seedUser(A_USER, "a@test.invalid");
  await seedUser(B_USER, "b@test.invalid");
  await sql`insert into organizations (id, slug, name, created_by, plan) values (${A_ORG}, 'rls-test-a', 'RLS Test A', ${A_USER}, 'pro') on conflict do nothing`;
  await sql`insert into organizations (id, slug, name, created_by, plan) values (${B_ORG}, 'rls-test-b', 'RLS Test B', ${B_USER}, 'pro') on conflict do nothing`;
  await sql`insert into organization_memberships (organization_id, profile_id, role, is_admin) values (${A_ORG}, ${A_USER}, 'director', true) on conflict do nothing`;
  await sql`insert into organization_memberships (organization_id, profile_id, role, is_admin) values (${B_ORG}, ${B_USER}, 'director', true) on conflict do nothing`;
  await sql`insert into clients (id, organization_id, slug, display_name, created_by) values (${A_CLIENT}, ${A_ORG}, 'creator-a', 'Creator A', ${A_USER}) on conflict do nothing`;
  await sql`insert into clients (id, organization_id, slug, display_name, created_by) values (${B_CLIENT}, ${B_ORG}, 'creator-b', 'Creator B', ${B_USER}) on conflict do nothing`;
});

afterAll(async () => {
  // The `enforce_org_has_admin` guard fires per-row even on a parent
  // cascade-delete, blocking removal of the org's last admin membership.
  // The app never deletes orgs (no DELETE policy on `organizations`), so
  // this only bites test teardown — disable the guard for the cleanup.
  await sql`alter table organization_memberships disable trigger trg_org_members_admin_guard`;
  await sql`delete from organizations where id in (${A_ORG}, ${B_ORG})`;
  // Deleting auth.users cascades to public.users → public.profiles.
  await sql`delete from auth.users where id in (${A_USER}, ${B_USER})`;
  await sql`alter table organization_memberships enable trigger trg_org_members_admin_guard`;
  await sql.end();
});

describe("agency RLS", () => {
  it("anon cannot read organizations", async () => {
    const rows = await asRole("anon", null, (tx) =>
      tx`select id from organizations where id = ${A_ORG}`,
    );
    expect(rows.length).toBe(0);
  });

  it("anon cannot read clients", async () => {
    const rows = await asRole("anon", null, (tx) =>
      tx`select id from clients where id = ${A_CLIENT}`,
    );
    expect(rows.length).toBe(0);
  });

  it("user A cannot read agency B's clients", async () => {
    const rows = await asRole("authenticated", A_USER, (tx) =>
      tx`select id from clients where id = ${B_CLIENT}`,
    );
    expect(rows.length).toBe(0);
  });

  it("user A can read their own org's clients", async () => {
    const rows = await asRole("authenticated", A_USER, (tx) =>
      tx`select id from clients where id = ${A_CLIENT}`,
    );
    expect(rows.length).toBeGreaterThan(0);
  });

  it("client_internal_notes is staff-only — client-side users can't read", async () => {
    const C_USER = "00000000-0000-0000-0000-00000000000c";
    await seedUser(C_USER, "c@test.invalid");
    await sql`insert into client_memberships (organization_id, client_id, profile_id, access_role, status) values (${A_ORG}, ${A_CLIENT}, ${C_USER}, 'team_assigned', 'active') on conflict do nothing`;
    await sql`insert into client_internal_notes (client_id, organization_id, body) values (${A_CLIENT}, ${A_ORG}, 'private') on conflict do nothing`;

    const rows = await asRole("authenticated", C_USER, (tx) =>
      tx`select body from client_internal_notes where client_id = ${A_CLIENT}`,
    );
    expect(rows.length).toBe(0);

    await sql`delete from auth.users where id = ${C_USER}`;
  });
});

/* ─── Onboarding-split (migration 0038) regressions ──────────────────────
   client_invites + inbox_events: org-staff-only, isolated per org.
   has_client_access(): a `pending` client_membership grants no access. */
describe("onboarding-split RLS (0038)", () => {
  beforeAll(async () => {
    await sql`insert into client_invites (organization_id, client_id, token, created_by) values (${A_ORG}, ${A_CLIENT}, 'rls-test-token-a', ${A_USER}) on conflict (token) do nothing`;
    await sql`insert into inbox_events (organization_id, kind, client_id, body) values (${A_ORG}, 'client_joined', ${A_CLIENT}, 'rls fixture event') on conflict do nothing`;
  });

  it("anon cannot read client_invites", async () => {
    const rows = await asRole("anon", null, (tx) =>
      tx`select id from client_invites where organization_id = ${A_ORG}`,
    );
    expect(rows.length).toBe(0);
  });

  it("anon cannot read inbox_events", async () => {
    const rows = await asRole("anon", null, (tx) =>
      tx`select id from inbox_events where organization_id = ${A_ORG}`,
    );
    expect(rows.length).toBe(0);
  });

  it("agency B staff cannot read agency A's client_invites", async () => {
    const rows = await asRole("authenticated", B_USER, (tx) =>
      tx`select id from client_invites where organization_id = ${A_ORG}`,
    );
    expect(rows.length).toBe(0);
  });

  it("agency B staff cannot read agency A's inbox_events", async () => {
    const rows = await asRole("authenticated", B_USER, (tx) =>
      tx`select id from inbox_events where organization_id = ${A_ORG}`,
    );
    expect(rows.length).toBe(0);
  });

  it("agency A staff CAN read their own client_invites", async () => {
    const rows = await asRole("authenticated", A_USER, (tx) =>
      tx`select id from client_invites where organization_id = ${A_ORG}`,
    );
    expect(rows.length).toBeGreaterThan(0);
  });

  it("a pending client_membership does NOT grant has_client_access()", async () => {
    const D_USER = "00000000-0000-0000-0000-00000000000d";
    await seedUser(D_USER, "d@test.invalid");
    await sql`insert into client_memberships (organization_id, client_id, profile_id, access_role, status) values (${A_ORG}, ${A_CLIENT}, ${D_USER}, 'client_owner', 'pending') on conflict (client_id, profile_id) do update set status = 'pending'`;

    const pendingRows = await asRole<Array<{ ok: boolean }>>(
      "authenticated",
      D_USER,
      (tx) => tx`select public.has_client_access(${A_CLIENT}) as ok`,
    );
    expect(pendingRows[0]?.ok).toBe(false);

    await sql`update client_memberships set status = 'active' where client_id = ${A_CLIENT} and profile_id = ${D_USER}`;
    const activeRows = await asRole<Array<{ ok: boolean }>>(
      "authenticated",
      D_USER,
      (tx) => tx`select public.has_client_access(${A_CLIENT}) as ok`,
    );
    expect(activeRows[0]?.ok).toBe(true);

    await sql`delete from auth.users where id = ${D_USER}`;
  });
});

/* ─── Multi-org-per-user (Phase 9) ───────────────────────────────────────
   The OrgSwitcher + /api/organizations/{mine,switch} all lean on one
   RLS guarantee: a user can read `organizations` / `organization_memberships`
   rows ONLY for orgs they're a member of. The /switch route's `not_a_member`
   403 is exactly that boundary surfaced as an HTTP error. */
describe("multi-org-per-user RLS (Phase 9)", () => {
  /* A third org that A_USER will join as a *second* membership. */
  const C_ORG = "11111111-1111-1111-1111-11111111111c";

  beforeAll(async () => {
    await sql`insert into organizations (id, slug, name, created_by, plan) values (${C_ORG}, 'rls-test-c', 'RLS Test C', ${A_USER}, 'pro') on conflict do nothing`;
    await sql`insert into organization_memberships (organization_id, profile_id, role, is_admin) values (${C_ORG}, ${A_USER}, 'director', true) on conflict do nothing`;
  });

  afterAll(async () => {
    await sql`alter table organization_memberships disable trigger trg_org_members_admin_guard`;
    await sql`delete from organizations where id = ${C_ORG}`;
    await sql`alter table organization_memberships enable trigger trg_org_members_admin_guard`;
  });

  it("user A with two memberships can read both of their orgs", async () => {
    const rows = await asRole<Array<{ organization_id: string }>>(
      "authenticated",
      A_USER,
      (tx) =>
        tx`select organization_id from organization_memberships
           where profile_id = ${A_USER} order by created_at`,
    );
    const orgIds = rows.map((r) => r.organization_id);
    expect(orgIds).toContain(A_ORG);
    expect(orgIds).toContain(C_ORG);
  });

  it("user A can read org C now that they're a member", async () => {
    const rows = await asRole("authenticated", A_USER, (tx) =>
      tx`select id from organizations where id = ${C_ORG}`,
    );
    expect(rows.length).toBeGreaterThan(0);
  });

  it("user B cannot switch into org C — no membership row visible", async () => {
    /* The /switch route checks `organization_memberships` for
       (profile_id, organization_id); RLS makes a foreign membership
       invisible, so the lookup is empty → route returns 403. */
    const rows = await asRole("authenticated", B_USER, (tx) =>
      tx`select organization_id from organization_memberships
         where profile_id = ${B_USER} and organization_id = ${C_ORG}`,
    );
    expect(rows.length).toBe(0);
  });

  it("user B cannot even read org C", async () => {
    const rows = await asRole("authenticated", B_USER, (tx) =>
      tx`select id from organizations where id = ${C_ORG}`,
    );
    expect(rows.length).toBe(0);
  });
});
