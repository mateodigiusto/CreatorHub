/**
 * POST /api/content-dna/[id]/draft
 *
 * Generates a stub script + hooks + shots + captions for the given analysis,
 * using the user's angle / audience / platform / tone. Persists as a
 * content_drafts row.
 *
 * Real LLM integration replaces only the buildStubScript() call.
 */

import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { log } from "@/lib/log";
import { buildStubScript } from "@/lib/content-dna/stubs";
import type { StructureBeat } from "@/lib/content-dna/types";

type Body = {
  angle?: string;
  audience?: string;
  targetPlatform?: string;
  tone?: string;
};

type AnalysisRow = {
  hook: string | null;
  structure: StructureBeat[] | null;
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await getSupabaseServer();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { data: analysis } = await supabase
    .from("content_analyses")
    .select("hook, structure")
    .eq("id", id)
    .returns<AnalysisRow[]>()
    .maybeSingle();
  if (!analysis) {
    return NextResponse.json({ error: "analysis_not_found" }, { status: 404 });
  }

  const { script, hooks, shots, captions } = buildStubScript({
    hook: analysis.hook ?? "",
    structure: analysis.structure ?? [],
    angle: body.angle ?? "",
    audience: body.audience ?? "",
    tone: body.tone ?? "direct",
  });

  const insertRow = {
    analysis_id: id,
    user_id: userRes.user.id,
    angle: (body.angle ?? "").slice(0, 500) || null,
    audience: (body.audience ?? "").slice(0, 500) || null,
    target_platform: (body.targetPlatform ?? "").slice(0, 60) || null,
    tone: (body.tone ?? "").slice(0, 60) || null,
    script,
    hooks,
    shots,
    captions,
  };

  const { data, error } = await supabase
    .from("content_drafts")
    .insert(insertRow as never)
    .select("id, script, hooks, shots, captions")
    .returns<Array<{
      id: string;
      script: string;
      hooks: string[];
      shots: { description: string; duration_seconds: number }[];
      captions: string[];
    }>>()
    .single();

  if (error || !data) {
    log.error("content_dna.draft_failed", error ?? new Error("no row"));
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }

  return NextResponse.json({ draft: data });
}
