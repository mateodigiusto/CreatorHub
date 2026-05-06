"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Upload,
  Play,
  AlertTriangle,
  Wand2,
  CheckCircle2,
  Trash2,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { AddAssetCard } from "@/components/ui/AddAssetCard";
import { cn } from "@/lib/cn";
import { useAppState } from "@/lib/store";
import { uploadAssetFile } from "@/lib/uploads";
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
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  const toggleSelected = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const exitSelectMode = useCallback(() => {
    setSelectMode(false);
    setSelected(new Set());
  }, []);

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

  const bulkDelete = useCallback(async () => {
    if (selected.size === 0 || deleting) return;
    if (
      !window.confirm(
        `Delete ${selected.size} asset${selected.size === 1 ? "" : "s"}? This can't be undone.`,
      )
    ) {
      return;
    }
    setDeleting(true);
    const ids = Array.from(selected);
    /* Parallel — server-side per-asset audit + storage cleanup. */
    const results = await Promise.allSettled(
      ids.map((id) =>
        fetch(`/api/assets/${id}`, {
          method: "DELETE",
          credentials: "include",
        }).then((r) => (r.ok ? id : Promise.reject(new Error(`status_${r.status}`)))),
      ),
    );
    const ok = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.length - ok;
    setDeleting(false);
    exitSelectMode();
    await loadAssets();
    if (failed === 0) {
      showToast(`Deleted ${ok} asset${ok === 1 ? "" : "s"}`);
    } else if (ok === 0) {
      showToast("Couldn't delete. Try again.");
    } else {
      showToast(`Deleted ${ok}, failed ${failed} — try the rest again.`);
    }
  }, [selected, deleting, exitSelectMode, loadAssets, showToast]);

  const onFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      setUploading(true);
      let added = 0;
      let tooLong = 0;
      let failed = 0;
      for (const file of Array.from(files)) {
        const r = await uploadAssetFile(file);
        if (r.ok) {
          added++;
          if (r.tooLong) tooLong++;
        } else {
          failed++;
        }
      }
      await loadAssets();
      setUploading(false);

      if (added === 0 && failed > 0) {
        showToast(`Upload failed (${failed} file${failed === 1 ? "" : "s"})`);
        return;
      }
      if (added === 0) return;
      if (tooLong > 0) {
        showToast(
          `${added} added · ${tooLong} too long for sequences (max ${MAX_VIDEO_SECONDS}s)`,
        );
      } else {
        showToast(`${added} asset${added === 1 ? "" : "s"} added to library`);
      }
    },
    [loadAssets, showToast],
  );

  const headerActions = selectMode ? (
    <>
      <span className="text-[12.5px] text-muted">
        {selected.size} selected
      </span>
      <Button
        variant="outline"
        size="md"
        onClick={exitSelectMode}
        disabled={deleting}
      >
        <X className="w-3.5 h-3.5" />
        Cancel
      </Button>
      <Button
        size="md"
        onClick={bulkDelete}
        disabled={deleting || selected.size === 0}
        className="!bg-red-600 hover:!bg-red-700"
      >
        <Trash2 className="w-3.5 h-3.5" />
        {deleting ? "Deleting…" : `Delete ${selected.size}`}
      </Button>
    </>
  ) : (
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
      {assets && assets.length > 0 && (
        <Button
          variant="outline"
          size="md"
          onClick={() => setSelectMode(true)}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          Select
        </Button>
      )}
      <Button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
      >
        <Upload className="w-3.5 h-3.5" />
        {uploading ? "Uploading…" : "Upload"}
      </Button>
    </>
  );

  return (
    <>
      <PageHeader
        title="Asset Library"
        description={`Photos and short videos for your sequences. Videos used in Sequence Studio must be ${MAX_VIDEO_SECONDS}s or shorter.`}
        actions={headerActions}
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
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {!selectMode && (
            <AddAssetCard
              onFiles={onFiles}
              uploading={uploading}
              context="library"
            />
          )}
          {visible.map((a) => (
            <AssetTile
              key={a.id}
              asset={a}
              selectMode={selectMode}
              isSelected={selected.has(a.id)}
              onToggleSelect={() => toggleSelected(a.id)}
            />
          ))}
        </div>
      )}
    </>
  );
}

function AssetTile({
  asset,
  selectMode,
  isSelected,
  onToggleSelect,
}: {
  asset: ApiAsset;
  selectMode: boolean;
  isSelected: boolean;
  onToggleSelect: () => void;
}) {
  const isVideo = asset.kind === "video";
  const tooLong =
    isVideo && (asset.durationSeconds ?? 0) > MAX_VIDEO_SECONDS;
  const gradient = pickGradient(asset.id);

  return (
    <div
      onClick={selectMode ? onToggleSelect : undefined}
      className={cn(
        "relative bg-surface border rounded-[14px] card-base overflow-hidden transition-all",
        !selectMode && "lift",
        selectMode && "cursor-pointer",
        selectMode && isSelected
          ? "border-accent ring-2 ring-accent/30"
          : "border-border",
        tooLong && "opacity-75",
      )}
    >
      {selectMode && (
        <div className="absolute z-10 top-2 right-2 pointer-events-none">
          <span
            className={cn(
              "w-6 h-6 rounded-full grid place-items-center border-2 backdrop-blur-sm shadow-md",
              isSelected
                ? "bg-accent border-accent text-white"
                : "bg-black/40 border-white/80 text-transparent",
            )}
          >
            <CheckCircle2 className="w-4 h-4" />
          </span>
        </div>
      )}
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
