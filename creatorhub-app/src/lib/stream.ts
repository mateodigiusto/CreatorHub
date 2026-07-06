/**
 * Cloudflare Stream wrapper.
 *
 * Stream's job in our pipeline:
 *   1. We upload the original to Supabase Storage (private bucket).
 *   2. We hand Stream a signed URL — Stream pulls the file once, transcodes
 *      to HLS + DASH + MP4 ladder, and serves via its CDN.
 *   3. We store the resulting URLs in `assets.transcoded_variants` (jsonb).
 *
 * Eager init is forbidden (build-time `next build` collects page data with
 * env vars potentially unset). All fetches are made on demand against
 * `process.env.CLOUDFLARE_ACCOUNT_ID` + `CLOUDFLARE_STREAM_API_TOKEN`.
 */

import { log } from "@/lib/log";

const API_BASE = "https://api.cloudflare.com/client/v4";

function getCreds(): { accountId: string; apiToken: string } {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_STREAM_API_TOKEN;
  if (!accountId || !apiToken) {
    throw new Error(
      "Cloudflare Stream not configured: set CLOUDFLARE_ACCOUNT_ID and " +
        "CLOUDFLARE_STREAM_API_TOKEN in env.",
    );
  }
  return { accountId, apiToken };
}

export type StreamPlayback = {
  hls: string;
  dash: string;
};

export type StreamVideo = {
  uid: string;
  readyToStream: boolean;
  status: { state: "queued" | "inprogress" | "ready" | "error"; errorReasonText?: string };
  playback?: StreamPlayback;
  thumbnail?: string;
  duration?: number;
};

/**
 * Tell Stream to pull a video from a URL we control (a Supabase signed URL).
 * Returns the Stream UID — poll `getVideo(uid)` until status.state === 'ready'.
 */
export async function copyFromUrl(params: {
  url: string;
  /** Human-readable name shown in Cloudflare dashboard. */
  name?: string;
  /** Mirror these into Stream so we can correlate later if our DB row goes missing. */
  meta?: Record<string, string>;
}): Promise<StreamVideo> {
  const { accountId, apiToken } = getCreds();
  const res = await fetch(`${API_BASE}/accounts/${accountId}/stream/copy`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url: params.url,
      meta: { ...(params.meta ?? {}), ...(params.name ? { name: params.name } : {}) },
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    log.error("stream.copy_failed", { status: res.status, text });
    throw new Error(`Stream copy failed: ${res.status}`);
  }
  const json = (await res.json()) as { result: StreamVideo };
  return json.result;
}

export async function getVideo(uid: string): Promise<StreamVideo> {
  const { accountId, apiToken } = getCreds();
  const res = await fetch(`${API_BASE}/accounts/${accountId}/stream/${uid}`, {
    headers: { Authorization: `Bearer ${apiToken}` },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    log.error("stream.get_failed", { uid, status: res.status, text });
    throw new Error(`Stream get failed: ${res.status}`);
  }
  const json = (await res.json()) as { result: StreamVideo };
  return json.result;
}

export async function deleteVideo(uid: string): Promise<void> {
  const { accountId, apiToken } = getCreds();
  const res = await fetch(`${API_BASE}/accounts/${accountId}/stream/${uid}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${apiToken}` },
  });
  if (!res.ok && res.status !== 404) {
    const text = await res.text().catch(() => "");
    log.error("stream.delete_failed", { uid, status: res.status, text });
    throw new Error(`Stream delete failed: ${res.status}`);
  }
}
