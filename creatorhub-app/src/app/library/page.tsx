"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Upload, Play, AlertTriangle, Wand2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/cn";
import { useAppState } from "@/lib/store";
import { getSupabaseBrowser } from "@/lib/supabase/browser";
import { MAX_VIDEO_SECONDS } from "@/lib/mock/story";
import type { ApiAsset } from "@/app/api/assets/route";

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

function pickGradient(seed: string): string {
  /* Stable per-asset gradient from the id, so re-renders don't reshuffle. */
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash + seed.charCodeAt(i)) % 9999;
  return PLACEHOLDER_GRADIENTS[hash % PLACEHOLDER_GRADIENTS.length];
}

export default function LibraryPage() {
  const { showToast } = useAppState();
  const [tab, setTab] = useState<Tab>("all");
  const [assets, setAssets] = useState<ApiAsset[] | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadAssets = useCallback(async () => {
    try {
      const r = await fetch("/api/assets", { credentials: "include" });
      if (!r.ok) {
        setAssets([]);
        return;
      }
      const json = (await r.json()) as { assets: ApiAsset[] };
      setAssets(json.assets);
    } catch {
      setAssets([]);
    }
  }, []);

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --- one-shot bootstrap fetch on mount; loadAssets is async, setAssets fires after the await */
    void loadAssets();
  }, [loadAssets]);

  const visible = useMemo(() => {
    if (!assets) return null;
    if (tab === "photos") return assets.filter((a) => a.kind !== "video");
    if (tab === "videos") return assets.filter((a) => a.kind === "video");
    return assets;
  }, [assets, tab]);

  const photoCount = assets?.filter((a) => a.kind !== "video").length ?? 0;
  const videoCount = assets?.filter((a) => a.kind === "video").length ?? 0;

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

  async function uploadOne(file: File): Promise<{ ok: boolean; tooLong?: boolean }> {
    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");
    if (!isVideo && !isImage) return { ok: false };

    const baseTitle = file.name.replace(/\.[^.]+$/, "").slice(0, 60) || "Untitled";
    const durationSeconds = isVideo ? await readVideoDuration(file) : undefined;

    /* 1. Get a signed upload URL + pre-inserted asset row. */
    const initRes = await fetch("/api/assets/upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        kind: isVideo ? "video" : "photo",
        title: baseTitle,
        mimeType: file.type,
        sizeBytes: file.size,
        durationSeconds,
      }),
    });
    if (!initRes.ok) {
      const err = (await initRes.json().catch(() => ({}))) as { error?: string };
      showToast(`Upload failed: ${err.error ?? initRes.status}`);
      return { ok: false };
    }
    const init = (await initRes.json()) as {
      assetId: string;
      path: string;
      token: string;
    };

    /* 2. PUT the bytes directly to Storage. */
    const supabase = getSupabaseBrowser();
    const { error: uploadErr } = await supabase.storage
      .from("originals")
      .uploadToSignedUrl(init.path, init.token, file, {
        contentType: file.type,
      });
    if (uploadErr) {
      showToast(`Upload failed: ${uploadErr.message}`);
      return { ok: false };
    }

    /* 3. Tell the server the bytes landed → marks playable. */
    const finalizeRes = await fetch(`/api/assets/${init.assetId}/finalize`, {
      method: "POST",
      credentials: "include",
    });
    if (!finalizeRes.ok) {
      const err = (await finalizeRes.json().catch(() => ({}))) as { error?: string };
      showToast(`Finalize failed: ${err.error ?? finalizeRes.status}`);
      return { ok: false };
    }

    return {
      ok: true,
      tooLong: isVideo && (durationSeconds ?? 0) > MAX_VIDEO_SECONDS,
    };
  }

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    let added = 0;
    let tooLong = 0;
    for (const file of Array.from(files)) {
      const r = await uploadOne(file);
      if (r.ok) added++;
      if (r.tooLong) tooLong++;
    }
    await loadAssets();
    setUploading(false);

    if (added === 0) return;
    if (tooLong > 0) {
      showToast(
        `${added} added · ${tooLong} too long for sequences (max ${MAX_VIDEO_SECONDS}s)`,
      );
    } else {
      showToast(`${added} asset${added === 1 ? "" : "s"} added to library`);
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
                { value: "all", label: `All (${assets?.length ?? 0})` },
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
                void onFiles(e.target.files);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Upload className="w-3.5 h-3.5" />
              {uploading ? "Uploading…" : "Upload"}
            </Button>
          </>
        }
      />

      {visible === null ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[4/5] rounded-[14px] bg-surface-2 border border-border animate-pulse"
            />
          ))}
        </div>
      ) : visible.length === 0 ? (
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

function AssetTile({ asset }: { asset: ApiAsset }) {
  const isVideo = asset.kind === "video";
  const tooLong =
    isVideo && (asset.durationSeconds ?? 0) > MAX_VIDEO_SECONDS;
  const gradient = pickGradient(asset.id);

  return (
    <div
      className={cn(
        "lift bg-surface border border-border rounded-[14px] card-base overflow-hidden",
        tooLong && "opacity-75",
      )}
    >
      <div className="aspect-[4/5] relative" style={{ background: gradient }}>
        {asset.state === "playable" && asset.signedUrl && !isVideo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={asset.signedUrl}
            alt={asset.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        {asset.state === "playable" && asset.signedUrl && isVideo && (
          // eslint-disable-next-line creatorhub/no-bare-video --- click-to-play poster swap is in Phase 1 part 2 follow-up; preload="none" + muted keeps Storage egress low
          <video
            src={asset.signedUrl}
            muted
            playsInline
            preload="none"
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        {asset.state === "processing" && (
          <div className="absolute inset-0 grid place-items-center text-white text-[11px] font-medium">
            Processing…
          </div>
        )}
        {asset.state === "failed" && (
          <div className="absolute inset-0 grid place-items-center text-white text-[11px] font-medium">
            Upload failed
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />

        <div className="absolute top-2 left-2">
          <span className="bg-black/35 backdrop-blur-sm text-white text-[10px] px-1.5 py-0.5 rounded font-medium uppercase tracking-wide">
            {asset.kind}
          </span>
        </div>

        {isVideo && asset.durationSeconds != null && (
          <div className="absolute bottom-2 left-2">
            <span
              className={cn(
                "inline-flex items-center gap-1 text-[10.5px] px-1.5 py-0.5 rounded font-medium tabular-nums backdrop-blur-sm",
                tooLong
                  ? "bg-amber-500/90 text-white"
                  : "bg-black/45 text-white",
              )}
            >
              <Play className="w-3 h-3" fill="currentColor" />
              {formatDuration(asset.durationSeconds)}
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
        {tooLong ? (
          <div className="flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-400 leading-snug">
            <AlertTriangle className="w-3 h-3 shrink-0" />
            Too long for sequences (max {MAX_VIDEO_SECONDS}s)
          </div>
        ) : (
          <div className="text-[11px] text-muted leading-snug truncate">
            Uploaded {new Date(asset.createdAt).toLocaleDateString()}
          </div>
        )}
        <div className="pt-1">
          <Link
            href="/sequence-studio"
            className={cn(
              "inline-flex items-center gap-1 text-[11.5px] font-medium transition-colors",
              tooLong
                ? "text-muted/60 pointer-events-none"
                : "text-accent hover:text-accent-2 cursor-pointer",
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
