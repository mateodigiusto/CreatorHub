# Phase 10 — Risk mitigations (Section 10 of `agency-clients-module.md`)

The user calls Section 10 of the plan "Phase 10" — it's the table of nine risks and their mitigations. This file is the build record for those mitigations.

Built in parallel with Phases 1 + 2 (and, on disk, while Phase 3 / 4 / 5 / 6 work was also moving). The cardinal rule: **don't edit files the other agents own.** Anything that would have collided is recorded under "Deferred / pending" below.

## ⚠ Working-tree event during the build

Partway through this build, another parallel agent appears to have run a destructive operation (likely `git restore .` or `git checkout HEAD --`) that wiped most of the in-flight agency-clients work from the working tree, including the first pass of these runbooks. Surviving artefacts at the time of writing:

- `tests/rls-agency-escalation.spec.ts` — Risk #3 sibling suite (untracked)
- `src/components/agency/` (Phase 4 components — assets/calendar/metrics/pipeline subdirs)
- `src/app/_phase3-pending/api/` (Phase 3 staged routes)
- `src/db/workspace-schema.ts` (Phase 3 Drizzle mirror)
- `0032_drop_relationships.sql` (Phase 1)
- `.env.example` with `EXPECTED_SCHEMA_VERSION=33`

Gone (need to be re-shipped by their owning agents):
- `src/lib/agency/*`, `src/lib/auth/*`, `src/lib/billing/*`, `src/lib/ai/*`, `src/lib/bunny/*`, `src/lib/stripe/*`
- `src/app/clients/[slug]/*` route tree
- `scripts/backfill-subscriptions-to-orgs.ts`
- Migrations `0033_organizations.sql`, `0034_agency_clients.sql`, `0035_client_workspace.sql`, `0036_stripe_org_migration.sql`
- `docs/plans/{PHASE_2_NOTES,agency-clients-phase3-status,agency-clients-phase-4-NOTES}.md`
- `tests/rls-agency.spec.ts` (Phase 8 agent's work)

The runbooks below are the **second pass** — re-written after the wipe. They are pure markdown so they cannot collide with code-writing agents.

## Risk → artefact map

| # | Risk | Artefact | Status |
|---|---|---|---|
| 1 | Dropping `relationship_*` deletes any real data | `docs/runbooks/relationship-tables-drop.md` | ✅ shipped here |
| 2 | Stripe org migration corrupts billing | `docs/runbooks/stripe-org-migration.md` | ✅ shipped here |
| 3 | RLS gaps let one agency see another | `tests/rls-agency-escalation.spec.ts` (this phase) + `tests/rls-agency.spec.ts` (Phase 8 — was wiped, expect to return) | ✅ scenarios 3 (client_owner cross-client) + 4 (editor → admin self-escalation) covered in `rls-agency-escalation.spec.ts`. Scenarios 1, 2, partial 3 are expected to land back when the Phase 8 agent's `rls-agency.spec.ts` returns. |
| 4 | Bunny.net cost / delivery spike | `docs/runbooks/bunny-bandwidth-alert.md` | ✅ runbook shipped here; alert plumbing deferred — see below |
| 5 | Bunny TUS upload reliability | `src/lib/bunny/tus.ts` | ⏳ was shipped by Phase 5 agent with the exact config the risk calls for (`chunkSize=8MB`, `retryDelays=[0,3000,5000,10000]`, `parallelUploads=1`) — wiped in the working-tree event; expected to return |
| 6 | Anthropic costs from long transcripts | `src/lib/ai/anthropic.ts → MAX_TRANSCRIPT_TOKENS=25_000` | ⏳ was shipped by Phase 3 agent; wiped in the working-tree event; expected to return |
| 7 | Resend deliverability | `docs/runbooks/resend-deliverability.md` | ✅ shipped here |
| 8 | Multi-org-per-user creep | `docs/runbooks/multi-org-forward-compat.md` | ✅ shipped here (docs only — no code touched) |
| 9 | `EXPECTED_SCHEMA_VERSION` drift | `docs/runbooks/schema-version-bump.md` | ✅ shipped here |

## Deferred / pending (potential collisions with other agents)

Where Phase 10 would have had to **edit** another phase's file, the change is described here instead so it can be applied at merge time.

### a. Wire `recordPlanLimitBreadcrumb` into `assertPlanAllows`

`src/lib/agency/plan-limit-breadcrumb.ts` (Phase 3-era) already exists in spirit (also wiped — expect to return). Its JSDoc said "wire this in by adding a call inside the PlanLimitError constructor".

**Phase 2 owns `src/lib/billing/limits.ts`.** When Phase 2 lands again, add inside the `PlanLimitError` constructor:

```ts
import { recordPlanLimitBreadcrumb } from "@/lib/agency/plan-limit-breadcrumb";

// after: this.upgradeTo = nextPlanUp(currentPlan);
recordPlanLimitBreadcrumb({ capability, plan: currentPlan, message });
```

### b. Bunny bandwidth alert — daily cron handler

`docs/runbooks/bunny-bandwidth-alert.md` describes the alert. The actual cron handler that polls Bunny's stats API and writes to a `bunny_bandwidth_daily` table is **not** built here because:

1. The cron file path is `src/app/api/cron/run-jobs/route.ts`, owned by another agent (Phase 6 region).
2. The DB table needs a migration. Adding one here would collide with the planned `0037_subscriptions_finalize.sql`.

**Deferred to Phase 8.** When Phase 6 lands, add migration `0038_bunny_bandwidth.sql` (schema in the runbook) and extend the cron router with a `bunny_bandwidth` job kind.

### c. Multi-org-per-user TODO comment

`docs/runbooks/multi-org-forward-compat.md` documents the v1 behaviour. The code lives in `src/lib/auth/session.ts` (Phase 1's territory). At merge time, the Phase 1 agent adds a one-line `// TODO(multi-org): …` near the membership lookup. Not edited here.

### d. RLS agency suite reunification

After both `tests/rls-agency.spec.ts` (Phase 8 author — currently wiped) and `tests/rls-agency-escalation.spec.ts` (this phase) coexist again, fold them into a single file. The escalation suite was deliberately split so the two authors didn't fight over one file during parallel work.

## Acceptance

Phase 10 is done when:

- [ ] All 6 runbooks are checked in under `docs/runbooks/`.
- [ ] `tests/rls-agency-escalation.spec.ts` passes against a DB with migrations 0033 + 0034 applied (probe in `beforeAll` short-circuits gracefully if not).
- [ ] `src/lib/bunny/tus.ts` has `chunkSize=8MB`, `retryDelays=[0,3000,5000,10000]` (verified after Phase 5 lands again).
- [ ] `src/lib/ai/anthropic.ts → MAX_TRANSCRIPT_TOKENS` is 25_000 (verified after Phase 3 lands again).
- [ ] This NOTES file lists every deferred wiring step that touches another phase's file.

Run after Phase 1 + 2 land again:

```bash
npm run test -- tests/rls-agency-escalation.spec.ts
```

The setup probe short-circuits gracefully until migrations 0033 + 0034 are applied to the test DB.
