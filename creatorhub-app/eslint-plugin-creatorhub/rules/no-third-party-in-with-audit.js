/**
 * Rule: creatorhub/no-third-party-in-with-audit
 *
 * Walks the AST inside any `withAudit(..., async (tx) => { ... })` callback
 * and flags third-party calls that hold a Postgres transaction across an
 * external HTTP call (which exhausts pgbouncer's transaction-mode pool).
 *
 * Flagged patterns:
 *   - fetch(...) and globalThis.fetch(...)
 *   - imports of allow-listed platform SDKs
 *   - imports of internal platform clients under src/integrations/**
 *   - setTimeout / setInterval (proxy for "you might be polling")
 *
 * Multi-stage pattern: split into multiple withAudit calls; do API work
 * outside any transaction. See src/lib/audit.ts JSDoc.
 */

"use strict";

const SDK_ALLOW_LIST = new Set([
  "googleapis",
  "google-auth-library",
  "linkedin-api-client",
  "twitter-api-v2",
  "@supabase/supabase-js",
  "@supabase/ssr",
  "cloudflare",
  "mux-node",
  "@sentry/node",
  "@sentry/nextjs",
]);

function isWithAuditCallback(node) {
  /* withAudit(userId, entry, async (tx) => {...}) — the third arg is our
     callback. Match any function/arrow at index 2. */
  if (node.type !== "CallExpression") return null;
  if (node.callee.type !== "Identifier" || node.callee.name !== "withAudit") return null;
  if (node.arguments.length < 3) return null;
  const cb = node.arguments[2];
  if (cb.type !== "ArrowFunctionExpression" && cb.type !== "FunctionExpression") return null;
  return cb;
}

function isFetchCall(node) {
  if (node.type !== "CallExpression") return false;
  const c = node.callee;
  if (c.type === "Identifier" && c.name === "fetch") return true;
  if (
    c.type === "MemberExpression" &&
    c.property.type === "Identifier" &&
    c.property.name === "fetch" &&
    c.object.type === "Identifier" &&
    (c.object.name === "globalThis" || c.object.name === "window")
  ) {
    return true;
  }
  return false;
}

function isTimerCall(node) {
  return (
    node.type === "CallExpression" &&
    node.callee.type === "Identifier" &&
    (node.callee.name === "setTimeout" || node.callee.name === "setInterval")
  );
}

function walk(node, visitor) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const child of node) walk(child, visitor);
    return;
  }
  if (typeof node.type === "string") {
    visitor(node);
    for (const key of Object.keys(node)) {
      if (key === "parent" || key === "loc" || key === "range") continue;
      walk(node[key], visitor);
    }
  }
}

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Forbid third-party calls (fetch, platform SDKs, timers) inside withAudit() callbacks. Use the multi-stage pattern.",
    },
    schema: [],
    messages: {
      fetch:
        "fetch() call inside withAudit() — holds a Postgres transaction across an external HTTP call. Split into multi-stage audit pattern (see src/lib/audit.ts).",
      sdk:
        "Platform SDK import `{{source}}` reachable inside withAudit() callback — same transaction-pool risk as fetch. Split into multi-stage audit pattern.",
      integration:
        "Integration client import `{{source}}` inside withAudit() — likely makes external HTTP calls. Move outside the transaction.",
      timer:
        "{{name}}() inside withAudit() — likely a polling loop. Holding a transaction across polls exhausts pgbouncer.",
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        const cb = isWithAuditCallback(node);
        if (!cb) return;

        /* Walk the callback body looking for forbidden patterns. */
        walk(cb.body, (n) => {
          if (isFetchCall(n)) {
            context.report({ node: n, messageId: "fetch" });
            return;
          }
          if (isTimerCall(n)) {
            context.report({
              node: n,
              messageId: "timer",
              data: { name: n.callee.name },
            });
            return;
          }
          /* Detect imports referenced through known names — best effort. */
          if (n.type === "ImportExpression" && n.source && n.source.type === "Literal") {
            const src = String(n.source.value);
            if (SDK_ALLOW_LIST.has(src) || src.startsWith("@/integrations/")) {
              context.report({
                node: n,
                messageId: src.startsWith("@/integrations/") ? "integration" : "sdk",
                data: { source: src },
              });
            }
          }
        });
      },
    };
  },
};
