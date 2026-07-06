/**
 * POST /api/content-dna/by-upload
 *
 * Records a "transcribe my own video" request from a file the user has
 * already uploaded via /api/assets/upload.
 *
 * Body:
 *   {
 *     assetId: uuid       // existing assets row owned by the user / client
 *     filename?: string   // surfaced as source_title until pipeline runs
 *   }
 *
 * Honors `?relationship_id=` so editors acting as a client can transcribe
 * the client's uploaded videos.
 *
 * Real path (Whisper + Claude configured): inserts content_analyses with
 * status='analyzing' + source_kind='upload' + upload_asset_id, then
 * enqueues a transcribe_upload job.
 *
 * Stub path: inserts a deterministic ready-state analysis tagged the
 * same way so the History grouping shows the upload immediately.
 */

import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer, getSupabaseServiceRole } from "@/lib/supabase/server";
import { resolveEffectiveUser, readerFor } from "@/lib/clients/effective-user";
import { log } from "@/lib/log";
import { pickStub } from "@/lib/content-dna/stubs";
import { checkAnalysisBudget } from "@/lib/content-dna/budget";
import { isAnthropicConfigured } from "@/lib/content-dna/providers/claude";
import { isOpenAIConfigured } from "@/lib/content-dna/providers/whisper";

type Body = { assetId?: string; filename?: string };

type AssetRow = { id: string; user_id: string; kind: string };

function realAiConfigured(): boolean {
  /* Upload doesn't need Apify (no scrape needed) — only Whisper + Claude. */
  return isAnthropicConfigured() && isOpenAIConfigured();
}

export async function POST(req: NextRequest) {
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

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!body.assetId) {
    return NextResponse.json({ error: "missing_asset_id" }, { status: 400 });
  }

  /* Verify the asset belongs to the effective user. RLS would also catch
     this in own-mode but we filter explicitly so the service-role read in
     acting-as mode stays bounded. */
  const { data: assetData, error: assetError } = await reader
    .from("assets")
    .select("id, user_id, kind")
    .eq("id", body.assetId)
    .eq("user_id", eff.userId)
    .maybeSingle();

  if (assetError) {
    log.error("content_dna.by_upload.asset_load_failed", assetError);
    return NextResponse.json({ error: "load_failed" }, { status: 500 });
  }
  const asset = (assetData ?? null) as AssetRow | null;
  if (!asset) {
    return NextResponse.json({ error: "asset_not_found" }, { status: 404 });
  }
  if (asset.kind !== "video") {
    return NextResponse.json({ error: "asset_not_video" }, { status: 400 });
  }

  const budget = await checkAnalysisBudget(reader, eff.userId);
  if (!budget.ok) {
    return NextResponse.json(
      { error: "monthly_limit_reached", used: budget.used, limit: budget.limit },
      { status: 429 },
    );
  }

  const useReal = realAiConfigured();
  const filename = (body.filename ?? "").trim().slice(0, 200) || "Uploaded video";
  const syntheticUrl = `upload://${asset.id}`;

  if (useReal) {
    const insertRow = {
      user_id: eff.userId,
      source_url: syntheticUrl,
      source_platform: "other",
      source_kind: "upload",
      source_title: filename,
      upload_asset_id: asset.id,
      status: "analyzing",
    };
    const { data, error } = await reader
      .from("content_analyses")
      .insert(insertRow as never)
      .select("id")
      .returns<Array<{ id: string }>>()
      .single();
    if (error || !data) {
      log.error("content_dna.by_upload.insert_failed", error ?? new Error("no row"));
      return NextResponse.json({ error: "insert_failed" }, { status: 500 });
    }

    const admin = getSupabaseServiceRole();
    const { error: enqErr } = await admin.from("jobs").insert({
      user_id: eff.userId,
      kind: "content_dna_analyze",
      payload: {
        analysis_id: data.id,
        asset_id: asset.id,
        mode: "by_upload",
      },
    } as never);
    if (enqErr) {
      log.error("content_dna.by_upload.enqueue_failed", enqErr);
      await reader
        .from("content_analyses")
        .update({ status: "failed" } as never)
        .eq("id", data.id);
      return NextResponse.json({ error: "enqueue_failed" }, { status: 500 });
    }

    void triggerCronTick(req).catch(() => {});

    return NextResponse.json({
      id: data.id,
      ok: true,
      status: "analyzing",
      stub: false,
    });
  }

  /* Stub path — picks a deterministic stub and stamps it as a finished
     "your own upload" analysis. The upload itself is real (the asset
     exists in storage); only the analysis layer is mocked. */
  const stub = pickStub(syntheticUrl);
  const insertRow = {
    user_id: eff.userId,
    source_url: syntheticUrl,
    source_platform: "other",
    source_kind: "upload",
    source_title: filename,
    source_creator: "Your upload",
    source_thumbnail: stub.sourceThumbnail,
    upload_asset_id: asset.id,
    transcription: stub.transcriptionExcerpt,
    hook: stub.hook,
    structure: stub.structure,
    why_it_worked: stub.whyItWorked,
    variations: stub.variations,
    status: "ready",
  };
  const { data, error } = await reader
    .from("content_analyses")
    .insert(insertRow as never)
    .select("id")
    .returns<Array<{ id: string }>>()
    .single();
  if (error || !data) {
    log.error("content_dna.by_upload.stub_insert_failed", error ?? new Error("no row"));
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }

  return NextResponse.json({
    id: data.id,
    ok: true,
    status: "ready",
    stub: true,
  });
}

async function triggerCronTick(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return;
  const origin = req.nextUrl.origin;
  await fetch(`${origin}/api/cron/run-jobs?kind=content_dna_analyze`, {
    method: "GET",
    headers: { Authorization: `Bearer ${secret}` },
    cache: "no-store",
  });
}
