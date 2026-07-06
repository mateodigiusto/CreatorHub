import type { Config } from "drizzle-kit";

/**
 * Drizzle Kit config — used for `db:gen` (generate from schema) and `db:push`
 * (push schema to DB without a migration). For real migrations we author SQL
 * by hand in supabase/migrations/ so we can include RLS policies, triggers,
 * partial indexes, and everything else Drizzle Kit doesn't generate.
 *
 * Drizzle Kit is the safety net (catches schema drift between TS and SQL),
 * not the source of truth.
 */
export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  /**
   * DIRECT_URL bypasses pgbouncer (port 5432) and is required for migrations
   * because Drizzle Kit uses prepared statements that don't survive
   * transaction-mode pooling. App code uses DATABASE_URL (pgbouncer 6543).
   */
  dbCredentials: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
  verbose: true,
  strict: true,
} satisfies Config;
