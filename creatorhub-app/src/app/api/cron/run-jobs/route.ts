/**
 * Cron worker — claims one job per invocation, advances its state, returns.
 *
 * Auth: shared `CRON_SECRET` in the Authorization header. Vercel Cron is
 * configured to send `Bearer <secret>` to this URL on a schedule.
 *
 * Concurrency: `FOR UPDATE SKIP LOCKED` so two crons firing simultaneously
 * pick disjoint jobs. Per-tick work is short (one Cloudflare API call max),
 * so we don't run a heartbeat — we requeue in-flight transcodes by setting
 * `status='queued'` + `next_attempt_at = now() + 30s` and let the next tick
 * pick them up. The sweeper (`/api/cron/sweep-stuck-jobs`, future) is the
 * fallback for anything stuck in `running`.
 *
 * Supported kinds for now: `transcode`. Others return 200 + a noop log so
 * adding a new kind is just an `else if` here.
 */

import { NextResponse, type NextRequest } from "next/server";
import { sql, eq } from "drizzle-orm";
import { dbInternal, schema } from "@/db";
import { getSupabaseServiceRole } from "@/lib/supabase/server";
import { copyFromUrl, getVideo } from "@/lib/stream";
import { log } from "@/lib/log";
import { fetchSource } from "@/lib/content-dna/providers/source";
import { completeJson } from "@/lib/content-dna/providers/claude";
import {
  ANALYSIS_SYSTEM,
  analysisPrompt,
  type AnalysisOutput,
} from "@/lib/content-dna/prompts";

const RETRY_BACKOFF_S = 30;
const SIGNED_URL_TTL_S = 1800; // Stream usually finishes the pull in seconds

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") ?? "";
  if (!secret) {
    log.warn("cron.run_jobs.no_secret_configured");
  } else if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const kind = req.nextUrl.searchParams.get("kind") ?? "transcode";

  if (kind === "transcode") {
    const result = await runOneTranscodeJob();
    return NextResponse.json(result);
  }

  if (kind === "cleanup") {
    const result = await runCleanupEphemera();
    return NextResponse.json(result);
  }

  if (kind === "content_dna_analyze") {
    const result = await runOneContentDnaJob();
    return NextResponse.json(result);
  }

  return NextResponse.json({ ok: true, skipped: kind });
}

/**
 * Daily sweep that keeps auxiliary tables bounded. Each table has a
 * different retention window driven by its purpose:
 *   - oauth_states: 1 day (TTL is 10 min anyway; we keep for short-term debug)
 *   - webhook_events: 90 days (idempotency window + dispute history)
 *   - sync_runs: 30 days (debugging recent syncs)
 *   - jobs (terminal): 30 days (replays + observability)
 *   - deletion_requests (completed): 1 year (compliance window)
 * Audit log is never deleted by this job — it's the only "forever" table.
 */
async function runCleanupEphemera() {
  type CountRow = { count: string };
  const counts: Record<string, number> = {};

  const oauth = (await dbInternal.execute(sql`
    with d as (delete from oauth_states where expires_at < now() - interval '1 day' returning 1)
    select count(*)::text as count from d
  `)) as unknown as CountRow[];
  counts.oauth_states = Number(oauth[0]?.count ?? 0);

  const webhooks = (await dbInternal.execute(sql`
    with d as (delete from webhook_events where received_at < now() - interval '90 days' returning 1)
    select count(*)::text as count from d
  `)) as unknown as CountRow[];
  counts.webhook_events = Number(webhooks[0]?.count ?? 0);

  const syncs = (await dbInternal.execute(sql`
    with d as (delete from sync_runs where started_at < now() - interval '30 days' returning 1)
    select count(*)::text as count from d
  `)) as unknown as CountRow[];
  counts.sync_runs = Number(syncs[0]?.count ?? 0);

  const jobsDeleted = (await dbInternal.execute(sql`
    with d as (
      delete from jobs
      where finished_at < now() - interval '30 days'
        and status in ('completed','failed','dead')
      returning 1
    )
    select count(*)::text as count from d
  `)) as unknown as CountRow[];
  counts.jobs = Number(jobsDeleted[0]?.count ?? 0);

  const deletions = (await dbInternal.execute(sql`
    with d as (delete from deletion_requests where completed_at < now() - interval '1 year' returning 1)
    select count(*)::text as count from d
  `)) as unknown as CountRow[];
  counts.deletion_requests = Number(deletions[0]?.count ?? 0);

  log.info("cron.cleanup.complete", counts);
  return { ok: true, deleted: counts };
}

type TranscodePayload = {
  stream_uid?: string;
};

async function runOneTranscodeJob() {
  /* Atomic claim — single statement, FOR UPDATE SKIP LOCKED. Two concurrent
     crons each get a different row (or zero rows). */
  const claimed = await dbInternal.execute(sql`
    with next as (
      select id
      from jobs
      where status = 'queued'
        and kind = 'transcode'
        and next_attempt_at <= now()
      order by created_at
      limit 1
      for update skip locked
    )
    update jobs j
    set status = 'running',
        claimed_at = now(),
        heartbeat_at = now(),
        attempts = attempts + 1,
        started_at = coalesce(started_at, now())
    from next n
    where j.id = n.id
    returning j.id, j.user_id, j.asset_id, j.payload, j.attempts, j.max_attempts
  `);

  const rows = claimed as unknown as Array<{
    id: string;
    user_id: string;
    asset_id: string;
    payload: TranscodePayload;
    attempts: number;
    max_attempts: number;
  }>;
  if (rows.length === 0) {
    return { ok: true, claimed: 0 };
  }
  const job = rows[0];

  if (!job.asset_id) {
    /* Defensive — asset reference required for transcode kind. Mark dead. */
    await markJob(job.id, "dead", "missing_asset_id");
    return { ok: false, jobId: job.id, error: "missing_asset_id" };
  }

  try {
    if (!job.payload?.stream_uid) {
      const uid = await startCopy(job.asset_id, job.user_id);
      await persistStreamUid(job.id, uid);
      await requeue(job.id);
      return { ok: true, jobId: job.id, stage: "started", streamUid: uid };
    }

    const video = await getVideo(job.payload.stream_uid);
    if (video.status.state === "ready" && video.playback) {
      await persistVariants(job.asset_id, video);
      await markJob(job.id, "completed");
      return { ok: true, jobId: job.id, stage: "completed" };
    }
    if (video.status.state === "error") {
      await persistError(
        job.asset_id,
        video.status.errorReasonText ?? "Stream reported error",
      );
      await markJob(job.id, "failed", video.status.errorReasonText ?? "stream_error");
      return { ok: false, jobId: job.id, stage: "failed" };
    }
    /* Still queued / inprogress on Stream's side. Requeue. */
    await requeue(job.id);
    return { ok: true, jobId: job.id, stage: "polling" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    log.error("cron.transcode.error", { jobId: job.id, msg });
    if (job.attempts >= job.max_attempts) {
      await markJob(job.id, "dead", msg);
      await persistError(job.asset_id, msg);
    } else {
      await requeue(job.id, msg);
    }
    return { ok: false, jobId: job.id, error: msg };
  }
}

async function startCopy(assetId: string, userId: string): Promise<string> {
  const admin = getSupabaseServiceRole();
  const { data: rows } = await admin
    .from("assets")
    .select("storage_key, title")
    .eq("id", assetId)
    .returns<Array<{ storage_key: string; title: string }>>()
    .maybeSingle();
  if (!rows) throw new Error(`asset ${assetId} not found`);

  const { data: signed, error: signedErr } = await admin.storage
    .from("originals")
    .createSignedUrl(rows.storage_key, SIGNED_URL_TTL_S);
  if (signedErr || !signed) {
    throw new Error(`signed url failed: ${signedErr?.message ?? "unknown"}`);
  }

  const result = await copyFromUrl({
    url: signed.signedUrl,
    name: rows.title,
    meta: { user_id: userId, asset_id: assetId },
  });
  return result.uid;
}

async function persistStreamUid(jobId: string, uid: string) {
  await dbInternal
    .update(schema.jobs)
    .set({ payload: { stream_uid: uid } })
    .where(eq(schema.jobs.id, jobId));
}

async function persistVariants(
  assetId: string,
  video: { uid: string; playback?: { hls: string; dash: string }; thumbnail?: string },
) {
  const variants = {
    stream_uid: video.uid,
    hls_url: video.playback?.hls ?? null,
    dash_url: video.playback?.dash ?? null,
    poster: video.thumbnail ?? null,
    ready_at: new Date().toISOString(),
  };
  await dbInternal
    .update(schema.assets)
    .set({ transcodedVariants: variants })
    .where(eq(schema.assets.id, assetId));
}

async function persistError(assetId: string, message: string) {
  await dbInternal
    .update(schema.assets)
    .set({ transcodedVariants: { error: message } })
    .where(eq(schema.assets.id, assetId));
}

async function requeue(jobId: string, errorText?: string) {
  await dbInternal
    .update(schema.jobs)
    .set({
      status: "queued",
      heartbeatAt: null,
      nextAttemptAt: new Date(Date.now() + RETRY_BACKOFF_S * 1000),
      errorText: errorText ?? null,
    })
    .where(eq(schema.jobs.id, jobId));
}

async function markJob(
  jobId: string,
  status: "completed" | "failed" | "dead",
  errorText?: string,
) {
  await dbInternal
    .update(schema.jobs)
    .set({
      status,
      finishedAt: new Date(),
      heartbeatAt: null,
      errorText: errorText ?? null,
    })
    .where(eq(schema.jobs.id, jobId));
}

/* ─── Content DNA: real AI pipeline ─────────────────────────────────
 * One tick claims a single content_dna_analyze job, runs the full
 * pipeline (Apify scrape → Whisper transcribe → Claude analyze), and
 * writes the result to the content_analyses row referenced in payload.
 *
 * Long-running (~30–90s for a typical short-form video). Vercel function
 * duration must be set high enough; max 5 min on Pro+Fluid. The cron
 * schedule is every minute so backed-up queues drain fast.
 */
type ContentDnaPayload = {
  analysis_id: string;
  url: string;
  platform: "youtube" | "instagram" | "tiktok" | "other";
};

async function runOneContentDnaJob() {
  const claimed = await dbInternal.execute(sql`
    with next as (
      select id
      from jobs
      where status = 'queued'
        and kind = 'content_dna_analyze'
        and next_attempt_at <= now()
      order by created_at
      limit 1
      for update skip locked
    )
    update jobs j
    set status = 'running',
        claimed_at = now(),
        heartbeat_at = now(),
        attempts = attempts + 1,
        started_at = coalesce(started_at, now())
    from next n
    where j.id = n.id
    returning j.id, j.user_id, j.payload, j.attempts, j.max_attempts
  `);
  const rows = claimed as unknown as Array<{
    id: string;
    user_id: string;
    payload: ContentDnaPayload;
    attempts: number;
    max_attempts: number;
  }>;
  if (rows.length === 0) return { ok: true, claimed: 0 };
  const job = rows[0];
  const { analysis_id, url, platform } = job.payload;

  const admin = getSupabaseServiceRole();

  if (platform === "other") {
    await failAnalysis(admin, analysis_id, "platform_unsupported");
    await markJob(job.id, "dead", "platform_unsupported");
    return { ok: false, jobId: job.id, error: "platform_unsupported" };
  }

  try {
    const source = await fetchSource(platform, url);
    const result = await completeJson<AnalysisOutput>({
      system: ANALYSIS_SYSTEM,
      prompt: analysisPrompt({
        platform,
        title: source.title,
        creator: source.creator,
        transcript: source.transcript,
      }),
    });

    /* Clamp content_score defensively — Claude usually obeys the 0–10
       range but a stray 11 would trip the v21 CHECK constraint. */
    const score = Number.isFinite(result.content_score)
      ? Math.max(0, Math.min(10, Number(result.content_score)))
      : null;

    const { error: updErr } = await admin
      .from("content_analyses")
      .update({
        source_title: source.title,
        source_creator: source.creator,
        source_thumbnail: source.thumbnail,
        transcription: source.transcript.slice(0, 12000),
        hook: result.hook,
        structure: result.structure,
        why_it_worked: result.why_it_worked,
        variations: result.variations,
        /* v21 columns. */
        hook_analysis: result.hook_analysis ?? null,
        themes: Array.isArray(result.themes) ? result.themes.slice(0, 12) : [],
        tone: result.tone ?? null,
        cta: result.cta ?? null,
        content_score: score,
        steal_notes: result.steal_notes ?? null,
        status: "ready",
      } as never)
      .eq("id", analysis_id);
    if (updErr) throw new Error(`update_failed: ${updErr.message}`);

    await markJob(job.id, "completed");
    return { ok: true, jobId: job.id, analysisId: analysis_id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    log.error("cron.content_dna.error", {
      jobId: job.id,
      analysisId: analysis_id,
      msg,
    });
    if (job.attempts >= job.max_attempts) {
      await failAnalysis(admin, analysis_id, msg);
      await markJob(job.id, "dead", msg);
    } else {
      await requeue(job.id, msg);
    }
    return { ok: false, jobId: job.id, error: msg };
  }
}

async function failAnalysis(
  admin: ReturnType<typeof getSupabaseServiceRole>,
  analysisId: string,
  reason: string,
) {
  await admin
    .from("content_analyses")
    .update({ status: "failed" } as never)
    .eq("id", analysisId);
  log.warn("content_dna.failed", { analysisId, reason });
}
