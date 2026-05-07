/**
 * GET  /api/content-dna       — list the user's analyses (newest first)
 * POST /api/content-dna       — create a new analysis from a URL
 *
 * When ANTHROPIC_API_KEY + OPENAI_API_KEY + APIFY_API_TOKEN are all set,
 * POST returns immediately with `status='analyzing'` and enqueues a job;
 * the cron worker (run-jobs?kind=content_dna_analyze) does Apify scrape
 * → Whisper transcribe → Claude analyze → updates the row to `ready`.
 *
 * When any of those keys is missing, POST falls back to the deterministic
 * stub (the original behaviour). Keeps the route usable in dev without keys.
 */

import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer, getSupabaseServiceRole } from "@/lib/supabase/server";
import { resolveEffectiveUser, readerFor } from "@/lib/clients/effective-user";
import { log } from "@/lib/log";
import { pickStub, detectPlatform, canonicalizeUrl } from "@/lib/content-dna/stubs";
import { checkAnalysisBudget } from "@/lib/content-dna/budget";
import { isAnthropicConfigured } from "@/lib/content-dna/providers/claude";
import { isOpenAIConfigured } from "@/lib/content-dna/providers/whisper";
import { isApifyConfigured } from "@/lib/content-dna/providers/apify";

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

export async function GET(req: NextRequest) {
  const supabase = await getSupabaseServer();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) {
    return NextResponse.json({ analyses: [] }, { status: 200 });
  }

  const relationshipId = req.nextUrl.searchParams.get("relationship_id");
  const eff = await resolveEffectiveUser(supabase, userRes.user.id, relationshipId);
  if (!eff.ok) {
    return NextResponse.json({ error: eff.error }, { status: eff.status });
  }
  const reader = readerFor(supabase, eff.isClient);

  const { data: rows } = await reader
    .from("content_analyses")
    .select(
      "id, source_url, source_platform, source_title, source_creator, source_thumbnail, status, created_at, updated_at",
    )
    .eq("user_id", eff.userId)
    .order("created_at", { ascending: false })
    .limit(50)
    .returns<AnalysisListRow[]>();

  return NextResponse.json({ analyses: rows ?? [], actingAsClient: eff.isClient });
}

type PostBody = { url: string };

function realAiConfigured(): boolean {
  return (
    isAnthropicConfigured() && isOpenAIConfigured() && isApifyConfigured()
  );
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

  let body: PostBody;
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const canonical = canonicalizeUrl(body.url ?? "");
  if (!canonical) {
    return NextResponse.json({ error: "invalid_url" }, { status: 400 });
  }

  /* Dedupe: same canonical URL inside the last 24h for the effective
     user → return the existing analysis. Cheap guard against accidental
     double-clicks. Scoped to eff.userId so an editor pasting the same
     URL across two clients gets per-client dedupe (correct). */
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: existing } = await reader
    .from("content_analyses")
    .select("id")
    .eq("user_id", eff.userId)
    .eq("source_url", canonical)
    .gt("created_at", dayAgo)
    .order("created_at", { ascending: false })
    .returns<Array<{ id: string }>>()
    .limit(1)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ id: existing.id, ok: true, deduped: true });
  }

  /* Budget gate (15/mo Standard, unlimited Pro). Counts against the
     effective user — when acting as a client, the client's budget is
     what gates analysis (not the editor's). */
  const budget = await checkAnalysisBudget(reader, eff.userId);
  if (!budget.ok) {
    return NextResponse.json(
      {
        error: "monthly_limit_reached",
        used: budget.used,
        limit: budget.limit,
      },
      { status: 429 },
    );
  }

  const platform = detectPlatform(canonical);

  if (realAiConfigured()) {
    /* Real pipeline: insert with status='analyzing' (no stub data), enqueue
       a job, return. Cron worker fills the row in the background. */
    const insertRow = {
      user_id: eff.userId,
      source_url: canonical.slice(0, 2048),
      source_platform: platform,
      status: "analyzing",
    };
    const { data, error } = await reader
      .from("content_analyses")
      .insert(insertRow as never)
      .select("id")
      .returns<Array<{ id: string }>>()
      .single();
    if (error || !data) {
      log.error("content_dna.insert_failed", error ?? new Error("no row"));
      return NextResponse.json({ error: "insert_failed" }, { status: 500 });
    }

    /* Jobs is service-role only (no app-side RLS write policy). Use the
       admin client to enqueue. The supabase client wrapper on a service
       role key bypasses RLS but is still scoped to this request. */
    const admin = getSupabaseServiceRole();
    const { error: enqErr } = await admin.from("jobs").insert({
      user_id: eff.userId,
      kind: "content_dna_analyze",
      payload: { analysis_id: data.id, url: canonical, platform },
    } as never);
    if (enqErr) {
      log.error("content_dna.enqueue_failed", enqErr);
      await reader
        .from("content_analyses")
        .update({ status: "failed" } as never)
        .eq("id", data.id);
      return NextResponse.json({ error: "enqueue_failed" }, { status: 500 });
    }

    /* Fire-and-forget invocation of the cron endpoint so the user doesn't
       wait up to 60s for the next scheduled tick. We don't await it; if it
       fails, the next scheduled tick picks up the queued job anyway. */
    void triggerCronTick(req).catch(() => {});

    return NextResponse.json({
      id: data.id,
      ok: true,
      status: "analyzing",
      remaining: budget.remaining,
    });
  }

  /* Fallback: deterministic stub. Same path the route used before keys
     existed — keeps dev / preview environments working without paid creds. */
  const stub = pickStub(canonical);
  const insertRow = {
    user_id: eff.userId,
    source_url: canonical.slice(0, 2048),
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

  const { data, error } = await reader
    .from("content_analyses")
    .insert(insertRow as never)
    .select("id")
    .returns<Array<{ id: string }>>()
    .single();

  if (error || !data) {
    log.error("content_dna.analyze_failed", error ?? new Error("no row"));
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }

  return NextResponse.json({
    id: data.id,
    ok: true,
    stub: true,
    remaining: budget.remaining,
  });
}

async function triggerCronTick(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return;
  const origin = req.nextUrl.origin;
  await fetch(
    `${origin}/api/cron/run-jobs?kind=content_dna_analyze`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${secret}` },
      cache: "no-store",
    },
  );
}
