# Agency pivot — pre-flight checks

Run **before** Phase 1's migration `0032_drop_relationships.sql` is applied to production.

Resolves agency-clients-module §11 open question #5 ("Live data on `relationship_*` tables — CHECK PENDING").

---

## 1. Count rows in the legacy relationship tables

Open Supabase Studio → SQL Editor → run:

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

## 2. Decide

| Result | Action |
|---|---|
| All seven counts are `0` | **Unblocked.** Phase 1's `0032_drop_relationships.sql` runs clean — proceed. |
| Only your own test rows (single `user_id` matches yours) | **Unblocked.** Note in the migration PR description that the dropped rows were dev-only. |
| Any other user's data | **BLOCKED.** Export before dropping (step 3). |

## 3. Export before drop (only if blocked)

```sql
copy (select * from public.creator_relationships)         to '/tmp/creator_relationships.json'         with (format csv, header);
copy (select * from public.relationship_tasks)            to '/tmp/relationship_tasks.json'            with (format csv, header);
copy (select * from public.relationship_task_completions) to '/tmp/relationship_task_completions.json' with (format csv, header);
copy (select * from public.relationship_documents)        to '/tmp/relationship_documents.json'        with (format csv, header);
copy (select * from public.relationship_links)            to '/tmp/relationship_links.json'            with (format csv, header);
copy (select * from public.relationship_messages)         to '/tmp/relationship_messages.json'         with (format csv, header);
copy (select * from public.notifications)                 to '/tmp/notifications.json'                 with (format csv, header);
```

(Supabase Studio's CSV export from the table editor also works — one click per table.) Stash the files in a private bucket or 1Password vault; the pivot is irreversible once 0032 runs.

## 4. Verify `notifications` is unused outside the legacy module

Migration `0032_drop_relationships.sql` drops `notifications` **only if** grep confirms zero references outside the Clients module. Re-run before applying:

```bash
cd creatorhub-app
rg -l '\bnotifications\b' src/ | grep -vE 'clients|\.test\.|\.spec\.|node_modules'
```

If anything outside `src/components/clients/`, `src/app/api/clients/`, and `src/lib/clients/` references the table, leave the drop out of 0032 — convert it to `truncate` or move to a follow-up migration.

## 5. Sign-off

Add a line to the Phase 1 PR description:

> Pre-flight: relationship_* counts = {…}. Notifications references outside /clients = {…}. Cleared for 0032.

---

## Risks

| Risk | Mitigation |
|---|---|
| Production has rows we didn't anticipate | The count query is read-only — running it has no side effects. |
| `copy … to '/tmp/…'` requires server-side access | Supabase Studio's export-to-CSV from the table grid is the fallback. Pgbouncer + pooled connections may also reject server-side `copy to file`; use the Studio button. |
| Migration applied without pre-flight | The 0032 SQL is `drop … if exists cascade` — destructive and silent on empty tables. Once run in prod there's no rollback short of restoring from a PITR snapshot (Supabase Pro+ only). |
