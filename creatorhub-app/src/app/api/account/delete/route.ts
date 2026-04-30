/**
 * POST /api/account/delete
 *
 * Soft-deletes the authed user's account. Steps:
 *   1. Insert a `deletion_requests` row with a fresh confirmation code.
 *   2. Set `users.deleted_at = now()` so subsequent logins are rejected.
 *   3. Mark all integrations 'revoked' (Phase 2 will add the real platform
 *      token-revocation calls; for Phase 1 there are no integrations yet).
 *   4. Audit log via withAudit.
 *   5. Sign the user out so the session cookie clears.
 *
 * Hard delete (full row + Storage cascade) runs ≥30 days later via the
 * `finalize_deletion` cron job (not implemented yet — soft-delete is enough
 * for v1; Meta DSR's 30-day clock starts now).
 *
 * Response includes the confirmation code; UI redirects to
 * `/data-deletion-status?code=...` so the user can see status.
 */

import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { withAudit } from "@/lib/audit";
import { schema } from "@/db";
import { getSupabaseServer } from "@/lib/supabase/server";
import { log } from "@/lib/log";

function generateConfirmationCode(): string {
  /* 12 hex chars — short enough for a URL, long enough that brute force
     against a tiny table is pointless. */
  return randomBytes(6).toString("hex");
}

export async function POST() {
  const supabase = await getSupabaseServer();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const userId = userRes.user.id;

  const code = generateConfirmationCode();

  try {
    await withAudit(
      userId,
      {
        actor: "user",
        action: "user.deletion_initiated",
        targetType: "user",
        targetId: userId,
        metadata: { source: "user", confirmation_code: code },
      },
      async (tx) => {
        await tx.insert(schema.deletionRequests).values({
          userId,
          source: "user",
          confirmationCode: code,
          reason: "user_initiated",
        });
        await tx
          .update(schema.users)
          .set({ deletedAt: new Date() })
          .where(eq(schema.users.id, userId));
        /* Phase 2 will revoke real platform tokens here. */
        await tx
          .update(schema.integrations)
          .set({ status: "revoked", disconnectedAt: new Date() })
          .where(eq(schema.integrations.userId, userId));
      },
    );
  } catch (err) {
    log.error("account.delete.failed", err);
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }

  /* Clear the session cookie. After this returns the user is signed out. */
  await supabase.auth.signOut();

  return NextResponse.json({ ok: true, confirmationCode: code });
}
