# Schema version bump runbook

`instrumentation.ts` reads `EXPECTED_SCHEMA_VERSION` from env at boot and compares to `max(schema_migrations.version)`. In production a mismatch throws and the process refuses to serve traffic. In dev it logs a warning. The intent is to fail fast when a deploy lands without its migration applied, or a migration is applied without the matching code.

Bumping the version is a one-line change in two files but it has to happen **exactly once per migration session**, and only after every migration in the session has been applied to staging *and* production.

---

## When to bump

After applying **all** migrations in a session — not after each one. A "session" is whatever set of migrations ships together in one deploy.

| Scenario | Bump? |
|---|---|
| Local migration applied to dev project only | No |
| Migrations 0033 + 0034 + 0035 ship in one PR | Yes — once, to `max(version)` |
| Hotfix migration to live prod | Yes |
| Backfill script that doesn't add a migration row | No (no schema change) |

---

## How to bump

After all migrations in the session are applied:

1. **Confirm the live max.**
   ```bash
   cd creatorhub-app
   npm run schema:version
   # or, against the cloud project directly
   psql "$DIRECT_URL" -c "select max(version) from public.schema_migrations;"
   ```

2. **Edit `.env.example`.** Look for:
   ```
   EXPECTED_SCHEMA_VERSION=NN
   ```
   Set `NN` to the value from step 1.

3. **Edit `tests/migration-roundtrip.spec.ts`.** Search for `EXPECTED_SCHEMA_VERSION` or a literal constant the test asserts against. Bump it to the same value.

4. **Bump in Vercel** for both Production and Preview environments. `.env.example` is documentation — Vercel reads from the project envs at deploy time.

5. **Commit.** Title: `bump EXPECTED_SCHEMA_VERSION to N (migrations 00XX..00YY)`. Mention each migration applied in the body.

---

## Order: code first or env first?

**Env first.** If you bump `EXPECTED_SCHEMA_VERSION` in Vercel before the migration runs in prod, the next deploy will refuse to boot — but the previous deploy is still running. That's a safe state. If you bump the migration first and forget the env, the running deploy keeps booting fine (its expected version still matches the old `max(version)`).

The risky order is: migration runs in prod → deploy ships → boot guard fires *because env wasn't bumped*. The boot guard refuses to serve, which means a rollback. Bump env first, migration second, deploy third.

Recommended order:

1. Open PR with the migration SQL.
2. Apply migration to staging.
3. Bump `EXPECTED_SCHEMA_VERSION` in **staging** Vercel env.
4. Re-deploy staging — boot guard should pass.
5. Apply migration to prod.
6. Bump `EXPECTED_SCHEMA_VERSION` in **prod** Vercel env.
7. Merge + deploy.

If step 5 fails, step 6 doesn't run — prod keeps booting on the old expected version (it was happy before).

---

## What can go wrong

### A) Bumped env, forgot to apply migration

Boot guard fires: `expected schema version N, found N-1`. Process refuses traffic.

**Fix:** apply the missing migration immediately. Don't roll back the env — that's the wrong direction (rolling back creates a new "behind" state).

### B) Applied migration, forgot to bump env

Boot guard *might* not fire — depends on direction. `instrumentation.ts` only fails if `max(version) < EXPECTED_SCHEMA_VERSION`. If `max(version)` is now higher than the env, the boot guard considers that fine ("DB is ahead, code can catch up").

This is intentional: ship the schema first, ship the code reading it next. **But** the test suite (`tests/migration-roundtrip.spec.ts`) will fail until the constant is bumped. Catch this in CI before merging.

### C) Wrong direction (`EXPECTED_SCHEMA_VERSION > max(version)`)

Boot guard fires in production. Refuses traffic.

**Fix:** roll back the env to the prior value, then apply the missing migration. If you're mid-deploy and the migration is applied seconds later, the guard will pass on the next boot — but in the meantime traffic is 503'd.

### D) Local dev says "warn" — easy to ignore

Dev is intentionally permissive (devs are often mid-migration). The warning line in console looks like:

```
[instrumentation] WARN: schema version drift — expected 34, DB has 33
```

Treat this as a TODO, not a debug log. Don't let it accumulate across sessions — if you see it on `npm run dev`, run `npm run db:migrate` before touching feature code.

---

## Multi-session bumps (multiple PRs land same day)

If two PRs each touch migrations and ship the same day:

1. PR 1 lands migration 0035; bumps env to 35; deploys.
2. PR 2 has migration 0036 — its diff says "bump to 36". Rebase PR 2 onto main *after* PR 1 lands so it sees env=35 as baseline.
3. PR 2 applies migration 0036; bumps env to 36; deploys.

Don't let two open PRs each propose `EXPECTED_SCHEMA_VERSION=N+1`. The merger picks one as the canonical bump; the other gets rebased.

---

## Sign-off checklist (run on every PR that adds a migration)

- [ ] Migration file numbered `00XX_…` exists and ends with `insert into schema_migrations (version) values (XX)`.
- [ ] Drizzle mirror in `src/db/schema.ts` updated.
- [ ] `npm run test:migration` passes locally.
- [ ] `EXPECTED_SCHEMA_VERSION` in `.env.example` matches the new `max(version)`.
- [ ] `tests/migration-roundtrip.spec.ts` constant updated to match.
- [ ] Vercel envs (prod + preview) bumped before deploy.
- [ ] `mcp__supabase__get_advisors security` + `performance` clean (or remediation queued).
