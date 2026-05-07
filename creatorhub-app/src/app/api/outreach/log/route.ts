/**
 * POST /api/outreach/log
 *
 * Records an editor's sent outreach for a creator. Append-only.
 * Optionally also bumps the editor's target row to status='pitched' so
 * the target list reflects the most recent send.
 *
 * Body:
 *   {
 *     creatorId: uuid     — required, FK → creator_directory
 *     method: outreach_method_t (default 'dm')
 *     messageText: string — required, 1..10000 chars
 *     sourceAnalysisIds?: uuid[] — transcripts the message referenced
 *     bumpTarget?: boolean (default true) — if true, set target.status='pitched'
 *   }
 *
 * RLS allows self-insert / self-read.
 */

import { NextResponse, type NextRequest } from "next/server";
import { eq, and } from "drizzle-orm";
import { withAudit } from "@/lib/audit";
import { schema } from "@/db";
import { getSupabaseServer } from "@/lib/supabase/server";
import { log } from "@/lib/log";

const VALID_METHODS = new Set([
  "dm", "email", "comment", "followup", "voice_note",
] as const);

type Method = "dm" | "email" | "comment" | "followup" | "voice_note";

type Body = {
  creatorId?: string;
  method?: Method;
  messageText?: string;
  sourceAnalysisIds?: string[];
  bumpTarget?: boolean;
};

export async function POST(req: NextRequest) {
  const supabase = await getSupabaseServer();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const userId = userRes.user.id;

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body.creatorId) {
    return NextResponse.json({ error: "missing_creator_id" }, { status: 400 });
  }
  const method: Method = body.method && VALID_METHODS.has(body.method) ? body.method : "dm";
  const text = (body.messageText ?? "").trim();
  if (!text) {
    return NextResponse.json({ error: "missing_message" }, { status: 400 });
  }
  if (text.length > 10_000) {
    return NextResponse.json({ error: "message_too_long" }, { status: 400 });
  }
  const sourceIds = Array.isArray(body.sourceAnalysisIds)
    ? body.sourceAnalysisIds.filter((s) => typeof s === "string").slice(0, 20)
    : [];
  const bumpTarget = body.bumpTarget !== false;

  /* Find the user's existing target row for this creator (if any) so we
     can link the log entry + optionally bump status. */
  const { data: targetRow } = await supabase
    .from("editor_creator_targets")
    .select("id, status")
    .eq("user_id", userId)
    .eq("creator_id", body.creatorId)
    .maybeSingle();
  type TargetLite = { id: string; status: string } | null;
  const target = (targetRow ?? null) as TargetLite;

  let logId: string | null = null;
  try {
    await withAudit(
      userId,
      {
        actor: "user",
        action: "outreach.logged",
        targetType: "creator_directory",
        targetId: body.creatorId,
        metadata: { method, sourceCount: sourceIds.length, length: text.length },
      },
      async (tx) => {
        const inserted = await tx
          .insert(schema.creatorOutreachLog)
          .values({
            userId,
            creatorId: body.creatorId!,
            targetId: target?.id ?? null,
            outreachMethod: method,
            messageText: text,
            sourceAnalysisIds: sourceIds,
          })
          .returning({ id: schema.creatorOutreachLog.id });
        logId = inserted[0].id;

        if (bumpTarget && target && target.status !== "pitched") {
          await tx
            .update(schema.editorCreatorTargets)
            .set({ status: "pitched" })
            .where(
              and(
                eq(schema.editorCreatorTargets.id, target.id),
                eq(schema.editorCreatorTargets.userId, userId),
              ),
            );
        }
      },
    );
  } catch (err) {
    log.error("outreach.log.failed", err);
    return NextResponse.json({ error: "log_failed" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    id: logId,
    targetBumped: bumpTarget && !!target && target.status !== "pitched",
  });
}
