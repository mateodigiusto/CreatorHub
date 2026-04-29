"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { useAppState } from "@/lib/store";
import {
  Sparkles,
  Check,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  X,
  Image as ImageIcon,
  Pencil,
  Lock as LockIcon,
  Unlock as UnlockIcon,
  Wand2,
  Users,
  Play,
  Plus,
  Library as LibraryIcon,
  ArrowUpRight,
} from "lucide-react";
import {
  sampleAssets,
  sequenceTypes,
  sequenceStyles,
  sequenceGoals,
  generateSequence,
  copyForCell,
  hookFromPrompt,
  personas,
  isVideoUsableInSequence,
  MAX_VIDEO_SECONDS,
  Asset,
  SequenceType,
  SequenceStyle,
  SequenceGoal,
  GeneratedSequence,
  PersonaKey,
} from "@/lib/mock/story";
import { Post } from "@/lib/mock/types";
import { PlanContentDrawerEntry } from "./PlanContentDrawer";

type Step = "assets" | "direction" | "preview";

const stages = [
  "Analyzing selected assets",
  "Matching brand context",
  "Writing slide copy",
  "Designing slide overlays",
];

export function StorySequenceFlow({
  entry,
  slotDate,
  onDone,
}: {
  entry: PlanContentDrawerEntry;
  slotDate?: Date;
  onDone: () => void;
}) {
  const { appendContentItem, showToast, extraAssets } = useAppState();

  /* Library = uploaded assets + mock samples, with too-long videos hidden. */
  const availableAssets = useMemo(
    () => [...extraAssets, ...sampleAssets].filter(isVideoUsableInSequence),
    [extraAssets]
  );

  const [step, setStep] = useState<Step>("assets");
  const [selected, setSelected] = useState<string[]>([]);
  const [smartPicking, setSmartPicking] = useState(false);

  const [type, setType] = useState<SequenceType>("educational");
  const [style, setStyle] = useState<SequenceStyle>("premium");
  const [goal, setGoal] = useState<SequenceGoal>("dms");
  const [prompt, setPrompt] = useState(
    "Why most creators' content isn't converting to DMs."
  );
  const [persona, setPersona] = useState<PersonaKey>("coach");
  const [useBrand, setUseBrand] = useState(true);
  const [brandOpen, setBrandOpen] = useState(false);

  const [generating, setGenerating] = useState(false);
  const [stage, setStage] = useState(0);
  const [sequence, setSequence] = useState<GeneratedSequence | null>(null);

  function toggle(id: string) {
    setSelected((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : s.length >= 5 ? s : [...s, id]
    );
  }

  function smartPick() {
    setSmartPicking(true);
    setSelected([]);
    const ranked = [...availableAssets]
      .sort((a, b) => b.aestheticScore - a.aestheticScore)
      .slice(0, 5)
      .map((a) => a.id);
    // Reveal one-by-one for the shimmer effect.
    ranked.forEach((id, i) => {
      window.setTimeout(() => {
        setSelected((s) => (s.includes(id) ? s : [...s, id]));
        if (i === ranked.length - 1) {
          window.setTimeout(() => setSmartPicking(false), 200);
        }
      }, 110 * (i + 1));
    });
  }

  async function handleGenerate() {
    setGenerating(true);
    setStage(0);
    setStep("preview");
    for (let i = 0; i < stages.length; i++) {
      setStage(i);
      await wait(580);
    }
    const seq = generateSequence(selected, goal, type, style, persona, prompt);
    setSequence(seq);
    setGenerating(false);
  }

  function regenerateAll() {
    if (!sequence) return;
    setGenerating(true);
    setStage(0);
    const lockedSlides = sequence.slides.filter((s) => s.locked);
    setSequence(null);
    void (async () => {
      for (let i = 0; i < stages.length; i++) {
        setStage(i);
        await wait(420);
      }
      const fresh = generateSequence(selected, goal, type, style, persona, prompt);
      // Bump variant on each non-locked slide so copy actually rotates.
      const merged = fresh.slides.map((slide) => {
        const wasLocked = lockedSlides.find((l) => l.purpose === slide.purpose);
        if (wasLocked) return wasLocked;
        const nextVariant = 1;
        const overlay =
          slide.purpose === "Hook" && hookFromPrompt(prompt)
            ? hookFromPrompt(prompt)!
            : copyForCell(persona, goal, slide.purpose, nextVariant);
        return { ...slide, overlay, variant: nextVariant };
      });
      setSequence({ ...fresh, slides: merged });
      setGenerating(false);
    })();
  }

  function reorder(slideIndex: number, dir: -1 | 1) {
    if (!sequence) return;
    const next = [...sequence.slides];
    const j = slideIndex + dir;
    if (j < 0 || j >= next.length) return;
    [next[slideIndex], next[j]] = [next[j], next[slideIndex]];
    setSequence({ ...sequence, slides: next });
  }
  function removeSlide(idx: number) {
    if (!sequence) return;
    const next = sequence.slides.filter((_, i) => i !== idx);
    setSequence({ ...sequence, slides: next });
  }
  function regenerateSlide(idx: number) {
    if (!sequence) return;
    const slide = sequence.slides[idx];
    if (slide.locked) return;
    const nextVariant = slide.variant + 1;
    const overlay =
      slide.purpose === "Hook" && hookFromPrompt(prompt) && nextVariant % 3 === 0
        ? hookFromPrompt(prompt)!
        : copyForCell(persona, goal, slide.purpose, nextVariant);
    const next = [...sequence.slides];
    next[idx] = { ...slide, overlay, variant: nextVariant };
    setSequence({ ...sequence, slides: next });
  }
  function toggleLock(idx: number) {
    if (!sequence) return;
    const next = [...sequence.slides];
    next[idx] = { ...next[idx], locked: !next[idx].locked };
    setSequence({ ...sequence, slides: next });
  }
  function editOverlay(idx: number, text: string) {
    if (!sequence) return;
    const next = [...sequence.slides];
    next[idx] = { ...next[idx], overlay: text };
    setSequence({ ...sequence, slides: next });
  }

  function commit(action: "schedule" | "content") {
    if (!sequence) return;
    const post: Post = {
      id: `gen-${Date.now()}`,
      title: sequence.title,
      caption: prompt || sequence.title,
      type: "Story" as const,
      platform: "Instagram" as const,
      status: action === "schedule" ? "Scheduled" : "Review",
      thumbnail:
        availableAssets.find((a) => a.id === sequence.slides[0]?.assetId)
          ?.gradient ?? availableAssets[0]?.gradient ?? sampleAssets[0].gradient,
      publishedAt: undefined,
      scheduledAt:
        action === "schedule" && slotDate ? slotDate.toISOString() : undefined,
      reach: 0,
      likes: 0,
      comments: 0,
      saves: 0,
      shares: 0,
      engagementRate: 0,
    };
    appendContentItem(post);
    showToast(
      action === "schedule"
        ? `Sequence scheduled · ${sequence.slides.length} slides`
        : `Sequence moved to Content · status Review`
    );
    onDone();
  }

  return (
    <div className="flex flex-col h-full">
      <Stepper step={step} />

      <div className="flex-1 overflow-y-auto px-6 pb-28">
        {step === "assets" && (
          <StepAssets
            assets={availableAssets}
            selected={selected}
            onToggle={toggle}
            onSmartPick={smartPick}
            smartPicking={smartPicking}
          />
        )}
        {step === "direction" && (
          <StepDirection
            type={type}
            setType={setType}
            style={style}
            setStyle={setStyle}
            goal={goal}
            setGoal={setGoal}
            prompt={prompt}
            setPrompt={setPrompt}
            persona={persona}
            setPersona={setPersona}
            useBrand={useBrand}
            setUseBrand={setUseBrand}
            brandOpen={brandOpen}
            setBrandOpen={setBrandOpen}
          />
        )}
        {step === "preview" && (
          <StepPreview
            assets={availableAssets}
            generating={generating}
            stage={stage}
            sequence={sequence}
            onReorder={reorder}
            onRemove={removeSlide}
            onRegenerateSlide={regenerateSlide}
            onToggleLock={toggleLock}
            onEditOverlay={editOverlay}
          />
        )}
      </div>

      <Footer
        step={step}
        setStep={setStep}
        selectedCount={selected.length}
        onGenerate={handleGenerate}
        onCommit={commit}
        onRegenerate={regenerateAll}
        canCommit={!!sequence && !generating}
        entry={entry}
        summaryGoal={goal}
        summaryStyle={style}
        useBrand={useBrand}
      />
    </div>
  );
}

function wait(ms: number) {
  return new Promise<void>((res) => setTimeout(res, ms));
}

/* ─── Step header ─────────────────────────────────────────────────── */

function Stepper({ step }: { step: Step }) {
  const items: { key: Step; label: string }[] = [
    { key: "assets", label: "Pick the visuals" },
    { key: "direction", label: "Direction & brand" },
    { key: "preview", label: "Build the sequence" },
  ];
  const idx = items.findIndex((i) => i.key === step);
  return (
    <div className="px-6 pt-5 pb-4 border-b border-border bg-bg/30 shrink-0">
      <div className="flex items-center gap-2">
        {items.map((i, k) => {
          const isActive = k === idx;
          const isDone = k < idx;
          return (
            <div key={i.key} className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "w-5 h-5 rounded-full grid place-items-center text-[10.5px] font-semibold border transition-colors",
                    isDone
                      ? "bg-accent text-white border-accent"
                      : isActive
                      ? "bg-surface text-accent border-accent/50 shadow-[0_0_0_3px_var(--accent-soft)]"
                      : "bg-surface text-muted border-border"
                  )}
                >
                  {isDone ? <Check className="w-3 h-3" /> : k + 1}
                </div>
                <span
                  className={cn(
                    "text-[12.5px] font-medium",
                    isActive ? "text-text" : isDone ? "text-accent" : "text-muted"
                  )}
                >
                  {i.label}
                </span>
              </div>
              {k < items.length - 1 && (
                <div
                  className={cn(
                    "w-8 h-px",
                    isDone ? "bg-accent/40" : "bg-border"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Step 1: Pick assets ─────────────────────────────────────────── */

function StepAssets({
  assets,
  selected,
  onToggle,
  onSmartPick,
  smartPicking,
}: {
  assets: Asset[];
  selected: string[];
  onToggle: (id: string) => void;
  onSmartPick: () => void;
  smartPicking: boolean;
}) {
  return (
    <div className="pt-5">
      <div className="flex items-center justify-between mb-3 gap-3">
        <div className="min-w-0">
          <h4 className="text-[14px] font-semibold tracking-tight text-text">
            Choose 3–5 assets
          </h4>
          <p className="text-[12.5px] text-muted">
            From your Asset Library — scored on mood, scene, and aesthetic.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/library"
            className="inline-flex items-center gap-1 text-[12px] font-medium text-accent hover:text-accent-2 cursor-pointer"
          >
            <LibraryIcon className="w-3.5 h-3.5" />
            Choose from Library
            <ArrowUpRight className="w-3 h-3" />
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={onSmartPick}
            disabled={smartPicking}
            title="Auto-pick 5 high-aesthetic assets"
          >
            <Sparkles
              className={cn(
                "w-3.5 h-3.5",
                smartPicking && "animate-pulse"
              )}
            />
            Smart pick
          </Button>
          <span className="text-[12px] font-medium text-accent bg-accent-soft border border-accent-border px-2 py-0.5 rounded-full tabular-nums">
            {selected.length}/5
          </span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <AddAssetTile onUploaded={onToggle} />
        {assets.map((a) => (
          <AssetCard
            key={a.id}
            asset={a}
            selected={selected.includes(a.id)}
            order={selected.indexOf(a.id)}
            shimmer={smartPicking && selected.includes(a.id)}
            onToggle={() => onToggle(a.id)}
          />
        ))}
      </div>
    </div>
  );
}

function AssetCard({
  asset,
  selected,
  order,
  shimmer,
  onToggle,
}: {
  asset: Asset;
  selected: boolean;
  order: number;
  shimmer: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "lift text-left rounded-[12px] border bg-surface card-base overflow-hidden relative transition-colors",
        selected ? "border-accent/55" : "border-border",
        shimmer && "ring-2 ring-accent/40"
      )}
      style={shimmer ? { animation: "smart-pulse 600ms ease-out" } : undefined}
    >
      <div
        className="aspect-[4/5] relative"
        style={{ background: asset.gradient }}
      >
        {asset.src && asset.kind !== "video" && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={asset.src}
            alt={asset.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        {asset.src && asset.kind === "video" && (
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
        {asset.kind === "video" && (
          <div className="absolute bottom-2 left-2">
            <span className="inline-flex items-center gap-1 bg-black/45 backdrop-blur-sm text-white text-[10.5px] px-1.5 py-0.5 rounded font-medium tabular-nums">
              <Play className="w-3 h-3" fill="currentColor" />
              0:{String(Math.round(asset.duration ?? 0)).padStart(2, "0")}
            </span>
          </div>
        )}
        <div className="absolute bottom-2 right-2 max-w-[60%] flex items-center gap-1.5 text-white">
          <span className="text-[12px] font-semibold drop-shadow truncate">
            {asset.title}
          </span>
          <span className="text-[11px] bg-black/30 backdrop-blur-sm px-1.5 py-0.5 rounded shrink-0">
            {asset.aestheticScore.toFixed(1)}
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
        <div className="text-[11px] text-muted leading-snug">
          <span className="text-text/80 font-medium">Use as:</span>{" "}
          {asset.recommendedUse}
        </div>
      </div>
    </button>
  );
}

/* Inline upload tile — matches AssetCard's shape, lives at the start of the
   grid so users can add to the picker without leaving the drawer. Also
   appends to the global Library (extraAssets). */
function AddAssetTile({ onUploaded }: { onUploaded: (id: string) => void }) {
  const { appendAsset, showToast } = useAppState();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

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

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    let added = 0;
    let tooLong = 0;
    const usableIds: string[] = [];
    const list = Array.from(files);
    for (let i = 0; i < list.length; i++) {
      const file = list[i];
      const isVideo = file.type.startsWith("video/");
      const isImage = file.type.startsWith("image/");
      if (!isVideo && !isImage) continue;
      const src = URL.createObjectURL(file);
      const baseTitle = file.name.replace(/\.[^.]+$/, "").slice(0, 60);
      const id = `up-${Date.now()}-${i}`;
      const gradient = "linear-gradient(135deg,#1E293B,#3B82F6)";

      if (isVideo) {
        const duration = await readVideoDuration(file);
        const asset: Asset = {
          id,
          title: baseTitle || "Uploaded video",
          kind: "video",
          gradient,
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
        else usableIds.push(id);
      } else {
        const asset: Asset = {
          id,
          title: baseTitle || "Uploaded photo",
          kind: "photo",
          gradient,
          mood: "Custom upload",
          scene: "User asset",
          aestheticScore: 7.5,
          tags: ["upload"],
          recommendedUse: "Hook or supporting slide",
          src,
        };
        appendAsset(asset);
        added++;
        usableIds.push(id);
      }
    }
    setBusy(false);

    /* Auto-select usable uploads — capped to 5 by the toggle handler. */
    usableIds.forEach((id) => onUploaded(id));

    if (tooLong > 0) {
      showToast(
        `${added} added · ${tooLong} too long for sequences (saved to Library)`
      );
    } else if (added > 0) {
      showToast(`${added} asset${added === 1 ? "" : "s"} added`);
    }
  }

  return (
    <button
      onClick={() => inputRef.current?.click()}
      disabled={busy}
      className={cn(
        "lift text-left rounded-[12px] border-2 border-dashed border-border bg-surface/40 card-base overflow-hidden relative cursor-pointer hover:border-accent/45 disabled:cursor-wait disabled:opacity-60"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        hidden
        onChange={(e) => {
          handleFiles(e.target.files);
          if (inputRef.current) inputRef.current.value = "";
        }}
      />
      <div className="aspect-[4/5] relative grid place-items-center bg-surface-2/50">
        <div className="flex flex-col items-center gap-2.5 px-3 text-center">
          <div className="w-12 h-12 rounded-full bg-accent-soft border border-accent-border grid place-items-center text-accent">
            <Plus className="w-5 h-5" />
          </div>
          <div className="text-[12.5px] font-semibold text-text">
            Add new asset
          </div>
          <div className="text-[10.5px] text-muted leading-snug">
            Photo or video — max {MAX_VIDEO_SECONDS}s
          </div>
        </div>
      </div>
      <div className="p-3 space-y-1.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10.5px] text-muted bg-surface-2 px-1.5 py-0.5 rounded font-medium">
            Upload
          </span>
          <span className="text-[10.5px] text-muted">From your device</span>
        </div>
        <div className="text-[11px] text-muted leading-snug">
          <span className="text-text/80 font-medium">Saves to:</span> Library +
          this picker
        </div>
      </div>
    </button>
  );
}

/* ─── Step 2: Set direction ───────────────────────────────────────── */

function StepDirection(props: {
  type: SequenceType;
  setType: (t: SequenceType) => void;
  style: SequenceStyle;
  setStyle: (s: SequenceStyle) => void;
  goal: SequenceGoal;
  setGoal: (g: SequenceGoal) => void;
  prompt: string;
  setPrompt: (p: string) => void;
  persona: PersonaKey;
  setPersona: (p: PersonaKey) => void;
  useBrand: boolean;
  setUseBrand: (v: boolean) => void;
  brandOpen: boolean;
  setBrandOpen: (v: boolean) => void;
}) {
  return (
    <div className="pt-5 space-y-5">
      <Field label="Goal" hint="What's the goal?">
        <ChipRow
          value={props.goal}
          options={sequenceGoals}
          onChange={(v) => props.setGoal(v as SequenceGoal)}
        />
      </Field>

      <Field label="Format">
        <ChipRow
          value={props.type}
          options={sequenceTypes}
          onChange={(v) => props.setType(v as SequenceType)}
        />
      </Field>

      <Field label="Style">
        <ChipRow
          value={props.style}
          options={sequenceStyles}
          onChange={(v) => props.setStyle(v as SequenceStyle)}
        />
      </Field>

      <Field
        label="In a sentence — what's the story?"
        hint="The first line becomes your Hook"
      >
        <textarea
          value={props.prompt}
          onChange={(e) => props.setPrompt(e.target.value)}
          rows={3}
          className="w-full p-3 rounded-[10px] bg-surface border border-border text-[13.5px] text-text leading-relaxed focus:outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/20 resize-none"
          placeholder="One sentence. The Hook slide will use this directly…"
        />
        <PromptExamples onPick={props.setPrompt} />
      </Field>

      <BrandPanel
        open={props.brandOpen}
        setOpen={props.setBrandOpen}
        use={props.useBrand}
        setUse={props.setUseBrand}
        persona={props.persona}
        setPersona={props.setPersona}
      />
    </div>
  );
}

function PromptExamples({ onPick }: { onPick: (s: string) => void }) {
  const examples = [
    "90 days of content — what actually moved the needle.",
    "Why my offer works while others stall at week 2.",
    "Behind the build — the boring weeks nobody films.",
  ];
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {examples.map((e) => (
        <button
          key={e}
          onClick={() => onPick(e)}
          className="text-[11px] px-2 py-1 rounded-md bg-surface-2 text-muted border border-border cursor-pointer hover:text-text hover:border-accent/30 transition-colors"
        >
          {e}
        </button>
      ))}
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2 gap-2">
        <label className="text-[12.5px] font-semibold text-text">{label}</label>
        {hint && <span className="text-[11.5px] text-muted">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function ChipRow<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { key: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const active = o.key === value;
        return (
          <button
            key={o.key}
            onClick={() => onChange(o.key)}
            className={cn(
              "h-8 px-3 rounded-[8px] text-[12.5px] font-medium border cursor-pointer transition-colors",
              active
                ? "bg-accent-soft text-accent border-accent/35"
                : "bg-surface text-text/70 border-border hover:border-accent/25 hover:text-text"
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function BrandPanel({
  open,
  setOpen,
  use,
  setUse,
  persona,
  setPersona,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  use: boolean;
  setUse: (v: boolean) => void;
  persona: PersonaKey;
  setPersona: (p: PersonaKey) => void;
}) {
  const ctx = personas[persona].brandContext;
  return (
    <div className="rounded-[12px] border border-border bg-surface card-base">
      <div className="flex items-center justify-between px-4 py-3 gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-md bg-accent-soft text-accent grid place-items-center shrink-0">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="text-[13px] font-semibold text-text truncate">
              Brand context
            </div>
            <div className="text-[11.5px] text-muted truncate">
              {use ? `Using ${personas[persona].label}` : "Off — using prompt only"}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Toggle checked={use} onChange={setUse} />
          <button
            onClick={() => setOpen(!open)}
            className="text-[12px] text-muted hover:text-text underline-offset-2 hover:underline cursor-pointer"
          >
            {open ? "Hide" : "View"}
          </button>
        </div>
      </div>
      {open && (
        <div className="border-t border-border p-4 space-y-3">
          <PersonaPicker value={persona} onChange={setPersona} />
          <div className="grid grid-cols-2 gap-3 text-[12.5px]">
            <BrandLine label="Who you are" body={ctx.who} />
            <BrandLine label="Audience" body={ctx.audience} />
            <BrandLine label="Tone" body={ctx.tone} />
            <BrandLine label="CTA style" body={ctx.cta} />
          </div>
        </div>
      )}
    </div>
  );
}

function PersonaPicker({
  value,
  onChange,
}: {
  value: PersonaKey;
  onChange: (p: PersonaKey) => void;
}) {
  const keys = Object.keys(personas) as PersonaKey[];
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Users className="w-3 h-3 text-muted" />
        <span className="text-[10.5px] uppercase tracking-wider text-muted font-semibold">
          Persona
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {keys.map((k) => {
          const active = k === value;
          return (
            <button
              key={k}
              onClick={() => onChange(k)}
              className={cn(
                "h-7 px-2.5 rounded-[8px] text-[12px] font-medium border cursor-pointer transition-colors",
                active
                  ? "bg-accent-soft text-accent border-accent/35"
                  : "bg-surface text-text/70 border-border hover:border-accent/25 hover:text-text"
              )}
            >
              {personas[k].label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BrandLine({ label, body }: { label: string; body: string }) {
  return (
    <div>
      <div className="text-[10.5px] uppercase tracking-wider text-muted font-semibold mb-1">
        {label}
      </div>
      <div className="text-text/85 leading-relaxed">{body}</div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={cn(
        "relative w-9 h-5 rounded-full transition-colors cursor-pointer",
        checked ? "bg-accent" : "bg-surface-3"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform",
          checked && "translate-x-4"
        )}
      />
    </button>
  );
}

/* ─── Step 3: Preview ─────────────────────────────────────────────── */

function StepPreview({
  assets,
  generating,
  stage,
  sequence,
  onReorder,
  onRemove,
  onRegenerateSlide,
  onToggleLock,
  onEditOverlay,
}: {
  assets: Asset[];
  generating: boolean;
  stage: number;
  sequence: GeneratedSequence | null;
  onReorder: (i: number, dir: -1 | 1) => void;
  onRemove: (i: number) => void;
  onRegenerateSlide: (i: number) => void;
  onToggleLock: (i: number) => void;
  onEditOverlay: (i: number, t: string) => void;
}) {
  if (generating || !sequence) {
    return (
      <div className="pt-8">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-accent-soft text-accent grid place-items-center mb-4 border border-accent-border">
            <Sparkles className="w-5 h-5" />
          </div>
          <h4 className="text-[15px] font-semibold tracking-tight text-text">
            Building your sequence…
          </h4>
          <p className="text-[12.5px] text-muted mt-1 max-w-sm">
            CreatorHub is matching your assets to the goal, brand, and style you
            picked.
          </p>
        </div>
        <ul className="space-y-2 max-w-md mx-auto">
          {stages.map((s, i) => {
            const done = i < stage;
            const active = i === stage;
            return (
              <li
                key={s}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-[10px] border transition-colors",
                  done
                    ? "bg-accent-soft/50 border-accent-border"
                    : active
                    ? "bg-surface border-accent/30 shadow-[0_0_0_3px_var(--accent-soft)]"
                    : "bg-surface border-border"
                )}
              >
                <div
                  className={cn(
                    "w-5 h-5 rounded-full grid place-items-center border",
                    done
                      ? "bg-accent text-white border-accent"
                      : active
                      ? "bg-surface text-accent border-accent/50"
                      : "bg-surface text-muted border-border"
                  )}
                >
                  {done ? (
                    <Check className="w-3 h-3" />
                  ) : active ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                  ) : null}
                </div>
                <span
                  className={cn(
                    "text-[12.5px]",
                    done
                      ? "text-accent font-medium"
                      : active
                      ? "text-text font-medium"
                      : "text-muted"
                  )}
                >
                  {s}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  return (
    <div className="pt-5">
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <h4 className="text-[16px] font-semibold tracking-tight text-text">
            {sequence.title}
          </h4>
          <p className="text-[12.5px] text-muted">
            {sequence.slides.length} slides · goal:{" "}
            <span className="text-accent font-medium">
              {sequenceGoals.find((g) => g.key === sequence.goal)?.label}
            </span>
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {sequence.slides.map((slide, idx) => (
          <SlideCard
            key={slide.id}
            slide={slide}
            index={idx}
            assets={assets}
            onReorder={onReorder}
            onRemove={onRemove}
            onRegenerate={onRegenerateSlide}
            onToggleLock={onToggleLock}
            onEditOverlay={onEditOverlay}
          />
        ))}
      </div>
    </div>
  );
}

function SlideCard({
  slide,
  index,
  assets,
  onReorder,
  onRemove,
  onRegenerate,
  onToggleLock,
  onEditOverlay,
}: {
  slide: GeneratedSequence["slides"][number];
  index: number;
  assets: Asset[];
  onReorder: (i: number, dir: -1 | 1) => void;
  onRemove: (i: number) => void;
  onRegenerate: (i: number) => void;
  onToggleLock: (i: number) => void;
  onEditOverlay: (i: number, t: string) => void;
}) {
  const asset = useMemo(
    () => assets.find((a) => a.id === slide.assetId),
    [assets, slide.assetId]
  );
  return (
    <div
      className={cn(
        "lift bg-surface border border-border rounded-[12px] card-base overflow-hidden",
        slide.locked && "border-accent/40 ring-1 ring-accent/15"
      )}
      style={{
        animation: "slide-reveal 320ms cubic-bezier(0.23,1,0.32,1) both",
        animationDelay: `${index * 60}ms`,
      }}
    >
      <div className="grid grid-cols-[160px_1fr]">
        <div className="relative" style={{ background: asset?.gradient }}>
          <div className="aspect-[4/5] relative">
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent" />
            <div className="absolute top-2 left-2 text-[10.5px] text-white/85 bg-black/30 backdrop-blur-sm px-1.5 py-0.5 rounded font-medium">
              Slide {index + 1}
            </div>
            <div className="absolute bottom-2 left-2 right-2">
              <div className="text-white text-[11.5px] font-semibold leading-snug drop-shadow">
                {slide.overlay}
              </div>
            </div>
          </div>
        </div>
        <div className="p-4 flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <PurposePill purpose={slide.purpose} />
            <span className="text-[11px] text-muted truncate">
              {asset?.title}
            </span>
            <div className="ml-auto flex items-center gap-0.5">
              <IconBtn title="Move up" onClick={() => onReorder(index, -1)}>
                <ArrowUp className="w-3.5 h-3.5" />
              </IconBtn>
              <IconBtn title="Move down" onClick={() => onReorder(index, 1)}>
                <ArrowDown className="w-3.5 h-3.5" />
              </IconBtn>
              <IconBtn
                title={slide.locked ? "Unlock" : "Lock from regenerate"}
                onClick={() => onToggleLock(index)}
                active={slide.locked}
              >
                {slide.locked ? (
                  <LockIcon className="w-3.5 h-3.5" />
                ) : (
                  <UnlockIcon className="w-3.5 h-3.5" />
                )}
              </IconBtn>
              <IconBtn
                title={slide.locked ? "Locked — unlock to regenerate" : "Regenerate"}
                onClick={() => onRegenerate(index)}
                disabled={slide.locked}
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </IconBtn>
              <IconBtn title="Remove" onClick={() => onRemove(index)}>
                <X className="w-3.5 h-3.5" />
              </IconBtn>
            </div>
          </div>
          <EditableOverlay
            value={slide.overlay}
            onChange={(t) => onEditOverlay(index, t)}
          />
          <div className="mt-2 text-[11.5px] text-muted leading-snug">
            <span className="font-medium text-text/70">Why:</span> {slide.reason}
          </div>
        </div>
      </div>
    </div>
  );
}

function PurposePill({
  purpose,
}: {
  purpose: GeneratedSequence["slides"][number]["purpose"];
}) {
  const tones: Record<typeof purpose, string> = {
    Hook: "bg-cyan-soft/15 text-cyan-soft border-cyan-soft/30",
    Context: "bg-text/[0.05] text-text/80 border-text/15",
    Proof: "bg-emerald-500/10 text-emerald-700 border-emerald-500/25",
    Insight: "bg-accent-soft text-accent border-accent/25",
    CTA: "bg-amber-500/10 text-amber-700 border-amber-500/25",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[10.5px] font-semibold tracking-wide px-1.5 py-0.5 rounded-full border",
        tones[purpose]
      )}
    >
      {purpose}
    </span>
  );
}

function IconBtn({
  children,
  onClick,
  title,
  active,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={cn(
        "w-7 h-7 grid place-items-center rounded-md transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed",
        active
          ? "text-accent bg-accent-soft"
          : "text-muted hover:text-text hover:bg-surface-2"
      )}
    >
      {children}
    </button>
  );
}

function EditableOverlay({
  value,
  onChange,
}: {
  value: string;
  onChange: (t: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  // Sync local draft when parent regenerates the slide.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(value);
  }, [value]);
  if (editing) {
    return (
      <div className="flex items-start gap-2">
        <textarea
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={2}
          className="flex-1 p-2 rounded-[8px] bg-surface border border-accent/35 text-[13px] text-text focus:outline-none focus:ring-2 focus:ring-accent/20 resize-none"
        />
        <button
          onClick={() => {
            onChange(draft.trim() || value);
            setEditing(false);
          }}
          className="text-[12px] text-accent font-medium px-2 py-1 hover:bg-accent-soft rounded cursor-pointer"
        >
          Save
        </button>
      </div>
    );
  }
  return (
    <button
      onClick={() => setEditing(true)}
      className="text-left text-[13px] text-text leading-relaxed group cursor-pointer"
    >
      {value}
      <Pencil className="inline-block w-3 h-3 ml-1.5 text-muted/0 group-hover:text-muted transition-colors -translate-y-0.5" />
    </button>
  );
}

/* ─── Footer ──────────────────────────────────────────────────────── */

function Footer({
  step,
  setStep,
  selectedCount,
  onGenerate,
  onCommit,
  onRegenerate,
  canCommit,
  entry,
  summaryGoal,
  summaryStyle,
  useBrand,
}: {
  step: Step;
  setStep: (s: Step) => void;
  selectedCount: number;
  onGenerate: () => void;
  onCommit: (a: "schedule" | "content") => void;
  onRegenerate: () => void;
  canCommit: boolean;
  entry: PlanContentDrawerEntry;
  summaryGoal: SequenceGoal;
  summaryStyle: SequenceStyle;
  useBrand: boolean;
}) {
  const fromCalendar = entry === "calendar";
  const goalLabel = sequenceGoals.find((g) => g.key === summaryGoal)?.label;
  const styleLabel = sequenceStyles.find((s) => s.key === summaryStyle)?.label;

  return (
    <div className="absolute bottom-0 left-0 right-0 border-t border-border bg-surface/95 backdrop-blur-xl px-6 py-3 shrink-0">
      {step === "assets" && (
        <div className="flex items-center justify-between gap-3">
          <span className="text-[12px] text-muted">
            <ImageIcon className="inline-block w-3.5 h-3.5 mr-1 -translate-y-0.5" />
            Pick at least 3 assets to continue
          </span>
          <Button
            onClick={() => setStep("direction")}
            disabled={selectedCount < 3}
          >
            Continue <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}
      {step === "direction" && (
        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" onClick={() => setStep("assets")}>
            <ChevronLeft className="w-3.5 h-3.5" /> Back
          </Button>
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-[11.5px] text-muted truncate hidden sm:inline">
              5 slides · {goalLabel} · {styleLabel} · brand{" "}
              <span className={useBrand ? "text-accent font-medium" : "text-muted"}>
                {useBrand ? "on" : "off"}
              </span>
            </span>
            <Button onClick={onGenerate}>
              <Wand2 className="w-3.5 h-3.5" /> Build sequence
            </Button>
          </div>
        </div>
      )}
      {step === "preview" && (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => setStep("direction")}>
              <ChevronLeft className="w-3.5 h-3.5" /> Adjust
            </Button>
            <Button variant="outline" onClick={onRegenerate} disabled={!canCommit}>
              <RefreshCw className="w-3.5 h-3.5" /> Regenerate
            </Button>
          </div>
          <div className="flex items-center gap-2">
            {fromCalendar ? (
              <>
                <Button
                  variant="outline"
                  disabled={!canCommit}
                  onClick={() => onCommit("content")}
                >
                  Move to Content
                </Button>
                <Button
                  disabled={!canCommit}
                  onClick={() => onCommit("schedule")}
                >
                  Schedule in this slot
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  disabled={!canCommit}
                  onClick={() => onCommit("schedule")}
                >
                  Schedule
                </Button>
                <Button
                  disabled={!canCommit}
                  onClick={() => onCommit("content")}
                >
                  Move to Content
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
