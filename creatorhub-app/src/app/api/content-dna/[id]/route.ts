/**
 * GET    /api/content-dna/[id] — fetch one analysis (with its drafts).
 * PATCH  /api/content-dna/[id] — rename source_title.
 * DELETE /api/content-dna/[id] — remove the analysis (drafts cascade).
 *
 * RLS enforces self-CRUD on every verb; a foreign id 404s on read and
 * silently no-ops on write/delete.
 */

import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { resolveEffectiveUser, readerFor } from "@/lib/clients/effective-user";

type AnalysisRow = {
  id: string;
  user_id: string;
  source_url: string;
  source_platform: string;
  source_title: string | null;
  source_creator: string | null;
  source_thumbnail: string | null;
  transcription: string | null;
  hook: string | null;
  structure: unknown;
  why_it_worked: unknown;
  variations: unknown;
  status: string;
  created_at: string;
  updated_at: string;
};

type DraftRow = {
  id: string;
  analysis_id: string;
  angle: string | null;
  audience: string | null;
  target_platform: string | null;
  tone: string | null;
  script: string | null;
  hooks: unknown;
  shots: unknown;
  captions: unknown;
  created_at: string;
  updated_at: string;
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
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

  const { data: analysis } = await reader
    .from("content_analyses")
    .select(
      "id, user_id, source_url, source_platform, source_title, source_creator, source_thumbnail, " +
        "transcription, hook, structure, why_it_worked, variations, status, created_at, updated_at",
    )
    .eq("id", id)
    .eq("user_id", eff.userId)
    .returns<AnalysisRow[]>()
    .maybeSingle();

  if (!analysis) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { data: drafts } = await reader
    .from("content_drafts")
    .select(
      "id, analysis_id, angle, audience, target_platform, tone, script, hooks, shots, captions, created_at, updated_at",
    )
    .eq("analysis_id", id)
    .eq("user_id", eff.userId)
    .order("created_at", { ascending: false })
    .returns<DraftRow[]>();

  return NextResponse.json({ analysis, drafts: drafts ?? [], actingAsClient: eff.isClient });
}

type PatchBody = { sourceTitle?: string };

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
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
  if (body.sourceTitle !== undefined) {
    const t = body.sourceTitle.trim();
    if (t.length === 0) {
      patch.source_title = null;
    } else if (t.length > 200) {
      return NextResponse.json({ error: "title_too_long" }, { status: 400 });
    } else {
      patch.source_title = t;
    }
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: true, updated: 0 });
  }

  const { error } = await reader
    .from("content_analyses")
    /* `as never` — supabase-js 2.45 vs PostgrestVersion 14.5 narrowing. */
    .update(patch as never)
    .eq("id", id)
    .eq("user_id", eff.userId);
  if (error) {
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
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
    .from("content_analyses")
    .delete()
    .eq("id", id)
    .eq("user_id", eff.userId);
  if (error) {
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
