# Relationship tables drop runbook

Migration `0032_drop_relationships.sql` removes seven tables that backed the legacy `/clients` Creator Management Hub UI:

```
creator_relationships
relationship_tasks
relationship_task_completions
relationship_documents
relationship_links
relationship_messages
notifications      (only if grep confirms zero external references)
```

These tables are replaced by the agency-clients schema (`organizations`, `clients`, `organization_memberships`, `client_memberships`, …) in migrations 0033 + 0034. The drop is destructive — there is no rollback short of restoring from PITR. This runbook is the gate.

---

## 1. Pre-flight: confirm zero live data

Run this in **Supabase Studio → SQL editor** against **production**:

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

**Decision matrix:**

| Result | Action |
|---|---|
| All seven counts are `0` | Skip §2. Go to §3. |
| Counts are non-zero **but only your own `user_id`** | Optional: export anyway (§2). Then §3. |
| Counts non-zero **and include other users** | Mandatory export (§2). Notify those users before §3. |

To check whose rows exist:

```sql
select coalesce(manager_id::text, creator_id::text) as user_id, count(*)
from public.creator_relationships group by 1 order by 2 desc;
```

---

## 2. Export-to-JSON (only if §1 found live data)

Service-role-only — run via the Supabase CLI or a one-off script (don't use anon).

```bash
# from creatorhub-app/
npx tsx <(cat <<'EOF'
import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "node:fs";
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);
const tables = [
  "creator_relationships",
  "relationship_tasks",
  "relationship_task_completions",
  "relationship_documents",
  "relationship_links",
  "relationship_messages",
  "notifications",
];
const dump: Record<string, unknown[]> = {};
for (const t of tables) {
  const { data, error } = await sb.from(t).select("*");
  if (error) { console.error(t, error.message); continue; }
  dump[t] = data ?? [];
  console.log(t, data?.length ?? 0);
}
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const path = `relationship-tables-backup-${stamp}.json`;
writeFileSync(path, JSON.stringify(dump, null, 2));
console.log("wrote", path);
EOF
)
```

Verify the JSON file before continuing. Move it somewhere safe (S3, 1Password, etc.) — it is the **only** record of those rows after §3.

---

## 3. Apply the migration

Confirm `0031_relationship_retainer.sql` is **not** in `supabase/migrations/` — it must have been deleted (it was uncommitted; never applied). Phase 1 deletes it. If it's still present, stop and clean up first.

```bash
ls creatorhub-app/supabase/migrations/0031* 2>/dev/null  # expect: no output
ls creatorhub-app/supabase/migrations/0032_drop_relationships.sql  # expect: file
```

Apply via MCP (preferred — fast, transactional):

```
mcp__supabase__apply_migration 0032_drop_relationships
```

Or CLI:

```bash
cd creatorhub-app
npm run db:migrate
```

Verify:

```sql
select to_regclass('public.creator_relationships')      -- expect: null
     , to_regclass('public.relationship_tasks')         -- expect: null
     , (select max(version) from public.schema_migrations);  -- expect: 32 or higher
```

---

## 4. Post-apply advisors

```
mcp__supabase__get_advisors security
mcp__supabase__get_advisors performance
```

Any new WARN about a leftover view / function / index referencing the dropped tables: write a remediation migration immediately. Common ones:

- `public.is_relationship_member(uuid)` — already dropped by 0032 (verify with `\df is_relationship_member`).
- Orphaned policies on `notifications` if it survived — re-run with the `drop table public.notifications cascade;` line uncommented.

---

## 5. Restoration (only if §3 went wrong)

Supabase Pro PITR window is the only path. If PITR is not enabled, the §2 export is the only data left.

To restore from the §2 JSON dump, write a one-off `tsx` script that `INSERT … ON CONFLICT DO NOTHING`s each table back. The new schema does not preserve FKs to the old tables — you'd be restoring into a DB that has no relationship UI anymore. Treat this as an archaeological recovery, not a rollback.

---

## Sign-off checklist

- [ ] §1 query run; counts recorded in PR description.
- [ ] If non-zero: §2 backup file SHA-256 recorded; file moved off-host.
- [ ] §3 migration applied; `to_regclass` checks return `null`.
- [ ] §4 advisors clean.
- [ ] `EXPECTED_SCHEMA_VERSION` bumped (see `schema-version-bump.md`).
