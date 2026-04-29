"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
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
  Lock,
} from "lucide-react";
import {
  sampleAssets,
  sequenceTypes,
  sequenceStyles,
  sequenceGoals,
  brandContextDefault,
  generateSequence,
  Asset,
  SequenceType,
  SequenceStyle,
  SequenceGoal,
  GeneratedSequence,
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
  const { appendContentItem, showToast } = useAppState();

  const [step, setStep] = useState<Step>("assets");
  const [selected, setSelected] = useState<string[]>([
    "a1",
    "a3",
    "a2",
    "a6",
    "a8",
  ]);
  const [type, setType] = useState<SequenceType>("educational");
  const [style, setStyle] = useState<SequenceStyle>("premium");
  const [goal, setGoal] = useState<SequenceGoal>("dms");
  const [prompt, setPrompt] = useState(
    "Why most creators' content isn't converting to DMs."
  );
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

  async function handleGenerate() {
    setGenerating(true);
    setStage(0);
    setStep("preview");
    for (let i = 0; i < stages.length; i++) {
      setStage(i);
      await wait(580);
    }
    const seq = generateSequence(selected, goal, type, style);
    setSequence(seq);
    setGenerating(false);
  }

  function regenerateAll() {
    setGenerating(true);
    setStage(0);
    setSequence(null);
    void (async () => {
      for (let i = 0; i < stages.length; i++) {
        setStage(i);
        await wait(420);
      }
      setSequence(generateSequence(selected, goal, type, style));
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
    const fresh = generateSequence(selected, goal, type, style);
    const next = [...sequence.slides];
    next[idx] = { ...fresh.slides[idx % fresh.slides.length], id: `s-${Date.now()}-r${idx}` };
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
        sampleAssets.find((a) => a.id === sequence.slides[0]?.assetId)
          ?.gradient ?? sampleAssets[0].gradient,
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

      <div className="flex-1 overflow-y-auto px-6 pb-24">
        {step === "assets" && (
          <StepAssets
            selected={selected}
            onToggle={toggle}
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
            useBrand={useBrand}
            setUseBrand={setUseBrand}
            brandOpen={brandOpen}
            setBrandOpen={setBrandOpen}
          />
        )}
        {step === "preview" && (
          <StepPreview
            generating={generating}
            stage={stage}
            sequence={sequence}
            onReorder={reorder}
            onRemove={removeSlide}
            onRegenerateSlide={regenerateSlide}
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
    { key: "assets", label: "Pick assets" },
    { key: "direction", label: "Set direction" },
    { key: "preview", label: "Generate & preview" },
  ];
  const idx = items.findIndex((i) => i.key === step);
  return (
    <div className="px-6 pt-5 pb-4 border-b border-border bg-bg/30">
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
                      ? "bg-teal text-white border-teal"
                      : isActive
                      ? "bg-surface text-accent border-accent/50 shadow-[0_0_0_3px_rgba(37,99,235,0.12)]"
                      : "bg-surface text-muted border-border"
                  )}
                >
                  {isDone ? <Check className="w-3 h-3" /> : k + 1}
                </div>
                <span
                  className={cn(
                    "text-[12.5px] font-medium",
                    isActive ? "text-navy" : isDone ? "text-teal" : "text-muted"
                  )}
                >
                  {i.label}
                </span>
              </div>
              {k < items.length - 1 && (
                <div
                  className={cn(
                    "w-8 h-px",
                    isDone ? "bg-teal/40" : "bg-border"
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
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="pt-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="text-[14px] font-semibold tracking-tight text-navy">
            Choose 3–5 assets
          </h4>
          <p className="text-[12.5px] text-muted">
            CreatorHub analyzes mood, scene, and aesthetic score to suggest the
            right slide for each.
          </p>
        </div>
        <span className="text-[12px] font-medium text-teal bg-teal/10 border border-teal/20 px-2 py-0.5 rounded-full">
          {selected.length}/5 selected
        </span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {sampleAssets.map((a) => (
          <AssetCard
            key={a.id}
            asset={a}
            selected={selected.includes(a.id)}
            order={selected.indexOf(a.id)}
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
  onToggle,
}: {
  asset: Asset;
  selected: boolean;
  order: number;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "lift text-left rounded-[12px] border bg-surface card-base overflow-hidden relative transition-colors",
        selected ? "border-teal/55" : "border-border"
      )}
    >
      <div
        className="aspect-[4/5] relative"
        style={{ background: asset.gradient }}
      >
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
                ? "bg-teal border-teal text-white"
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
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-white">
          <span className="text-[12px] font-semibold drop-shadow truncate">
            {asset.title}
          </span>
          <span className="text-[11px] bg-black/30 backdrop-blur-sm px-1.5 py-0.5 rounded">
            {asset.aestheticScore.toFixed(1)}
          </span>
        </div>
      </div>
      <div className="p-3 space-y-1.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10.5px] text-teal bg-teal/10 px-1.5 py-0.5 rounded font-medium">
            {asset.mood}
          </span>
          <span className="text-[10.5px] text-muted">{asset.scene}</span>
        </div>
        <div className="text-[11px] text-muted leading-snug">
          <span className="text-navy/80 font-medium">Use as:</span>{" "}
          {asset.recommendedUse}
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
  useBrand: boolean;
  setUseBrand: (v: boolean) => void;
  brandOpen: boolean;
  setBrandOpen: (v: boolean) => void;
}) {
  return (
    <div className="pt-5 space-y-5">
      <Field label="Goal" hint="What should this sequence move forward?">
        <ChipRow
          value={props.goal}
          options={sequenceGoals}
          onChange={(v) => props.setGoal(v as SequenceGoal)}
        />
      </Field>

      <Field label="Sequence type">
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

      <Field label="What should it be about?">
        <textarea
          value={props.prompt}
          onChange={(e) => props.setPrompt(e.target.value)}
          rows={3}
          className="w-full p-3 rounded-[10px] bg-surface border border-border text-[13.5px] text-navy leading-relaxed focus:outline-none focus:border-teal/40 focus:ring-2 focus:ring-teal/20 resize-none"
          placeholder="Describe what this story sequence should be about…"
        />
      </Field>

      <BrandPanel
        open={props.brandOpen}
        setOpen={props.setBrandOpen}
        use={props.useBrand}
        setUse={props.setUseBrand}
      />

      <AutoModeCard />
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
      <div className="flex items-baseline justify-between mb-2">
        <label className="text-[12.5px] font-semibold text-navy">{label}</label>
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
              "h-8 px-3 rounded-[8px] text-[12.5px] font-medium border transition-colors",
              active
                ? "bg-teal/10 text-teal border-teal/35"
                : "bg-surface text-navy/70 border-border hover:border-teal/25 hover:text-navy"
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
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  use: boolean;
  setUse: (v: boolean) => void;
}) {
  return (
    <div className="rounded-[12px] border border-border bg-surface card-base">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-teal/10 text-teal grid place-items-center">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-[13px] font-semibold text-navy">
              Brand context
            </div>
            <div className="text-[11.5px] text-muted">
              {use ? "Using saved context" : "Off — using prompt only"}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Toggle checked={use} onChange={setUse} />
          <button
            onClick={() => setOpen(!open)}
            className="text-[12px] text-muted hover:text-navy underline-offset-2 hover:underline"
          >
            {open ? "Hide" : "View"}
          </button>
        </div>
      </div>
      {open && (
        <div className="border-t border-border p-4 grid grid-cols-2 gap-3 text-[12.5px]">
          <BrandLine label="Who you are" body={brandContextDefault.who} />
          <BrandLine label="Audience" body={brandContextDefault.audience} />
          <BrandLine label="Tone" body={brandContextDefault.tone} />
          <BrandLine label="CTA style" body={brandContextDefault.cta} />
        </div>
      )}
    </div>
  );
}

function BrandLine({ label, body }: { label: string; body: string }) {
  return (
    <div>
      <div className="text-[10.5px] uppercase tracking-wider text-muted font-semibold mb-1">
        {label}
      </div>
      <div className="text-navy/85 leading-relaxed">{body}</div>
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
        "relative w-9 h-5 rounded-full transition-colors",
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

function AutoModeCard() {
  return (
    <div
      className="relative rounded-[12px] p-4 overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, rgba(7,17,31,0.04), rgba(37,99,235,0.05))",
        border: "1px dashed rgba(37,99,235,0.30)",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className="w-7 h-7 rounded-md bg-navy/[0.06] text-navy grid place-items-center mt-0.5">
            <Lock className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <div className="text-[13px] font-semibold text-navy">
                Auto Mode
              </div>
              <Badge tone="neutral">Coming soon</Badge>
            </div>
            <p className="text-[12px] text-muted mt-1 leading-relaxed max-w-md">
              Let CreatorHub pick assets above an aesthetic threshold, generate
              sequences on a schedule, and push them straight to your calendar.
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" disabled>
          Get notified
        </Button>
      </div>
    </div>
  );
}

/* ─── Step 3: Preview ─────────────────────────────────────────────── */

function StepPreview({
  generating,
  stage,
  sequence,
  onReorder,
  onRemove,
  onRegenerateSlide,
  onEditOverlay,
}: {
  generating: boolean;
  stage: number;
  sequence: GeneratedSequence | null;
  onReorder: (i: number, dir: -1 | 1) => void;
  onRemove: (i: number) => void;
  onRegenerateSlide: (i: number) => void;
  onEditOverlay: (i: number, t: string) => void;
}) {
  if (generating || !sequence) {
    return (
      <div className="pt-8">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-teal/10 text-teal grid place-items-center mb-4 border border-teal/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <h4 className="text-[15px] font-semibold tracking-tight text-navy">
            Generating your sequence…
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
                    ? "bg-teal/[0.04] border-teal/20"
                    : active
                    ? "bg-surface border-accent/30 shadow-[0_0_0_3px_rgba(37,99,235,0.08)]"
                    : "bg-surface border-border"
                )}
              >
                <div
                  className={cn(
                    "w-5 h-5 rounded-full grid place-items-center border",
                    done
                      ? "bg-teal text-white border-teal"
                      : active
                      ? "bg-surface text-teal border-teal/50"
                      : "bg-surface text-muted border-border"
                  )}
                >
                  {done ? (
                    <Check className="w-3 h-3" />
                  ) : active ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-teal animate-pulse" />
                  ) : null}
                </div>
                <span
                  className={cn(
                    "text-[12.5px]",
                    done
                      ? "text-teal font-medium"
                      : active
                      ? "text-navy font-medium"
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
          <h4 className="text-[16px] font-semibold tracking-tight text-navy">
            {sequence.title}
          </h4>
          <p className="text-[12.5px] text-muted">
            {sequence.slides.length} slides · goal:{" "}
            <span className="text-teal font-medium">
              {sequenceGoals.find((g) => g.key === sequence.goal)?.label}
            </span>
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {sequence.slides.map((slide, idx) => {
          const asset = sampleAssets.find((a) => a.id === slide.assetId);
          return (
            <div
              key={slide.id}
              className="lift bg-surface border border-border rounded-[12px] card-base overflow-hidden"
            >
              <div className="grid grid-cols-[160px_1fr]">
                <div
                  className="relative"
                  style={{ background: asset?.gradient }}
                >
                  <div className="aspect-[4/5] relative">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent" />
                    <div className="absolute top-2 left-2 text-[10.5px] text-white/85 bg-black/30 backdrop-blur-sm px-1.5 py-0.5 rounded font-medium">
                      Slide {idx + 1}
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
                    <span className="text-[11px] text-muted">
                      {asset?.title}
                    </span>
                    <div className="ml-auto flex items-center gap-0.5">
                      <IconBtn
                        title="Move up"
                        onClick={() => onReorder(idx, -1)}
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </IconBtn>
                      <IconBtn
                        title="Move down"
                        onClick={() => onReorder(idx, 1)}
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </IconBtn>
                      <IconBtn
                        title="Regenerate"
                        onClick={() => onRegenerateSlide(idx)}
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </IconBtn>
                      <IconBtn title="Remove" onClick={() => onRemove(idx)}>
                        <X className="w-3.5 h-3.5" />
                      </IconBtn>
                    </div>
                  </div>
                  <EditableOverlay
                    value={slide.overlay}
                    onChange={(t) => onEditOverlay(idx, t)}
                  />
                  <div className="mt-2 text-[11.5px] text-teal/80 italic leading-snug">
                    <span className="not-italic font-medium">Why:</span>{" "}
                    {slide.reason}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
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
    Hook: "bg-cyan-soft/15 text-teal-blue border-teal-blue/25",
    Context: "bg-navy/[0.05] text-navy border-navy/15",
    Proof: "bg-emerald-500/10 text-emerald-700 border-emerald-500/25",
    Insight: "bg-teal/10 text-teal border-teal/25",
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
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="w-7 h-7 grid place-items-center rounded-md text-muted hover:text-text hover:bg-surface-2 transition-colors"
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
  useEffect(() => setDraft(value), [value]);
  if (editing) {
    return (
      <div className="flex items-start gap-2">
        <textarea
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={2}
          className="flex-1 p-2 rounded-[8px] bg-surface border border-teal/35 text-[13px] text-navy focus:outline-none focus:ring-2 focus:ring-teal/20 resize-none"
        />
        <button
          onClick={() => {
            onChange(draft.trim() || value);
            setEditing(false);
          }}
          className="text-[12px] text-teal font-medium px-2 py-1 hover:bg-teal/10 rounded"
        >
          Save
        </button>
      </div>
    );
  }
  return (
    <button
      onClick={() => setEditing(true)}
      className="text-left text-[13px] text-navy leading-relaxed group"
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
}: {
  step: Step;
  setStep: (s: Step) => void;
  selectedCount: number;
  onGenerate: () => void;
  onCommit: (a: "schedule" | "content") => void;
  onRegenerate: () => void;
  canCommit: boolean;
  entry: PlanContentDrawerEntry;
}) {
  const fromCalendar = entry === "calendar";
  return (
    <div className="absolute bottom-0 left-0 right-0 border-t border-border bg-surface/95 backdrop-blur-xl px-6 py-3 flex items-center justify-between gap-3">
      {step === "assets" && (
        <>
          <span className="text-[12px] text-muted">
            <ImageIcon className="inline-block w-3.5 h-3.5 mr-1 -translate-y-0.5" />
            Pick at least 3 assets to continue
          </span>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setStep("direction")}
              disabled={selectedCount < 3}
            >
              Continue <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </>
      )}
      {step === "direction" && (
        <>
          <Button variant="ghost" onClick={() => setStep("assets")}>
            <ChevronLeft className="w-3.5 h-3.5" /> Back
          </Button>
          <Button onClick={onGenerate}>
            <Sparkles className="w-3.5 h-3.5" /> Generate sequence
          </Button>
        </>
      )}
      {step === "preview" && (
        <>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => setStep("direction")}>
              <ChevronLeft className="w-3.5 h-3.5" /> Adjust direction
            </Button>
            <Button variant="outline" onClick={onRegenerate} disabled={!canCommit}>
              <RefreshCw className="w-3.5 h-3.5" /> Regenerate all
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
        </>
      )}
    </div>
  );
}
