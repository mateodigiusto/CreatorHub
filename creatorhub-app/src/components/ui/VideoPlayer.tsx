"use client";

/**
 * The only sanctioned way to render video in CreatorHub.
 *
 * The `creatorhub/no-bare-video` ESLint rule blocks `<video>` tags
 * everywhere outside this file (and tests).
 *
 * Rules encoded here (from the plan's Stream cost-control section):
 *   - Poster-only by default. Click swaps in the <video> element.
 *   - preload="none" on the video element.
 *   - No `autoPlay` prop is exposed.
 *   - Hover effects are CSS-only — no `onMouseEnter` triggering load.
 *   - State machine: playable / processing / failed (via assetState helper).
 */

import { useState } from "react";
import { Play, AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { assetState, videoVariants } from "@/lib/assets";
import type { Asset } from "@/db/schema";

type Props = {
  asset: Pick<Asset, "id" | "kind" | "title" | "thumbnailStorageKey" | "transcodedVariants">;
  /** Pre-resolved poster URL — Supabase Storage signed URL or Stream poster. */
  posterUrl?: string;
  /** Optional className for the outer wrapper. */
  className?: string;
};

export function VideoPlayer({ asset, posterUrl, className }: Props) {
  const [playing, setPlaying] = useState(false);
  const state = assetState(asset);
  const variants = videoVariants(asset);

  if (state === "processing") {
    return (
      <div
        className={cn(
          "relative aspect-video overflow-hidden rounded-md bg-surface-2 grid place-items-center",
          className,
        )}
      >
        <div className="flex flex-col items-center gap-2 text-muted">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-[12px]">Processing…</span>
        </div>
      </div>
    );
  }

  if (state === "failed") {
    return (
      <div
        className={cn(
          "relative aspect-video overflow-hidden rounded-md bg-surface-2 grid place-items-center border border-amber-500/30",
          className,
        )}
      >
        <div className="flex flex-col items-center gap-1.5 text-amber-700 max-w-[200px] text-center">
          <AlertTriangle className="w-5 h-5" />
          <span className="text-[12px] font-medium">Transcode failed</span>
          <span className="text-[10.5px] text-muted">Please re-upload this asset.</span>
        </div>
      </div>
    );
  }

  if (!playing) {
    return (
      <button
        type="button"
        onClick={() => setPlaying(true)}
        className={cn(
          "relative aspect-video overflow-hidden rounded-md bg-surface-2 group cursor-pointer",
          className,
        )}
        aria-label={`Play ${asset.title}`}
      >
        {posterUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={posterUrl}
            alt={asset.title}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : variants?.poster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={variants.poster}
            alt={asset.title}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        <div className="absolute inset-0 grid place-items-center">
          <span className="w-12 h-12 rounded-full bg-black/55 backdrop-blur-md grid place-items-center text-white group-hover:bg-black/70 transition-colors">
            <Play className="w-5 h-5 translate-x-[1px]" fill="currentColor" />
          </span>
        </div>
      </button>
    );
  }

  /* Click-to-play: swap in the real video element. preload="none" was
     already in effect because nothing was loaded; here we set it for the
     element we just inserted (defense in depth — the prop blocks autobuffer
     even after a click triggers play). */
  const src =
    variants?.hls_url ?? variants?.mp4_720p ?? variants?.mp4_360p ?? undefined;

  return (
    <div className={cn("relative aspect-video overflow-hidden rounded-md bg-black", className)}>
      <video
        src={src}
        controls
        preload="none"
        playsInline
        autoPlay
        className="absolute inset-0 w-full h-full"
        poster={variants?.poster ?? posterUrl}
      />
    </div>
  );
}
