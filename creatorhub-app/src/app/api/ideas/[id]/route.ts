/**
 * PATCH  /api/ideas/[id] — toggle saved / used, edit hook/angle
 * DELETE /api/ideas/[id] — permanent delete
 *
 * Owner-only (RLS). The PATCH body accepts any subset of the editable
 * fields; everything else is left alone.
 */

import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { resolveEffectiveUser, readerFor } from "@/lib/clients/effective-user";
import { log } from "@/lib/log";

type RouteContext = { params: Promise<{ id: string }> };

type PatchBody = {
  hook?: string;
  angle?: string | null;
  saved?: boolean;
  used?: boolean;
  score?: number | null;
};

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
  const reader = readerFor(supabase, eff.isClient);

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const patch: Record<string, string | boolean | null> = {};
  if (body.hook !== undefined) {
    const trimmed = body.hook.trim();
    if (!trimmed) {
      return NextResponse.json({ error: "missing_hook" }, { status: 400 });
    }
    if (trimmed.length > 500) {
      return NextResponse.json({ error: "hook_too_long" }, { status: 400 });
    }
    patch.hook = trimmed;
  }
  if (body.angle !== undefined) {
    const angle = body.angle === null ? null : body.angle.trim();
    if (angle && angle.length > 2000) {
      return NextResponse.json({ error: "angle_too_long" }, { status: 400 });
    }
    patch.angle = angle && angle.length > 0 ? angle : null;
  }
  if (body.saved !== undefined) patch.saved = body.saved === true;
  if (body.used !== undefined) patch.used = body.used === true;
  if (body.score !== undefined) {
    if (body.score === null) {
      patch.score = null;
    } else {
      const n = Number(body.score);
      if (!Number.isFinite(n) || n < 0 || n > 10) {
        return NextResponse.json({ error: "invalid_score" }, { status: 400 });
      }
      patch.score = n.toFixed(1);
    }
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: true, updated: 0 });
  }

  const { error } = await reader
    .from("ideas")
    .update(patch as never)
    .eq("id", id)
    .eq("user_id", eff.userId);
  if (error) {
    log.error("ideas.update_failed", error);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
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
  const reader = readerFor(supabase, eff.isClient);

  const { error } = await reader
    .from("ideas")
    .delete()
    .eq("id", id)
    .eq("user_id", eff.userId);
  if (error) {
    log.error("ideas.delete_failed", error);
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
