/**
 * PATCH  /api/content-dna/[id]/draft/[draftId] — edit script inline.
 * DELETE /api/content-dna/[id]/draft/[draftId] — remove a single draft.
 */

import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { resolveEffectiveUser, readerFor } from "@/lib/clients/effective-user";

type PatchBody = { script?: string };

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; draftId: string }> },
) {
  const { id, draftId } = await params;
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

  const patch: Record<string, string | null> = {};
  if (body.script !== undefined) {
    const s = body.script;
    if (s.length > 50_000) {
      return NextResponse.json({ error: "script_too_long" }, { status: 400 });
    }
    patch.script = s;
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: true, updated: 0 });
  }

  const { error } = await reader
    .from("content_drafts")
    /* `as never` — supabase-js 2.45 vs PostgrestVersion 14.5 narrowing. */
    .update(patch as never)
    .eq("id", draftId)
    .eq("analysis_id", id)
    .eq("user_id", eff.userId);
  if (error) {
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; draftId: string }> },
) {
  const { id, draftId } = await params;
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
    .from("content_drafts")
    .delete()
    .eq("id", draftId)
    .eq("analysis_id", id)
    .eq("user_id", eff.userId);
  if (error) {
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
