/**
 * Rule: creatorhub/no-raw-db-import-in-app
 *
 * Blocks raw `dbInternal` / `escapeHatch` imports from app-code paths
 * (server components, client components, api routes that aren't crons or
 * webhooks). App code reaches the DB through:
 *   - Supabase server client (RLS-protected) for request-bound paths
 *   - forUser(userId) wrapper for service-role paths (crons + webhooks)
 *
 * Allowed callers:
 *   - src/db/**           (the wrapper itself)
 *   - src/lib/audit.ts    (audit lib uses dbInternal directly for the
 *                          short tx pattern; reviewed in code review)
 *   - src/app/api/cron/** (background workers)
 *   - src/app/api/webhooks/** (webhook handlers — also use forUser)
 *   - tests/**            (RLS suite, round-trip)
 *   - eslint-plugin-creatorhub/** (test fixtures)
 */

"use strict";

const FORBIDDEN_NAMES = new Set(["dbInternal", "escapeHatch"]);

function isAllowedFile(filename) {
  if (!filename) return false;
  return (
    filename.includes("/src/db/") ||
    filename.includes("/src/lib/audit.ts") ||
    filename.includes("/src/app/api/cron/") ||
    filename.includes("/src/app/api/webhooks/") ||
    filename.includes("/tests/") ||
    filename.includes("/eslint-plugin-creatorhub/")
  );
}

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Forbid raw dbInternal / escapeHatch imports in app code. Use the Supabase server client or forUser(userId).",
    },
    schema: [],
    messages: {
      forbidden:
        "App code must not import `{{name}}` directly. Use the Supabase server client (request-bound) or `forUser(userId)` (cron/webhook). See src/db/forUser.ts.",
    },
  },
  create(context) {
    const filename = context.filename || context.getFilename();
    if (isAllowedFile(filename)) return {};
    return {
      ImportDeclaration(node) {
        const source = node.source.value;
        if (typeof source !== "string") return;
        if (
          source === "@/db" ||
          source === "@/db/index" ||
          source === "@/db/forUser" ||
          source.endsWith("/src/db") ||
          source.endsWith("/src/db/index") ||
          source.endsWith("/src/db/forUser")
        ) {
          for (const spec of node.specifiers) {
            if (spec.type !== "ImportSpecifier") continue;
            const imported = spec.imported && spec.imported.name;
            if (FORBIDDEN_NAMES.has(imported)) {
              context.report({
                node: spec,
                messageId: "forbidden",
                data: { name: imported },
              });
            }
          }
        }
      },
    };
  },
};
