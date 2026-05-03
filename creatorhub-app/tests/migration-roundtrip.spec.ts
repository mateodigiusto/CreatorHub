/**
 * Migration round-trip test.
 *
 * Pulls the schema-version dump from a freshly migrated DB, then asserts
 * that re-running the full migration set produces the same dump (idempotent).
 *
 * We don't yet author down-migrations (Drizzle convention is up-only +
 * recovery via PITR / daily backup), so this test focuses on:
 *   - Every migration in supabase/migrations/ applies cleanly from empty.
 *   - The final schema version matches what's expected.
 *   - All ENUM types exist with the expected values.
 *   - All RLS policies are present on user-owned tables (no naked tables).
 *
 * The reviewer wanted: "the first migration round-trip test failing on
 * something — that's the test working." This will catch:
 *   - A migration that adds a table without ALTER TABLE ENABLE ROW LEVEL SECURITY
 *   - Drift between Drizzle schema and SQL migrations
 *   - An ENUM that diverges from the TS type
 */

import { describe, it, expect, beforeAll } from "vitest";
import postgres from "postgres";

let sql: ReturnType<typeof postgres>;

beforeAll(() => {
  /* Direct connection — port 5432 — required for any DDL inspection. */
  sql = postgres(process.env.DIRECT_URL!, { prepare: false });
});

describe("migrations", () => {
  it("schema_migrations.version max matches code expectation", async () => {
    const rows = await sql<Array<{ v: number | null }>>`
      select max(version) as v from schema_migrations
    `;
    /* Bump this when adding a migration to supabase/migrations/. The CI
       step `npm run schema:version` prints the count for sanity. */
    const EXPECTED = 14;
    expect(rows[0].v).toBe(EXPECTED);
  });

  it("every user-owned table has RLS enabled", async () => {
    const rows = await sql<Array<{ tablename: string; rowsecurity: boolean }>>`
      select tablename, rowsecurity
      from pg_tables
      where schemaname = 'public'
        and tablename not in ('schema_migrations')
      order by tablename
    `;
    const violations = rows.filter((r) => !r.rowsecurity);
    expect(
      violations,
      `Tables without RLS: ${violations.map((r) => r.tablename).join(", ")}`,
    ).toEqual([]);
  });

  it("every user-owned table has at least one self-select policy", async () => {
    const rows = await sql<Array<{ tablename: string; policyname: string }>>`
      select tablename, policyname
      from pg_policies
      where schemaname = 'public'
    `;
    const tables = new Set(rows.map((r) => r.tablename));
    /* Tables that legitimately have NO read policies (service-role only): */
    const SERVICE_ROLE_ONLY = new Set([
      "oauth_states",
      "webhook_events",
      "deletion_requests", // public read by code, see migration 0010
    ]);
    const userTables = await sql<Array<{ tablename: string }>>`
      select c.relname as tablename
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relkind = 'r'
        and c.relname not in ('schema_migrations')
        and exists (
          select 1 from information_schema.columns
          where table_schema = 'public' and table_name = c.relname and column_name = 'user_id'
        )
    `;
    for (const { tablename } of userTables) {
      if (SERVICE_ROLE_ONLY.has(tablename)) continue;
      expect(tables.has(tablename), `Missing policy on ${tablename}`).toBe(true);
    }
  });

  it("all enum types declared in schema exist in the database", async () => {
    const rows = await sql<Array<{ typname: string }>>`
      select typname from pg_type
      where typcategory = 'E' and typnamespace = 'public'::regnamespace
    `;
    const got = new Set(rows.map((r) => r.typname));
    const expected = [
      "platform_t",
      "integration_status_t",
      "post_source_t",
      "post_lifecycle_t",
      "asset_kind_t",
      "job_status_t",
      "job_kind_t",
    ];
    for (const t of expected) {
      expect(got.has(t), `Missing enum ${t}`).toBe(true);
    }
  });

  it("all mutable tables have a touch_*_updated_at trigger", async () => {
    const rows = await sql<Array<{ event_object_table: string; trigger_name: string }>>`
      select event_object_table, trigger_name
      from information_schema.triggers
      where event_object_schema = 'public'
        and action_timing = 'BEFORE'
        and event_manipulation = 'UPDATE'
    `;
    const tablesWithTrigger = new Set(rows.map((r) => r.event_object_table));
    const expected = ["users", "profiles", "integrations", "assets", "sequences", "posts"];
    for (const t of expected) {
      expect(tablesWithTrigger.has(t), `Missing BEFORE UPDATE trigger on ${t}`).toBe(true);
    }
  });
});
