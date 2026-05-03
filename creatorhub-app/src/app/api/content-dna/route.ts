/**
 * GET  /api/content-dna       — list the user's analyses (newest first)
 * POST /api/content-dna       — create a new analysis from a URL
 *
 * Today the analysis is stubbed (deterministic by URL hash). When a real
 * pipeline lands, only the stub-builder block changes.
 */

import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { log } from "@/lib/log";
import { pickStub, detectPlatform } from "@/lib/content-dna/stubs";

type AnalysisListRow = {
  id: string;
  source_url: string;
  source_platform: string;
  source_title: string | null;
  source_creator: string | null;
  source_thumbnail: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export async function GET() {
  const supabase = await getSupabaseServer();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) {
    return NextResponse.json({ analyses: [] }, { status: 200 });
  }

  const { data: rows } = await supabase
    .from("content_analyses")
    .select(
      "id, source_url, source_platform, source_title, source_creator, source_thumbnail, status, created_at, updated_at",
    )
    .order("created_at", { ascending: false })
    .limit(50)
    .returns<AnalysisListRow[]>();

  return NextResponse.json({ analyses: rows ?? [] });
}

type PostBody = { url: string };

export async function POST(req: NextRequest) {
  const supabase = await getSupabaseServer();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: PostBody;
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const url = (body.url ?? "").trim();
  if (!url || !/^https?:\/\//i.test(url)) {
    return NextResponse.json({ error: "invalid_url" }, { status: 400 });
  }

  const platform = detectPlatform(url);
  const stub = pickStub(url);

  /* Real pipeline goes here later: transcribe → analyze → write rows. For
     scaffold, we go straight from `analyzing` → `ready` in one insert with
     all the stub data. */
  const insertRow = {
    user_id: userRes.user.id,
    source_url: url.slice(0, 2048),
    source_platform: platform,
    source_title: stub.sourceTitle,
    source_creator: stub.sourceCreator,
    source_thumbnail: stub.sourceThumbnail,
    transcription: stub.transcriptionExcerpt,
    hook: stub.hook,
    structure: stub.structure,
    why_it_worked: stub.whyItWorked,
    variations: stub.variations,
    status: "ready",
  };

  const { data, error } = await supabase
    .from("content_analyses")
    .insert(insertRow as never)
    .select("id")
    .returns<Array<{ id: string }>>()
    .single();

  if (error || !data) {
    log.error("content_dna.analyze_failed", error ?? new Error("no row"));
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }

  return NextResponse.json({ id: data.id, ok: true });
}
