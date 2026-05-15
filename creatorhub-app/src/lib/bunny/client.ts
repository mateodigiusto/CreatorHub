/**
 * Bunny.net Stream wrapper — replaces the retired Cloudflare Stream client
 * (`src/lib/stream.ts`).
 *
 * Bunny's API model:
 *   1. POST  /library/{id}/videos          → create an empty video shell.
 *      Returns `{ guid, ... }` where `guid` is the Bunny video id.
 *   2. PUT   /library/{id}/videos/{guid}   (binary)  — simple direct upload.
 *      We use TUS instead from the browser (resumable, chunked).
 *      TUS endpoint: `https://video.bunnycdn.com/tusupload`
 *      Required headers: `AuthorizationSignature`, `AuthorizationExpire`,
 *      `VideoId`, `LibraryId`.
 *   3. GET   /library/{id}/videos/{guid}   → status (encode progress, ready).
 *   4. DELETE /library/{id}/videos/{guid}  → delete.
 *
 * Playback:
 *   HLS:        https://{cdn}/{guid}/playlist.m3u8
 *   Poster:     https://{cdn}/{guid}/thumbnail.jpg
 *   MP4 720p:   https://{cdn}/{guid}/play_720p.mp4
 *
 * Signed URLs:
 *   If the library is set to token-authed playback, we sign with HMAC-SHA256
 *   over `${tokenAuthKey}${path}${expires}` (hex). Bunny token-auth docs:
 *   https://docs.bunny.net/docs/cdn-token-authentication
 *
 * Eager init forbidden — `next build` walks page modules with env unset.
 */

import crypto from "node:crypto";
import { log } from "@/lib/log";

const API_BASE = "https://video.bunnycdn.com";
const TUS_ENDPOINT = "https://video.bunnycdn.com/tusupload";

type Creds = {
  libraryId: string;
  apiKey: string;
  cdnHost: string;
  tokenAuthKey: string;
};

function getCreds(): Creds {
  const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID;
  const apiKey = process.env.BUNNY_STREAM_API_KEY;
  const cdnHost = process.env.BUNNY_STREAM_CDN_HOSTNAME;
  const tokenAuthKey = process.env.BUNNY_STREAM_TOKEN_AUTH_KEY ?? "";
  if (!libraryId || !apiKey || !cdnHost) {
    throw new Error(
      "Bunny.net Stream not configured: set BUNNY_STREAM_LIBRARY_ID, " +
        "BUNNY_STREAM_API_KEY, and BUNNY_STREAM_CDN_HOSTNAME in env.",
    );
  }
  return { libraryId, apiKey, cdnHost, tokenAuthKey };
}

export type BunnyVideoStatusCode = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type BunnyVideo = {
  guid: string;
  title: string;
  status: BunnyVideoStatusCode;
  length: number;
  encodeProgress: number;
  width: number;
  height: number;
  storageSize: number;
  thumbnailFileName: string | null;
};

export function mapStatus(code: BunnyVideoStatusCode): {
  status: "uploading" | "processing" | "ready" | "failed";
} {
  if (code === 4) return { status: "ready" };
  if (code === 5) return { status: "failed" };
  if (code === 0) return { status: "uploading" };
  return { status: "processing" };
}

export async function createVideo(params: {
  title: string;
  collectionId?: string;
}): Promise<BunnyVideo> {
  const { libraryId, apiKey } = getCreds();
  const res = await fetch(`${API_BASE}/library/${libraryId}/videos`, {
    method: "POST",
    headers: {
      AccessKey: apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      title: params.title,
      collectionId: params.collectionId ?? undefined,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    log.error("bunny.create_failed", { status: res.status, text });
    throw new Error(`Bunny create failed: ${res.status}`);
  }
  return (await res.json()) as BunnyVideo;
}

export async function getVideo(guid: string): Promise<BunnyVideo | null> {
  const { libraryId, apiKey } = getCreds();
  const res = await fetch(`${API_BASE}/library/${libraryId}/videos/${guid}`, {
    headers: { AccessKey: apiKey, Accept: "application/json" },
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    log.error("bunny.get_failed", { guid, status: res.status, text });
    throw new Error(`Bunny get failed: ${res.status}`);
  }
  return (await res.json()) as BunnyVideo;
}

export async function deleteVideo(guid: string): Promise<void> {
  const { libraryId, apiKey } = getCreds();
  const res = await fetch(`${API_BASE}/library/${libraryId}/videos/${guid}`, {
    method: "DELETE",
    headers: { AccessKey: apiKey },
  });
  if (!res.ok && res.status !== 404) {
    const text = await res.text().catch(() => "");
    log.error("bunny.delete_failed", { guid, status: res.status, text });
    throw new Error(`Bunny delete failed: ${res.status}`);
  }
}

export function tusUploadParams(guid: string, ttlSeconds = 6 * 60 * 60): {
  endpoint: string;
  libraryId: string;
  videoId: string;
  authorizationSignature: string;
  authorizationExpire: number;
} {
  const { libraryId, apiKey } = getCreds();
  const expires = Math.floor(Date.now() / 1000) + ttlSeconds;
  const signature = crypto
    .createHash("sha256")
    .update(`${libraryId}${apiKey}${expires}${guid}`)
    .digest("hex");
  return {
    endpoint: TUS_ENDPOINT,
    libraryId,
    videoId: guid,
    authorizationSignature: signature,
    authorizationExpire: expires,
  };
}

export function signedPlaybackUrl(guid: string, ttlSeconds = 60 * 60): string {
  return signedCdnUrl(`/${guid}/playlist.m3u8`, ttlSeconds);
}

export function signedDownloadUrl(
  guid: string,
  format: "play_720p.mp4" | "play_480p.mp4" | "play_360p.mp4" = "play_720p.mp4",
  ttlSeconds = 60 * 60,
): string {
  return signedCdnUrl(`/${guid}/${format}`, ttlSeconds);
}

export function thumbnailUrl(guid: string): string {
  const { cdnHost } = getCreds();
  return `https://${cdnHost}/${guid}/thumbnail.jpg`;
}

function signedCdnUrl(path: string, ttlSeconds: number): string {
  const { cdnHost, tokenAuthKey } = getCreds();
  if (!tokenAuthKey) return `https://${cdnHost}${path}`;
  const expires = Math.floor(Date.now() / 1000) + ttlSeconds;
  const raw = crypto
    .createHash("sha256")
    .update(`${tokenAuthKey}${path}${expires}`)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
  return `https://${cdnHost}${path}?token=${raw}&expires=${expires}`;
}
