/**
 * GET  /api/ideas — list the user's ideas (newest first; ?saved=1 to filter)
 * POST /api/ideas — create one
 *
 * Body (POST):
 *   {
 *     hook: string                       — required, 1..500 chars
 *     angle?: string                     — optional, <= 2000 chars
 *     sourceAnalysisId?: uuid            — links back to a /content-dna row
 *     sourceUrl?: string                 — snapshot of the source URL
 *     estimatedReach?: string            — display-only label (e.g. "120K")
 *     score?: number                     — 0..10
 *     saved?: boolean                    — defaults to false
 *   }
 *
 * Idempotency: if the same user POSTs the same hook text within the last
 * 24 hours, we return the existing row instead of creating a duplicate.
 * Cheap guard against double-clicks from the "Add to Idea Bank" button.
 *
 * Honors `?relationship_id=` via the effective-user helper so once the
 * acting-as flow is rewired (Phase 7), ideas land in the right account
 * automatically. Today the helper is a no-op stub.
 */

import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { resolveEffectiveUser, readerFor } from "@/lib/clients/effective-user";
import { log } from "@/lib/log";

type IdeaRow = {
  id: string;
  user_id: string;
  hook: string;
  angle: string | null;
  source_analysis_id: string | null;
  source_url: string | null;
  estimated_reach: string | null;
  score: string | null;
  saved: boolean;
  used: boolean;
  created_at: string;
  updated_at: string;
};

export async function GET(req: NextRequest) {
  const supabase = await getSupabaseServer();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) {
    return NextResponse.json({ ideas: [] }, { status: 200 });
  }

  const relationshipId = req.nextUrl.searchParams.get("relationship_id");
  const eff = await resolveEffectiveUser(supabase, userRes.user.id, relationshipId);
  if (!eff.ok) {
    return NextResponse.json({ error: eff.error }, { status: eff.status });
  }
  const reader = readerFor(supabase, eff.isClient);

  const savedOnly = req.nextUrl.searchParams.get("saved") === "1";
  const limit = Math.min(
    200,
    Math.max(1, Number(req.nextUrl.searchParams.get("limit")) || 100),
  );

  let q = reader
    .from("ideas")
    .select(
      "id, user_id, hook, angle, source_analysis_id, source_url, estimated_reach, score, saved, used, created_at, updated_at",
    )
    .eq("user_id", eff.userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (savedOnly) q = q.eq("saved", true);

  const { data, error } = await q.returns<IdeaRow[]>();
  if (error) {
    log.error("ideas.list_failed", error);
    return NextResponse.json({ error: "load_failed" }, { status: 500 });
  }

  return NextResponse.json({
    ideas: (data ?? []).map(toClient),
    actingAsClient: eff.isClient,
  });
}

type PostBody = {
  hook?: string;
  angle?: string | null;
  sourceAnalysisId?: string | null;
  sourceUrl?: string | null;
  estimatedReach?: string | null;
  score?: number | null;
  saved?: boolean;
};

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

  const hook = (body.hook ?? "").trim();
  if (!hook) {
    return NextResponse.json({ error: "missing_hook" }, { status: 400 });
  }
  if (hook.length > 500) {
    return NextResponse.json({ error: "hook_too_long" }, { status: 400 });
  }
  const angle = body.angle?.trim() || null;
  if (angle && angle.length > 2000) {
    return NextResponse.json({ error: "angle_too_long" }, { status: 400 });
  }
  let score: number | null = null;
  if (body.score !== undefined && body.score !== null) {
    const n = Number(body.score);
    if (!Number.isFinite(n) || n < 0 || n > 10) {
      return NextResponse.json({ error: "invalid_score" }, { status: 400 });
    }
    score = n;
  }

  /* 24h dedupe on hook text — cheap guard against double-clicks from the
     "Add to Idea Bank" button. Same hook same user → return existing row. */
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: existing } = await reader
    .from("ideas")
    .select("id, user_id, hook, angle, source_analysis_id, source_url, estimated_reach, score, saved, used, created_at, updated_at")
    .eq("user_id", eff.userId)
    .eq("hook", hook)
    .gt("created_at", dayAgo)
    .order("created_at", { ascending: false })
    .limit(1)
    .returns<IdeaRow[]>()
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ idea: toClient(existing), deduped: true });
  }

  const insertRow = {
    user_id: eff.userId,
    hook,
    angle,
    source_analysis_id: body.sourceAnalysisId ?? null,
    source_url: body.sourceUrl?.slice(0, 2048) ?? null,
    estimated_reach: body.estimatedReach?.slice(0, 64) ?? null,
    score: score !== null ? score.toFixed(1) : null,
    saved: body.saved === true,
  };

  const { data, error } = await reader
    .from("ideas")
    .insert(insertRow as never)
    .select(
      "id, user_id, hook, angle, source_analysis_id, source_url, estimated_reach, score, saved, used, created_at, updated_at",
    )
    .returns<IdeaRow[]>()
    .single();

  if (error || !data) {
    log.error("ideas.insert_failed", error ?? new Error("no row"));
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }

  return NextResponse.json({ idea: toClient(data) });
}

/** Convert DB row (snake_case + numeric strings) → API shape. */
function toClient(row: IdeaRow) {
  return {
    id: row.id,
    hook: row.hook,
    angle: row.angle,
    sourceAnalysisId: row.source_analysis_id,
    sourceUrl: row.source_url,
    estimatedReach: row.estimated_reach,
    score: row.score === null ? null : Number(row.score),
    saved: row.saved,
    used: row.used,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
