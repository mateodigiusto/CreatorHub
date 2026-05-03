"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Wand2,
  Image as ImageIcon,
  Settings as SettingsIcon,
  Play,
  ArrowUpRight,
  Sparkles,
  FileText,
  Clock,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/cn";
import { MAX_VIDEO_SECONDS } from "@/lib/mock/story";
import type { ApiAsset } from "@/app/api/assets/route";

type DbSequence = {
  id: string;
  title: string;
  status: string;
  scheduled_at: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

const PLACEHOLDER_GRADIENTS = [
  "linear-gradient(135deg,#1E293B,#3B82F6)",
  "linear-gradient(135deg,#0F766E,#14B8A6)",
  "linear-gradient(135deg,#7C2D12,#F59E0B)",
  "linear-gradient(135deg,#312E81,#6366F1)",
  "linear-gradient(135deg,#0F172A,#94A3B8)",
];

function pickGradient(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash + seed.charCodeAt(i)) % 9999;
  return PLACEHOLDER_GRADIENTS[hash % PLACEHOLDER_GRADIENTS.length];
}

export default function SequenceStudioPage() {
  const router = useRouter();
  const [assets, setAssets] = useState<ApiAsset[] | null>(null);
  const [sequences, setSequences] = useState<DbSequence[] | null>(null);
  const [selected, setSelected] = useState<string[]>([]);

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

  const loadSequences = useCallback(async () => {
    try {
      const r = await fetch("/api/sequences", { credentials: "include" });
      if (!r.ok) {
        setSequences([]);
        return;
      }
      const json = (await r.json()) as { sequences: DbSequence[] };
      setSequences(json.sequences);
    } catch {
      setSequences([]);
    }
  }, []);

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --- one-shot bootstrap fetch on mount */
    void loadAssets();
    void loadSequences();
  }, [loadAssets, loadSequences]);

  /* Only playable assets, and videos must fit the sequence cap. Sequences
     can mix photos + short videos; long videos live in /library only. */
  const usable = useMemo(() => {
    if (!assets) return null;
    return assets.filter((a) => {
      if (a.state !== "playable") return false;
      if (a.kind === "video" && (a.durationSeconds ?? 0) > MAX_VIDEO_SECONDS) {
        return false;
      }
      return true;
    });
  }, [assets]);

  function toggle(id: string) {
    setSelected((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : s.length >= 5 ? s : [...s, id],
    );
  }

  function startSequence() {
    if (selected.length === 0) return;
    const params = new URLSearchParams({ assets: selected.join(",") });
    router.push(`/sequence-studio/new?${params.toString()}`);
  }

  const canStart = selected.length >= 1;

  return (
    <>
      <PageHeader
        title="Sequence Studio"
        description="Pick assets from your library, then build a sequence."
        actions={
          <>
            <Link
              href="/library"
              className="inline-flex items-center gap-1 text-[12.5px] font-medium text-muted hover:text-text px-2 py-1.5 cursor-pointer"
            >
              Open Library
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
            <span className="text-[12px] font-medium text-accent bg-accent-soft border border-accent-border px-2 py-1 rounded-full tabular-nums">
              {selected.length}/5
            </span>
            <Button onClick={startSequence} disabled={!canStart}>
              <Wand2 className="w-3.5 h-3.5" /> Start sequence
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
        <StepChip
          step="01"
          icon={<ImageIcon className="w-3.5 h-3.5" />}
          title="Pick assets"
          description="Choose 1–5 visuals from your library."
          active={selected.length === 0}
        />
        <StepChip
          step="02"
          icon={<SettingsIcon className="w-3.5 h-3.5" />}
          title="Set direction"
          description="Goal · style · brand context · brief."
          active={selected.length > 0}
        />
        <StepChip
          step="03"
          icon={<Play className="w-3.5 h-3.5" />}
          title="Build & ship"
          description="Preview, refine, schedule or publish."
        />
      </div>

      {sequences && sequences.length > 0 && (
        <Card className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-[15px] font-semibold tracking-[-0.005em] text-text">
                Recent sequences
              </h3>
              <p className="text-[13px] text-muted mt-0.5">
                Pick up where you left off.
              </p>
            </div>
            <Link
              href="/content"
              className="text-[12.5px] text-accent font-medium inline-flex items-center gap-1"
            >
              All in Content <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {sequences.slice(0, 6).map((s) => (
              <RecentSequenceTile key={s.id} sequence={s} />
            ))}
          </div>
        </Card>
      )}

      <Card>
        <div className="flex items-center justify-between mb-4 gap-3">
          <div>
            <h3 className="text-[15px] font-semibold tracking-[-0.005em] text-text">
              Your library
            </h3>
            <p className="text-[13px] text-muted mt-0.5">
              {usable === null
                ? "Loading…"
                : `${usable.length} asset${usable.length === 1 ? "" : "s"} ready to use. Click to select up to 5.`}
            </p>
          </div>
          {selected.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setSelected([])}>
              Clear
            </Button>
          )}
        </div>

        {usable === null ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[4/5] rounded-[12px] bg-surface-2 border border-border animate-pulse"
              />
            ))}
          </div>
        ) : usable.length === 0 ? (
          <EmptyState
            title="No assets yet."
            description="Upload photos or short videos in the Library to start building sequences."
            showSampleDataCta={false}
            primaryAction={{
              label: "Open Library",
              onClick: () => router.push("/library"),
            }}
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {usable.map((a) => {
              const sel = selected.includes(a.id);
              return (
                <PickerTile
                  key={a.id}
                  asset={a}
                  selected={sel}
                  order={sel ? selected.indexOf(a.id) : -1}
                  onToggle={() => toggle(a.id)}
                />
              );
            })}
          </div>
        )}
      </Card>

      {canStart && (
        <div className="sticky bottom-4 mt-4 flex justify-center pointer-events-none">
          <div className="pointer-events-auto inline-flex items-center gap-3 px-4 py-2.5 rounded-full bg-surface border border-border shadow-[var(--shadow-lift)] backdrop-blur-xl">
            <Sparkles className="w-4 h-4 text-accent" />
            <span className="text-[13px] font-medium text-text tabular-nums">
              {selected.length} selected
            </span>
            <Button size="sm" onClick={startSequence}>
              <Wand2 className="w-3.5 h-3.5" /> Start sequence
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

function StepChip({
  step,
  icon,
  title,
  description,
  active,
}: {
  step: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  active?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-[12px] border px-4 py-3 transition-colors bg-surface card-base",
        active ? "border-accent/35 bg-accent-soft/40" : "border-border",
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        <span
          className="text-[10.5px] uppercase font-semibold text-muted"
          style={{ letterSpacing: "0.08em" }}
        >
          Step {step}
        </span>
        <div
          className={cn(
            "w-5 h-5 rounded-md grid place-items-center text-white",
            active ? "bg-accent" : "bg-surface-3 text-muted",
          )}
          style={
            active
              ? undefined
              : { background: "var(--surface-3)", color: "var(--text-muted)" }
          }
        >
          {icon}
        </div>
      </div>
      <div className="text-[13.5px] font-semibold text-text tracking-[-0.005em]">
        {title}
      </div>
      <p className="text-[11.5px] text-muted mt-0.5 leading-snug">{description}</p>
    </div>
  );
}

function RecentSequenceTile({ sequence }: { sequence: DbSequence }) {
  const gradient = pickGradient(sequence.id);
  const date = new Date(sequence.updated_at);
  const ago = formatAgo(date);
  const tone: "accent" | "green" | "neutral" =
    sequence.status === "scheduled"
      ? "accent"
      : sequence.status === "published"
        ? "green"
        : "neutral";
  return (
    <Link
      href={`/content`}
      className="lift block rounded-[12px] border border-border bg-surface card-base overflow-hidden cursor-pointer"
    >
      <div className="aspect-[16/7] relative" style={{ background: gradient }}>
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
        <div className="absolute top-2 left-2">
          <span className="bg-black/30 backdrop-blur-sm text-white text-[10px] px-1.5 py-0.5 rounded font-medium uppercase tracking-wide inline-flex items-center gap-1">
            <FileText className="w-2.5 h-2.5" /> Sequence
          </span>
        </div>
      </div>
      <div className="px-3.5 py-3">
        <div className="text-[13.5px] font-semibold text-text truncate">
          {sequence.title}
        </div>
        <div className="text-[11.5px] text-muted mt-1 flex items-center gap-2">
          <Badge tone={tone}>{sequence.status}</Badge>
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3 h-3" /> {ago}
          </span>
        </div>
      </div>
    </Link>
  );
}

function formatAgo(date: Date): string {
  const ms = Date.now() - date.getTime();
  const min = Math.round(ms / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function PickerTile({
  asset,
  selected,
  order,
  onToggle,
}: {
  asset: ApiAsset;
  selected: boolean;
  order: number;
  onToggle: () => void;
}) {
  const isVideo = asset.kind === "video";
  const gradient = pickGradient(asset.id);
  return (
    <button
      onClick={onToggle}
      className={cn(
        "lift text-left rounded-[12px] border bg-surface card-base overflow-hidden relative transition-colors",
        selected ? "border-accent/55" : "border-border",
      )}
    >
      <div className="aspect-[4/5] relative" style={{ background: gradient }}>
        {asset.signedUrl && !isVideo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={asset.signedUrl}
            alt={asset.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        {asset.signedUrl && isVideo && (
          // eslint-disable-next-line creatorhub/no-bare-video --- click-to-play poster swap is in Phase 1 part 2 follow-up; preload="none" + muted keeps Storage egress low
          <video
            src={asset.signedUrl}
            muted
            playsInline
            preload="none"
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
        <div className="absolute top-2 left-2">
          <span className="bg-black/30 backdrop-blur-sm text-white text-[10px] px-1.5 py-0.5 rounded font-medium uppercase tracking-wide">
            {asset.kind}
          </span>
        </div>
        <div className="absolute top-2 right-2">
          <div
            className={cn(
              "w-5 h-5 rounded-full border grid place-items-center transition-colors",
              selected
                ? "bg-accent border-accent text-white"
                : "bg-white/85 border-white/70 text-transparent",
            )}
          >
            {selected ? (
              <span className="text-[10px] font-bold">{order + 1}</span>
            ) : (
              <span className="text-[10px]">·</span>
            )}
          </div>
        </div>
        {isVideo && asset.durationSeconds != null && (
          <div className="absolute bottom-2 left-2">
            <span className="inline-flex items-center gap-1 bg-black/45 backdrop-blur-sm text-white text-[10.5px] px-1.5 py-0.5 rounded font-medium tabular-nums">
              <Play className="w-3 h-3" fill="currentColor" />
              0:{String(Math.round(asset.durationSeconds)).padStart(2, "0")}
            </span>
          </div>
        )}
        <div className="absolute bottom-2 right-2 max-w-[60%]">
          <span className="text-white text-[12px] font-semibold drop-shadow truncate block">
            {asset.title}
          </span>
        </div>
      </div>
    </button>
  );
}
