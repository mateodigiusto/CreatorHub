/**
 * GET    /api/scripts/[id]  — single script
 * PATCH  /api/scripts/[id]  — update editable fields + status
 * DELETE /api/scripts/[id]  — hard delete (use only for unsaved drafts;
 *                             Approved/Used scripts should be archived
 *                             via PATCH status=archived instead)
 *
 * PATCH validates: only the user's own script, only editable fields,
 * status transitions are loose (UI guides the natural flow but doesn't
 * block back-stepping).
 */

import { NextResponse, type NextRequest } from "next/server";
import { eq, and } from "drizzle-orm";
import { withAudit } from "@/lib/audit";
import { schema } from "@/db";
import {
  getSupabaseServer,
} from "@/lib/supabase/server";
import { resolveEffectiveUser, readerFor } from "@/lib/clients/effective-user";
import { log } from "@/lib/log";

const VALID_STATUS = new Set(["draft", "approved", "used", "archived"]);

type RouteContext = { params: Promise<{ id: string }> };

type PatchBody = {
  title?: string | null;
  hook?: string | null;
  setup?: string | null;
  keyPoints?: Array<{ title: string; body: string }>;
  cta?: string | null;
  bRollNotes?: string | null;
  feedback?: string | null;
  status?: string;
};

export async function GET(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const supabase = await getSupabaseServer();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const relationshipId = req.nextUrl.searchParams.get("relationship_id");
  const eff = await resolveEffectiveUser(supabase, userRes.user.id, relationshipId);
  if (!eff.ok) {
    return NextResponse.json({ error: eff.error }, { status: eff.status });
  }
  const reader = readerFor(supabase, eff.isClient);

  const { data, error } = await reader
    .from("generated_scripts")
    .select("*")
    .eq("id", id)
    .eq("user_id", eff.userId)
    .maybeSingle();

  if (error) {
    log.error("scripts.get.failed", error);
    return NextResponse.json({ error: "load_failed" }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ script: data });
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const supabase = await getSupabaseServer();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const relationshipId = req.nextUrl.searchParams.get("relationship_id");
  const eff = await resolveEffectiveUser(supabase, userRes.user.id, relationshipId);
  if (!eff.ok) {
    return NextResponse.json({ error: eff.error }, { status: eff.status });
  }
  const userId = eff.userId;

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (body.title !== undefined)        patch.title = trimOrNull(body.title, 200);
  if (body.hook !== undefined)         patch.hook = trimOrNull(body.hook, 1000);
  if (body.setup !== undefined)        patch.setup = trimOrNull(body.setup, 4000);
  if (body.cta !== undefined)          patch.cta = trimOrNull(body.cta, 1000);
  if (body.bRollNotes !== undefined)   patch.bRollNotes = trimOrNull(body.bRollNotes, 4000);
  if (body.feedback !== undefined)     patch.feedback = trimOrNull(body.feedback, 4000);
  if (body.keyPoints !== undefined) {
    if (!Array.isArray(body.keyPoints)) {
      return NextResponse.json({ error: "invalid_key_points" }, { status: 400 });
    }
    patch.keyPoints = body.keyPoints
      .filter((kp) => kp && typeof kp.title === "string" && typeof kp.body === "string")
      .slice(0, 20)
      .map((kp) => ({ title: kp.title.slice(0, 200), body: kp.body.slice(0, 4000) }));
  }
  if (body.status !== undefined) {
    if (!VALID_STATUS.has(body.status)) {
      return NextResponse.json({ error: "invalid_status" }, { status: 400 });
    }
    patch.status = body.status;
    /* Stamp the right timestamp when transitioning into a terminal state. */
    if (body.status === "approved") patch.approvedAt = new Date();
    if (body.status === "used") patch.usedAt = new Date();
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: true, updated: 0 });
  }

  try {
    await withAudit(
      userId,
      {
        actor: "user",
        action: "script.updated",
        targetType: "generated_script",
        targetId: id,
        metadata: { fields: Object.keys(patch) },
      },
      async (tx) => {
        await tx
          .update(schema.generatedScripts)
          .set(patch)
          .where(
            and(
              eq(schema.generatedScripts.id, id),
              eq(schema.generatedScripts.userId, userId),
            ),
          );
      },
    );
  } catch (err) {
    log.error("scripts.patch.failed", err);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  const reader = readerFor(supabase, eff.isClient);
  const { data } = await reader
    .from("generated_scripts")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  return NextResponse.json({ script: data });
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const supabase = await getSupabaseServer();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const relationshipId = req.nextUrl.searchParams.get("relationship_id");
  const eff = await resolveEffectiveUser(supabase, userRes.user.id, relationshipId);
  if (!eff.ok) {
    return NextResponse.json({ error: eff.error }, { status: eff.status });
  }
  const userId = eff.userId;

  try {
    await withAudit(
      userId,
      {
        actor: "user",
        action: "script.deleted",
        targetType: "generated_script",
        targetId: id,
      },
      async (tx) => {
        await tx
          .delete(schema.generatedScripts)
          .where(
            and(
              eq(schema.generatedScripts.id, id),
              eq(schema.generatedScripts.userId, userId),
            ),
          );
      },
    );
  } catch (err) {
    log.error("scripts.delete.failed", err);
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

function trimOrNull(v: string | null, max: number): string | null {
  if (v === null) return null;
  const t = String(v).trim();
  return t.length === 0 ? null : t.slice(0, max);
}
