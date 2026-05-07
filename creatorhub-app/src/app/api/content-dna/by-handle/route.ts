/**
 * POST /api/content-dna/by-handle
 *
 * Bulk-analyze a creator's recent videos by handle. Honors the editor
 * "acting as client" pattern via `?relationship_id=`.
 *
 * Body:
 *   {
 *     handle: string                       // "@user" or "user", platform-specific
 *     platform: "instagram"|"tiktok"|"youtube"
 *     count?: number                       // default 3, max 5 (budget guard)
 *   }
 *
 * Behavior:
 *   - Real pipeline (when ANTHROPIC + OPENAI + APIFY all configured):
 *       Inserts `count` content_analyses rows with status='analyzing' +
 *       source_kind='username' + source_handle, then enqueues
 *       transcribe_username_batch jobs for each.
 *   - Fallback (any key missing): inserts `count` deterministic stub rows
 *       tagged the same way so the History tab demos the username flow
 *       even without paid creds.
 *
 * Returns { ids: string[], stub: boolean }
 */

import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer, getSupabaseServiceRole } from "@/lib/supabase/server";
import { resolveEffectiveUser, readerFor } from "@/lib/clients/effective-user";
import { log } from "@/lib/log";
import { pickStub } from "@/lib/content-dna/stubs";
import { checkAnalysisBudget } from "@/lib/content-dna/budget";
import { isAnthropicConfigured } from "@/lib/content-dna/providers/claude";
import { isOpenAIConfigured } from "@/lib/content-dna/providers/whisper";
import { isApifyConfigured } from "@/lib/content-dna/providers/apify";

const VALID_PLATFORMS = new Set(["instagram", "tiktok", "youtube"]);
const MAX_COUNT = 5;

type Body = {
  handle?: string;
  platform?: string;
  count?: number;
};

function realAiConfigured(): boolean {
  return isAnthropicConfigured() && isOpenAIConfigured() && isApifyConfigured();
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

  const cleanedHandle = (body.handle ?? "").trim().replace(/^@/, "");
  if (!cleanedHandle || cleanedHandle.length > 50) {
    return NextResponse.json({ error: "invalid_handle" }, { status: 400 });
  }
  const platform = (body.platform ?? "").trim().toLowerCase();
  if (!VALID_PLATFORMS.has(platform)) {
    return NextResponse.json({ error: "invalid_platform" }, { status: 400 });
  }
  const requestedCount = Math.max(1, Math.min(MAX_COUNT, Number(body.count) || 3));

  const budget = await checkAnalysisBudget(reader, eff.userId);
  if (!budget.ok) {
    return NextResponse.json(
      { error: "monthly_limit_reached", used: budget.used, limit: budget.limit },
      { status: 429 },
    );
  }
  /* If the budget left is less than the count requested, scale down. */
  const effectiveCount = budget.remaining === -1
    ? requestedCount
    : Math.min(requestedCount, budget.remaining);
  if (effectiveCount === 0) {
    return NextResponse.json({ error: "monthly_limit_reached" }, { status: 429 });
  }

  const useReal = realAiConfigured();
  const ids: string[] = [];
  const admin = useReal ? getSupabaseServiceRole() : null;

  for (let i = 0; i < effectiveCount; i++) {
    const syntheticUrl = buildSyntheticUrl(platform, cleanedHandle, i);

    if (useReal) {
      /* Real path: insert analyzing-row + enqueue. The worker will hit
         Apify to resolve the handle's recent videos and pick one we
         haven't seen yet, then run the transcribe + analyze pipeline. */
      const insertRow = {
        user_id: eff.userId,
        source_url: syntheticUrl,
        source_platform: platform,
        source_kind: "username",
        source_handle: cleanedHandle,
        status: "analyzing",
      };
      const { data, error } = await reader
        .from("content_analyses")
        .insert(insertRow as never)
        .select("id")
        .returns<Array<{ id: string }>>()
        .single();
      if (error || !data) {
        log.error("content_dna.by_handle.insert_failed", error ?? new Error("no row"));
        continue;
      }
      ids.push(data.id);

      if (admin) {
        const { error: enqErr } = await admin.from("jobs").insert({
          user_id: eff.userId,
          kind: "content_dna_analyze",
          payload: {
            analysis_id: data.id,
            handle: cleanedHandle,
            platform,
            video_index: i,
            mode: "by_handle",
          },
        } as never);
        if (enqErr) {
          log.error("content_dna.by_handle.enqueue_failed", enqErr);
          await reader
            .from("content_analyses")
            .update({ status: "failed" } as never)
            .eq("id", data.id);
        }
      }
    } else {
      /* Stub path: insert a deterministic ready-state analysis tagged
         with source_kind='username'. UX-equivalent to the real path
         from the user's POV; History grouping picks it up correctly. */
      const stub = pickStub(syntheticUrl);
      const insertRow = {
        user_id: eff.userId,
        source_url: syntheticUrl,
        source_platform: platform,
        source_kind: "username",
        source_handle: cleanedHandle,
        source_title: stub.sourceTitle,
        source_creator: `@${cleanedHandle}`,
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
        log.error("content_dna.by_handle.stub_insert_failed", error ?? new Error("no row"));
        continue;
      }
      ids.push(data.id);
    }
  }

  if (ids.length === 0) {
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }

  if (useReal) {
    void triggerCronTick(req).catch(() => {});
  }

  return NextResponse.json({
    ids,
    stub: !useReal,
    handle: cleanedHandle,
    platform,
  });
}

function buildSyntheticUrl(platform: string, handle: string, index: number): string {
  /* Synthetic URLs let the dedupe + history features work even before
     Apify resolves real video URLs. The worker overwrites source_url
     with the actual resolved URL once known. */
  const ts = Date.now();
  const handleSlug = encodeURIComponent(handle);
  const idx = index + 1;
  switch (platform) {
    case "instagram":
      return `https://www.instagram.com/${handleSlug}/reel/handle-${ts}-${idx}`;
    case "tiktok":
      return `https://www.tiktok.com/@${handleSlug}/video/handle-${ts}-${idx}`;
    case "youtube":
      return `https://www.youtube.com/@${handleSlug}/shorts/handle-${ts}-${idx}`;
    default:
      return `https://example.com/${handleSlug}/video/handle-${ts}-${idx}`;
  }
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
