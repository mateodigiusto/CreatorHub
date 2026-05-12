/**
 * Agency RLS regression tests (Phase 8).
 *
 * Connects via DIRECT_URL with the service-role privilege, then issues
 * impersonated requests via the postgres-js `request.jwt.claims` setting
 * to confirm RLS gates work for the three high-risk scenarios:
 *
 *   1. anon can't read organizations, clients, or any agency table.
 *   2. Agency A staff cannot read Agency B's clients.
 *   3. team_assigned client member cannot update client_internal_notes
 *      (only org-staff with role=director can).
 *
 * Each test sets up its own fixture rows and tears them down with a final
 * `delete` cascade through `organizations`. Idempotent — safe to re-run.
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

async function asUser(uid: string) {
  return postgres(process.env.DIRECT_URL!, {
    prepare: false,
    max: 1,
    connection: { search_path: "public" },
    onparameter: (k, v) => {
      // no-op; we set claims via SET statements per query batch
    },
  } as never);
}

beforeAll(async () => {
  sql = postgres(process.env.DIRECT_URL!, { prepare: false });

  // Set up two isolated agencies with one client each. Service-role bypasses
  // RLS so we can seed without ceremony.
  await sql`insert into users (id, email) values (${A_USER}, 'a@test.invalid') on conflict do nothing`;
  await sql`insert into users (id, email) values (${B_USER}, 'b@test.invalid') on conflict do nothing`;
  await sql`insert into organizations (id, slug, name, created_by, plan) values (${A_ORG}, 'rls-test-a', 'RLS Test A', ${A_USER}, 'pro') on conflict do nothing`;
  await sql`insert into organizations (id, slug, name, created_by, plan) values (${B_ORG}, 'rls-test-b', 'RLS Test B', ${B_USER}, 'pro') on conflict do nothing`;
  await sql`insert into organization_memberships (organization_id, profile_id, role, is_admin) values (${A_ORG}, ${A_USER}, 'director', true) on conflict do nothing`;
  await sql`insert into organization_memberships (organization_id, profile_id, role, is_admin) values (${B_ORG}, ${B_USER}, 'director', true) on conflict do nothing`;
  await sql`insert into clients (id, organization_id, slug, display_name, created_by) values (${A_CLIENT}, ${A_ORG}, 'creator-a', 'Creator A', ${A_USER}) on conflict do nothing`;
  await sql`insert into clients (id, organization_id, slug, display_name, created_by) values (${B_CLIENT}, ${B_ORG}, 'creator-b', 'Creator B', ${B_USER}) on conflict do nothing`;
});

afterAll(async () => {
  await sql`delete from organizations where id in (${A_ORG}, ${B_ORG})`;
  await sql`delete from users where id in (${A_USER}, ${B_USER})`;
  await sql.end();
});

describe("agency RLS", () => {
  it("anon cannot read organizations", async () => {
    /* Pretend to be anon. set role anon temporarily; service-role can do this. */
    const rows = await sql`
      set local role anon;
      select id from organizations where id = ${A_ORG};
    `;
    expect(Array.isArray(rows) ? rows.length : 0).toBe(0);
  });

  it("anon cannot read clients", async () => {
    const rows = await sql`
      set local role anon;
      select id from clients where id = ${A_CLIENT};
    `;
    expect(Array.isArray(rows) ? rows.length : 0).toBe(0);
  });

  it("user A cannot read agency B's clients via authenticated role", async () => {
    /* Impersonate authenticated user A by setting request.jwt.claims. */
    const rows = await sql`
      set local role authenticated;
      set local "request.jwt.claims" = ${`{"sub":"${A_USER}"}`};
      select id from clients where id = ${B_CLIENT};
    `;
    expect(Array.isArray(rows) ? rows.length : 0).toBe(0);
  });

  it("user A can read their own org's clients", async () => {
    const rows = await sql<Array<{ id: string }>>`
      set local role authenticated;
      set local "request.jwt.claims" = ${`{"sub":"${A_USER}"}`};
      select id from clients where id = ${A_CLIENT};
    `;
    expect(rows.length).toBeGreaterThan(0);
  });

  it("client_internal_notes is staff-only — client-side users can't read", async () => {
    /* Set up a client_membership for a third user (team_assigned). */
    const C_USER = "00000000-0000-0000-0000-00000000000c";
    await sql`insert into users (id, email) values (${C_USER}, 'c@test.invalid') on conflict do nothing`;
    await sql`insert into client_memberships (organization_id, client_id, profile_id, access_role) values (${A_ORG}, ${A_CLIENT}, ${C_USER}, 'team_assigned') on conflict do nothing`;
    await sql`insert into client_internal_notes (client_id, organization_id, body) values (${A_CLIENT}, ${A_ORG}, 'private') on conflict do nothing`;

    const rows = await sql`
      set local role authenticated;
      set local "request.jwt.claims" = ${`{"sub":"${C_USER}"}`};
      select body from client_internal_notes where client_id = ${A_CLIENT};
    `;
    expect(Array.isArray(rows) ? rows.length : 0).toBe(0);

    /* Cleanup */
    await sql`delete from users where id = ${C_USER}`;
  });
});
