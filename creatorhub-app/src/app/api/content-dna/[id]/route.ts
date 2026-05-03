/**
 * GET /api/content-dna/[id] — fetch one analysis (with its drafts).
 *
 * RLS enforces self-read; a foreign id 404s.
 */

import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

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
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await getSupabaseServer();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: analysis } = await supabase
    .from("content_analyses")
    .select(
      "id, user_id, source_url, source_platform, source_title, source_creator, source_thumbnail, " +
        "transcription, hook, structure, why_it_worked, variations, status, created_at, updated_at",
    )
    .eq("id", id)
    .returns<AnalysisRow[]>()
    .maybeSingle();

  if (!analysis) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { data: drafts } = await supabase
    .from("content_drafts")
    .select(
      "id, analysis_id, angle, audience, target_platform, tone, script, hooks, shots, captions, created_at, updated_at",
    )
    .eq("analysis_id", id)
    .order("created_at", { ascending: false })
    .returns<DraftRow[]>();

  return NextResponse.json({ analysis, drafts: drafts ?? [] });
}
