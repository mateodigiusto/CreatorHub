"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Wand2,
  Image as ImageIcon,
  Settings as SettingsIcon,
  Play,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { useAppState } from "@/lib/store";
import { sampleAssets, isVideoUsableInSequence, Asset } from "@/lib/mock/story";

export default function SequenceStudioPage() {
  const router = useRouter();
  const { extraAssets } = useAppState();
  const [selected, setSelected] = useState<string[]>([]);

  const allAssets = useMemo(
    () => [...extraAssets, ...sampleAssets].filter(isVideoUsableInSequence),
    [extraAssets]
  );

  function toggle(id: string) {
    setSelected((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : s.length >= 5 ? s : [...s, id]
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

      <Card>
        <div className="flex items-center justify-between mb-4 gap-3">
          <div>
            <h3 className="text-[15px] font-semibold tracking-[-0.005em] text-text">
              Your library
            </h3>
            <p className="text-[13px] text-muted mt-0.5">
              {allAssets.length} asset{allAssets.length === 1 ? "" : "s"} ready
              to use. Click to select up to 5.
            </p>
          </div>
          {selected.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelected([])}
            >
              Clear
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {allAssets.map((a) => {
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
      </Card>

      {canStart && (
        <div className="sticky bottom-4 mt-4 flex justify-center pointer-events-none">
          <div
            className="pointer-events-auto inline-flex items-center gap-3 px-4 py-2.5 rounded-full bg-surface border border-border shadow-[var(--shadow-lift)] backdrop-blur-xl"
          >
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
        active
          ? "border-accent/35 bg-accent-soft/40"
          : "border-border"
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
            active ? "bg-accent" : "bg-surface-3 text-muted"
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
      <p className="text-[11.5px] text-muted mt-0.5 leading-snug">
        {description}
      </p>
    </div>
  );
}

function PickerTile({
  asset,
  selected,
  order,
  onToggle,
}: {
  asset: Asset;
  selected: boolean;
  order: number;
  onToggle: () => void;
}) {
  const isVideo = asset.kind === "video";
  return (
    <button
      onClick={onToggle}
      className={cn(
        "lift text-left rounded-[12px] border bg-surface card-base overflow-hidden relative transition-colors",
        selected ? "border-accent/55" : "border-border"
      )}
    >
      <div
        className="aspect-[4/5] relative"
        style={{ background: asset.gradient }}
      >
        {asset.src && !isVideo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={asset.src}
            alt={asset.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        {asset.src && isVideo && (
          <video
            src={asset.src}
            muted
            playsInline
            preload="metadata"
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
                : "bg-white/85 border-white/70 text-transparent"
            )}
          >
            {selected ? (
              <span className="text-[10px] font-bold">{order + 1}</span>
            ) : (
              <span className="text-[10px]">·</span>
            )}
          </div>
        </div>
        {isVideo && (
          <div className="absolute bottom-2 left-2">
            <span className="inline-flex items-center gap-1 bg-black/45 backdrop-blur-sm text-white text-[10.5px] px-1.5 py-0.5 rounded font-medium tabular-nums">
              <Play className="w-3 h-3" fill="currentColor" />
              0:{String(Math.round(asset.duration ?? 0)).padStart(2, "0")}
            </span>
          </div>
        )}
        <div className="absolute bottom-2 right-2 max-w-[60%]">
          <span className="text-white text-[12px] font-semibold drop-shadow truncate block">
            {asset.title}
          </span>
        </div>
      </div>
      <div className="px-2.5 py-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10.5px] text-accent bg-accent-soft px-1.5 py-0.5 rounded font-medium">
            {asset.mood}
          </span>
          <span className="text-[10.5px] text-muted truncate">{asset.scene}</span>
        </div>
      </div>
    </button>
  );
}
