import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    /* RLS suite + migration round-trip both require a live local Supabase. */
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.spec.ts"],
    /* Long timeout — local Postgres roundtrips, not unit tests. */
    testTimeout: 30_000,
    hookTimeout: 30_000,
    /* Sequence: schema modifications across tests would race; serial. */
    pool: "forks",
    poolOptions: { forks: { singleFork: true } },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
});
