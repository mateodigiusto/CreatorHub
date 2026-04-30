/**
 * Asset state machine helper. Single rule for every UI surface that reads
 * a video asset's transcoded variants. Direct reads of
 * `asset.transcoded_variants` are forbidden — go through `assetState()`.
 */

import type { Asset } from "@/db/schema";

export type AssetState = "playable" | "failed" | "processing";

export type TranscodedVariants = {
  stream_uid?: string;
  hls_url?: string;
  dash_url?: string;
  mp4_360p?: string;
  mp4_720p?: string;
  mp4_1080p?: string;
  poster?: string;
  ready_at?: string;
  error?: string;
};

export function assetState(asset: Pick<Asset, "kind" | "transcodedVariants">): AssetState {
  /* Photos don't go through transcoding — they're playable on insert. */
  if (asset.kind !== "video") return "playable";
  const v = asset.transcodedVariants as TranscodedVariants | null | undefined;
  if (!v) return "processing";
  if (v.error) return "failed";
  if (v.ready_at) return "playable";
  return "processing";
}

export function videoVariants(asset: Pick<Asset, "transcodedVariants">): TranscodedVariants | null {
  return (asset.transcodedVariants as TranscodedVariants | null) ?? null;
}
