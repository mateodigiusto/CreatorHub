/**
 * `withAudit` — wraps a DB-only action and writes an audit_log entry in
 * the same Postgres transaction. Action and audit row commit or roll
 * back together.
 *
 * **Strict rule: `withAudit` wraps DB-only work.** No `fetch`, no
 * platform SDK calls, no `setTimeout`. Holding a Postgres transaction
 * across an external HTTP call exhausts the pgbouncer pool under load.
 *
 * For multi-stage actions involving third-party APIs (publish to
 * Instagram, transcode upload, etc.), use the multi-stage pattern:
 * one `withAudit` per DB stage; the API dance happens between stages
 * with no transaction held.
 *
 * The `creatorhub/no-third-party-in-with-audit` ESLint rule walks the
 * AST inside any `withAudit(..., async (tx) => {...})` callback and
 * fails the build on `fetch(`, allow-listed SDK imports,
 * `src/integrations/**` imports, `setTimeout`, and `setInterval`.
 */

import { dbInternal } from "@/db";
import { auditLog } from "@/db/schema";
import type { NewAuditEntry } from "@/db/schema";

export type AuditEntry = Omit<NewAuditEntry, "id" | "userId" | "at">;

type Tx = Parameters<Parameters<typeof dbInternal.transaction>[0]>[0];

/**
 * @param userId — the user this action affects.
 * @param entry  — action + target metadata. `metadata` is stringified to
 *                 jsonb; runs through redact() on write so we don't audit
 *                 secrets even if a caller forgets.
 * @param fn     — DB-only callback. Must return its result; will be
 *                 returned to the caller after the audit row commits.
 */
export async function withAudit<T>(
  userId: string,
  entry: AuditEntry,
  fn: (tx: Tx) => Promise<T>,
): Promise<T> {
  if (!userId) throw new Error("withAudit requires a userId");
  return dbInternal.transaction(async (tx) => {
    const result = await fn(tx);
    await tx.insert(auditLog).values({
      userId,
      actor: entry.actor,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId,
      metadata: entry.metadata ?? null,
      ip: entry.ip ?? null,
      userAgent: entry.userAgent ?? null,
    });
    return result;
  });
}

/**
 * Convenience for multi-stage workflows: write a standalone audit row
 * outside any transaction. Use this between DB stages of a multi-stage
 * action when you've finished a DB write and want to record the stage
 * boundary without re-opening a transaction.
 *
 * Example flow:
 *   withAudit(userId, { action: 'post.publish_initiated' }, fn)  // tx 1
 *   await publishToInstagram(...)                                 // no tx
 *   withAudit(userId, { action: 'post.published' }, fn)          // tx 2
 *
 * Don't use this when you can wrap the action and audit together in one
 * tx — `withAudit` is preferred for DB-only work.
 */
export async function audit(userId: string, entry: AuditEntry): Promise<void> {
  if (!userId) throw new Error("audit requires a userId");
  await dbInternal.insert(auditLog).values({
    userId,
    actor: entry.actor,
    action: entry.action,
    targetType: entry.targetType,
    targetId: entry.targetId,
    metadata: entry.metadata ?? null,
    ip: entry.ip ?? null,
    userAgent: entry.userAgent ?? null,
  });
}
