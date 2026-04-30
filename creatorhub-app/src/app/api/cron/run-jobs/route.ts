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

  return NextResponse.json({ ok: true, skipped: kind });
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
