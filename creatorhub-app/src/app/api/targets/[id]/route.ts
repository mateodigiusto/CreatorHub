/**
 * PATCH  /api/targets/[id]  — update status or notes
 * DELETE /api/targets/[id]  — remove from pitch list
 */

import { NextResponse, type NextRequest } from "next/server";
import { eq, and } from "drizzle-orm";
import { withAudit } from "@/lib/audit";
import { schema } from "@/db";
import { getSupabaseServer } from "@/lib/supabase/server";
import { log } from "@/lib/log";

const VALID_STATUS = new Set([
  "pitched", "responded", "client", "pass",
]);

type RouteContext = { params: Promise<{ id: string }> };

type PatchBody = {
  status?: string;
  notes?: string | null;
};

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const supabase = await getSupabaseServer();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const userId = userRes.user.id;

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (body.status !== undefined) {
    if (!VALID_STATUS.has(body.status)) {
      return NextResponse.json({ error: "invalid_status" }, { status: 400 });
    }
    patch.status = body.status;
  }
  if (body.notes !== undefined) {
    patch.notes = body.notes === null ? null : String(body.notes).slice(0, 4000);
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: true, updated: 0 });
  }

  try {
    await withAudit(
      userId,
      {
        actor: "user",
        action: "target.updated",
        targetType: "editor_creator_target",
        targetId: id,
        metadata: { fields: Object.keys(patch) },
      },
      async (tx) => {
        await tx
          .update(schema.editorCreatorTargets)
          .set(patch)
          .where(
            and(
              eq(schema.editorCreatorTargets.id, id),
              eq(schema.editorCreatorTargets.userId, userId),
            ),
          );
      },
    );
  } catch (err) {
    log.error("targets.patch.failed", err);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const supabase = await getSupabaseServer();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const userId = userRes.user.id;

  try {
    await withAudit(
      userId,
      {
        actor: "user",
        action: "target.deleted",
        targetType: "editor_creator_target",
        targetId: id,
      },
      async (tx) => {
        await tx
          .delete(schema.editorCreatorTargets)
          .where(
            and(
              eq(schema.editorCreatorTargets.id, id),
              eq(schema.editorCreatorTargets.userId, userId),
            ),
          );
      },
    );
  } catch (err) {
    log.error("targets.delete.failed", err);
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
