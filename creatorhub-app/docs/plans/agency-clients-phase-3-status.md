# Phase 3 — Workspace data tables + Brand Build + Strategy

Status doc for the Phase 3 build. **Read the §"Where to find each deliverable" section first — this build ran against an aggressive parallel-session stash loop, and Phase 3 files are scattered across multiple stash entries.**

---

## Where to find each deliverable

During this build, the working tree was wiped 3+ times by parallel sessions running `git stash push -u`. The user's recovery workflow is to `git stash apply` each entry and merge. As of the last write attempt, the layout was:

### In the latest working tree (survived the last stash)

- `src/app/_phase3-pending/api/clients/[slug]/brand-profile/route.ts`
- `src/app/_phase3-pending/api/clients/[slug]/brand-profile/analyze/route.ts`
- `src/db/workspace-schema.ts` (Drizzle mirror)
- `supabase/migrations/0035_client_workspace.sql` (re-written below)
- `docs/plans/agency-clients-phase3-status.md` (this file)

### Likely in `stash@{0}` or earlier stashes ("more parallel-session work")

These were written during the build but stashed before they could be committed. Recover via `git stash list` then `git stash show -p stash@{N}` to confirm.

- `src/lib/agency/workspace-types.ts` — TS shapes for BrandProfile, ClientInternalNotes, AnalyzerResult, plus form metadata for 14 brand-build fields + 4 strategy fields.
- `src/lib/agency/phase3-stubs.ts` — stub `getAgencySession`, `requireClientAccess`, `requireOrgRole`, `assertPlanAllows` that route handlers import from. Replace at cutover with the real Phase-1/2 modules.
- `src/lib/ai/anthropic.ts` — Anthropic SDK lazy init (dynamic `await import` so build passes before `npm i @anthropic-ai/sdk`).
- `src/lib/ai/analyze-transcript.ts` — system prompt + parser that returns ≥5 typed brand-profile suggestions.
- `src/components/agency/BrandBuildForm.tsx` — 14-field auto-save-on-blur form.
- `src/components/agency/NextStepsForm.tsx` — 4-field strategy form, same row as brand_profiles.
- `src/components/agency/InternalNotesForm.tsx` — director-only textarea, debounced auto-save.
- `src/components/agency/TranscriptAnalyzer.tsx` — `<dialog>` modal that posts a transcript, renders suggestions with checkboxes, applies selected.
- `src/app/_phase3-pending/api/clients/[slug]/internal-notes/route.ts` — GET / PATCH (director-only).
- `src/app/_phase3-pending/clients-[slug]/brand-build/page.tsx`
- `src/app/_phase3-pending/clients-[slug]/strategy/page.tsx`
- `src/app/_phase3-pending/clients-[slug]/internal/page.tsx`

**Recovery hint:** when popping stashes, the route handlers in `_phase3-pending/api/clients/[slug]/brand-profile/` are the LATEST version — they were re-written after each stash. Keep working-tree on conflict.

---

## Pre-flight problem the user should know about

The migration 0035 below FKs `organizations` and `clients`, and its RLS policies call `is_org_staff()` and `has_client_access()`. Those tables and functions come from Phase 1 + Phase 2 migrations (0033, 0034). **Do not apply 0035 until 0033 and 0034 have been applied first.** If applied out of order, every FK and RLS policy will fail.

After cutover, run Supabase advisors `security` + `performance` and add a remediation migration if any new WARNs surface.

---

## Cutover checklist (run AFTER Phase 1 + Phase 2 are merged and stashes recovered)

1. **Recover the stashed Phase 3 files** by `git stash apply` on the stashes listed above. Move them into the canonical paths.

2. **Apply the migration**
   ```bash
   npx supabase migration up
   ```

3. **Move staged routes/pages into place**
   ```bash
   git mv src/app/_phase3-pending/api/clients/[slug]/brand-profile           src/app/api/clients/[slug]/brand-profile
   git mv src/app/_phase3-pending/api/clients/[slug]/internal-notes          src/app/api/clients/[slug]/internal-notes
   git mv src/app/_phase3-pending/clients-[slug]/brand-build                 src/app/clients/[slug]/brand-build
   git mv src/app/_phase3-pending/clients-[slug]/strategy                    src/app/clients/[slug]/strategy
   git mv src/app/_phase3-pending/clients-[slug]/internal                    src/app/clients/[slug]/internal
   rm -r src/app/_phase3-pending
   ```

4. **Inline Drizzle schema** — paste contents of `src/db/workspace-schema.ts` into `src/db/schema.ts` (at the bottom, after Phase 2's tables), then delete `workspace-schema.ts`.

5. **Replace stubs with real imports.** In each Phase 3 file currently importing from `@/lib/agency/phase3-stubs`:
   - `getAgencySession` → `@/lib/auth/session` `getSession`
   - `requireClientAccess` → `@/lib/auth/require-client-access`
   - `requireOrgRole` → `@/lib/auth/require-org-role`
   - `assertPlanAllows` → `@/lib/billing/limits`

   Delete `src/lib/agency/phase3-stubs.ts`.

6. **Bump `EXPECTED_SCHEMA_VERSION`** in `.env.example` + `tests/migration-roundtrip.spec.ts` to the final value after all migrations apply.

7. **Wire SubNav** — Phase 2's `[slug]/layout.tsx` should include three Phase-3 tabs:
   - `{ label: "Brand build",   href: ".../brand-build" }`
   - `{ label: "Strategy",      href: ".../strategy" }`
   - `{ label: "Internal",      href: ".../internal", staffOnly: true }`

8. **Install AI dep + switch to static import**
   ```bash
   npm i @anthropic-ai/sdk
   ```
   Then in `src/lib/ai/anthropic.ts` replace the dynamic import with:
   ```ts
   import Anthropic from "@anthropic-ai/sdk";
   ```

9. **Lint + test pass**
   ```bash
   npm run lint && npm run build && npm run test:migration && npm run test:rls
   ```

---

## Things Phase 3 intentionally did NOT do

- **Did not edit `src/db/schema.ts`** — new tables live in `workspace-schema.ts` to avoid collision with parallel Phase 1/2/4 schema edits.
- **Did not edit `src/lib/agency/types.ts`** — owned by Phase 2.
- **Did not run `npm install`** — `@anthropic-ai/sdk` is referenced via dynamic `import()`; install at cutover.
- **Did not modify `tests/migration-roundtrip.spec.ts`** — bumping `EXPECTED_SCHEMA_VERSION` mid-flight would fight other agents. Update at cutover.
- **Did not delete the legacy `creator_relationships` code** — Phase 1's migration 0032 already drops the table; Phase 2 deletes the UI. Phase 3 leaves both alone.
- **Did not light up the AI-button plan-gate at the UI layer** — the route returns `403 plan_not_allowed` if `assertPlanAllows("aiAnalyzer")` rejects (Phase 6 wires the enforcement). The button is shown unconditionally for now.

---

## Acceptance criteria (verify after cutover)

- [ ] Brand fields persist across reload (PATCH → DB → GET reads it back).
- [ ] Strategy fields persist (same row as brand_profile).
- [ ] Pasting a transcript into `TranscriptAnalyzer` returns ≥5 suggestions; applying writes selected fields.
- [ ] Client portal user (`/workspace/...`) cannot see the Internal tab and `PATCH /internal-notes` returns 403 via RLS.
- [ ] `npm run test:rls` — agency A staff cannot read agency B's `brand_profiles` row.
