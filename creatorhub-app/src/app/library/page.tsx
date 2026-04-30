"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Upload, Play, AlertTriangle, Wand2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/cn";
import { useAppState } from "@/lib/store";
import {
  sampleAssets,
  Asset,
  MAX_VIDEO_SECONDS,
  isVideoUsableInSequence,
} from "@/lib/mock/story";

type Tab = "all" | "photos" | "videos";

function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const PLACEHOLDER_GRADIENTS = [
  "linear-gradient(135deg,#1E293B,#3B82F6)",
  "linear-gradient(135deg,#0F766E,#14B8A6)",
  "linear-gradient(135deg,#7C2D12,#F59E0B)",
  "linear-gradient(135deg,#312E81,#6366F1)",
  "linear-gradient(135deg,#0F172A,#94A3B8)",
];

export default function LibraryPage() {
  const { extraAssets, appendAsset, showToast } = useAppState();
  const [tab, setTab] = useState<Tab>("all");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allAssets = useMemo(
    () => [...extraAssets, ...sampleAssets],
    [extraAssets]
  );

  const visible = useMemo(() => {
    if (tab === "photos")
      return allAssets.filter((a) => a.kind !== "video");
    if (tab === "videos")
      return allAssets.filter((a) => a.kind === "video");
    return allAssets;
  }, [allAssets, tab]);

  const photoCount = allAssets.filter((a) => a.kind !== "video").length;
  const videoCount = allAssets.filter((a) => a.kind === "video").length;

  function pickGradient(seed: number): string {
    return PLACEHOLDER_GRADIENTS[seed % PLACEHOLDER_GRADIENTS.length];
  }

  async function readVideoDuration(file: File): Promise<number> {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const v = document.createElement("video");
      v.preload = "metadata";
      v.muted = true;
      v.src = url;
      v.onloadedmetadata = () => {
        const d = v.duration;
        URL.revokeObjectURL(url);
        resolve(Number.isFinite(d) ? d : 0);
      };
      v.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(0);
      };
    });
  }

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    let added = 0;
    let tooLong = 0;
    const list = Array.from(files);
    for (let i = 0; i < list.length; i++) {
      const file = list[i];
      const isVideo = file.type.startsWith("video/");
      const isImage = file.type.startsWith("image/");
      if (!isVideo && !isImage) continue;

      const src = URL.createObjectURL(file);
      const baseTitle = file.name.replace(/\.[^.]+$/, "").slice(0, 60);
      const id = `up-${Date.now()}-${i}`;

      if (isVideo) {
        const duration = await readVideoDuration(file);
        const asset: Asset = {
          id,
          title: baseTitle || "Uploaded video",
          kind: "video",
          gradient: pickGradient(i),
          mood: "Custom upload",
          scene: "User asset",
          aestheticScore: 7.5,
          tags: ["upload"],
          recommendedUse:
            duration > MAX_VIDEO_SECONDS
              ? "Trim before using in a sequence"
              : "Hook or supporting slide",
          duration,
          src,
        };
        appendAsset(asset);
        added++;
        if (duration > MAX_VIDEO_SECONDS) tooLong++;
      } else {
        const asset: Asset = {
          id,
          title: baseTitle || "Uploaded photo",
          kind: "photo",
          gradient: pickGradient(i),
          mood: "Custom upload",
          scene: "User asset",
          aestheticScore: 7.5,
          tags: ["upload"],
          recommendedUse: "Hook or supporting slide",
          src,
        };
        appendAsset(asset);
        added++;
      }
    }

    if (tooLong > 0) {
      showToast(
        `${added} added · ${tooLong} too long for sequences (max ${MAX_VIDEO_SECONDS}s)`
      );
    } else if (added > 0) {
      showToast(
        `${added} asset${added === 1 ? "" : "s"} added to library`
      );
    }
  }

  return (
    <>
      <PageHeader
        title="Asset Library"
        description={`Photos and short videos for your sequences. Videos used in Sequence Studio must be ${MAX_VIDEO_SECONDS}s or shorter.`}
        actions={
          <>
            <Tabs<Tab>
              value={tab}
              onChange={setTab}
              options={[
                { value: "all", label: `All (${allAssets.length})` },
                { value: "photos", label: `Photos (${photoCount})` },
                { value: "videos", label: `Videos (${videoCount})` },
              ]}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              hidden
              onChange={(e) => {
                onFiles(e.target.files);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
            />
            <Button onClick={() => fileInputRef.current?.click()}>
              <Upload className="w-3.5 h-3.5" /> Upload
            </Button>
          </>
        }
      />

      {visible.length === 0 ? (
        <EmptyState
          title={tab === "videos" ? "No videos yet." : "No assets yet."}
          description={
            tab === "videos"
              ? `Upload a clip up to ${MAX_VIDEO_SECONDS}s to use it in a sequence.`
              : "Upload photos or videos to start building your library."
          }
          showSampleDataCta={false}
          primaryAction={{
            label: "Upload",
            onClick: () => fileInputRef.current?.click(),
          }}
        />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {visible.map((a) => (
            <AssetTile key={a.id} asset={a} />
          ))}
        </div>
      )}
    </>
  );
}

function AssetTile({ asset }: { asset: Asset }) {
  const isVideo = asset.kind === "video";
  const tooLong = isVideo && !isVideoUsableInSequence(asset);

  return (
    <div
      className={cn(
        "lift bg-surface border border-border rounded-[14px] card-base overflow-hidden",
        tooLong && "opacity-75"
      )}
    >
      <div className="aspect-[4/5] relative" style={{ background: asset.gradient }}>
        {asset.src && asset.kind !== "video" && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={asset.src}
            alt={asset.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        {asset.src && isVideo && (
          // eslint-disable-next-line creatorhub/no-bare-video -- demo blob-URL preview, no Cloudflare Stream variants yet; replaced by VideoPlayer in Phase 1 part 2 when DB-backed assets land
          <video
            src={asset.src}
            muted
            playsInline
            preload="metadata"
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />

        <div className="absolute top-2 left-2">
          <span className="bg-black/35 backdrop-blur-sm text-white text-[10px] px-1.5 py-0.5 rounded font-medium uppercase tracking-wide">
            {asset.kind}
          </span>
        </div>

        <div className="absolute top-2 right-2">
          <span className="bg-black/35 backdrop-blur-sm text-white text-[10.5px] px-1.5 py-0.5 rounded tabular-nums">
            {asset.aestheticScore.toFixed(1)}
          </span>
        </div>

        {isVideo && (
          <div className="absolute bottom-2 left-2">
            <span
              className={cn(
                "inline-flex items-center gap-1 text-[10.5px] px-1.5 py-0.5 rounded font-medium tabular-nums backdrop-blur-sm",
                tooLong
                  ? "bg-amber-500/90 text-white"
                  : "bg-black/45 text-white"
              )}
            >
              <Play className="w-3 h-3" fill="currentColor" />
              {formatDuration(asset.duration ?? 0)}
            </span>
          </div>
        )}

        <div className="absolute bottom-2 right-2 max-w-[55%]">
          <span className="text-white text-[12px] font-semibold drop-shadow truncate block">
            {asset.title}
          </span>
        </div>
      </div>

      <div className="p-3 space-y-1.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10.5px] text-accent bg-accent-soft px-1.5 py-0.5 rounded font-medium">
            {asset.mood}
          </span>
          <span className="text-[10.5px] text-muted">{asset.scene}</span>
        </div>
        {tooLong ? (
          <div className="flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-400 leading-snug">
            <AlertTriangle className="w-3 h-3 shrink-0" />
            Too long for sequences (max {MAX_VIDEO_SECONDS}s)
          </div>
        ) : (
          <div className="text-[11px] text-muted leading-snug">
            <span className="text-text/80 font-medium">Use as:</span>{" "}
            {asset.recommendedUse}
          </div>
        )}
        <div className="pt-1">
          <Link
            href="/sequence-studio"
            className={cn(
              "inline-flex items-center gap-1 text-[11.5px] font-medium transition-colors",
              tooLong
                ? "text-muted/60 pointer-events-none"
                : "text-accent hover:text-accent-2 cursor-pointer"
            )}
            tabIndex={tooLong ? -1 : 0}
            aria-disabled={tooLong}
          >
            <Wand2 className="w-3 h-3" />
            Use in sequence
          </Link>
        </div>
      </div>
    </div>
  );
}
