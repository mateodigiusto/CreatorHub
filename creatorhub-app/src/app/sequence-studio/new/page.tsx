"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Wand2,
  Sparkles,
  ChevronLeft,
  Download,
  Send,
  Pencil,
  RefreshCw,
  ThumbsUp,
  Lock as LockIcon,
  Unlock as UnlockIcon,
  X,
  Plus,
  Minus,
  Check,
  Play,
  Upload,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import { useAppState } from "@/lib/store";
import {
  sampleAssets,
  generateSequence,
  copyForCell,
  hookFromPrompt,
  personas,
  isVideoUsableInSequence,
  Asset,
  SequenceType,
  SequenceStyle,
  SequenceGoal,
  GeneratedSequence,
  PersonaKey,
} from "@/lib/mock/story";
import { Post } from "@/lib/mock/types";
import { personaForProfile } from "@/lib/onboarding/personalize";

/* ─── Local types ─────────────────────────────────────────────────── */

type ContentStyleKey = "cta" | "educational" | "carousel" | "reel";
const contentStyleCards: {
  key: ContentStyleKey;
  emoji: string;
  title: string;
  description: string;
  aspect: string;
}[] = [
  { key: "cta", emoji: "📲", title: "CTA Story", description: "Multi-slide story with hook, proof, and call-to-action", aspect: "1080×1920" },
  { key: "educational", emoji: "📚", title: "Educational Story", description: "Teach your audience with insights and a takeaway", aspect: "1080×1920" },
  { key: "carousel", emoji: "🎠", title: "Carousel Classic", description: "Square carousel for feed posts with bold hook", aspect: "1080×1080" },
  { key: "reel", emoji: "🎬", title: "Reel Cover", description: "Single statement slide for Instagram reel covers", aspect: "1080×1920" },
];

type BrandToneKey = "luxury" | "motivational" | "rawreal" | "educational";
const brandToneCards: {
  key: BrandToneKey;
  title: string;
  description: string;
}[] = [
  { key: "luxury", title: "Luxury", description: "Premium, polished" },
  { key: "motivational", title: "Motivational", description: "Bold, inspiring" },
  { key: "rawreal", title: "Raw & Real", description: "Authentic, unfiltered" },
  { key: "educational", title: "Educational", description: "Clear, authoritative" },
];

type TextLengthKey = "short" | "medium" | "long";
const textLengths: { key: TextLengthKey; label: string; words: string }[] = [
  { key: "short", label: "Short", words: "8–14 words per slide — punchy, single thought" },
  { key: "medium", label: "Medium", words: "15–25 words per slide — balanced rhythm" },
  { key: "long", label: "Long", words: "30–60 words per slide — full narrative (default)" },
];

type Decoration =
  | "arrows"
  | "highlights"
  | "underlines"
  | "bgBlocks"
  | "colorWords"
  | "clearSpace";
const decorationDefs: {
  key: Decoration;
  title: string;
  description: string;
}[] = [
  { key: "arrows", title: "Screenshot arrows", description: "Arrow pointing to screenshot overlays" },
  { key: "highlights", title: "Highlight words", description: "Highlight key words with accent bars" },
  { key: "underlines", title: "Underline words", description: "Underline key phrases inline" },
  { key: "bgBlocks", title: "Background blocks", description: "Color blocks behind text for contrast" },
  { key: "colorWords", title: "Colour words", description: "Key words in your accent colour" },
  { key: "clearSpace", title: "Use clear space", description: "Text in uncluttered area of the photo" },
];

const accentSwatches = [
  { key: "orange", label: "Orange", value: "#F97316" },
  { key: "blue", label: "Blue", value: "#2563EB" },
  { key: "red", label: "Red", value: "#EF4444" },
  { key: "green", label: "Green", value: "#10B981" },
];

const stylePresets: {
  key: string;
  label: string;
  gradient: string;
  caption: string;
}[] = [
  { key: "shelby", label: "Shelby", gradient: "linear-gradient(135deg,#1E1B4B,#7C3AED)", caption: "Premium · close crop" },
  { key: "niksetting", label: "NikSetting", gradient: "linear-gradient(135deg,#0F172A,#475569)", caption: "Bold heading · accent stat" },
  { key: "faiz", label: "Faiz", gradient: "linear-gradient(135deg,#7C2D12,#F59E0B)", caption: "Sun-soaked · scribbled CTA" },
];

const buildStages = [
  "Reading brand context",
  "Mapping goal to slide structure",
  "Writing slide copy",
  "Designing slide overlays",
];

function wait(ms: number) {
  return new Promise<void>((res) => setTimeout(res, ms));
}

function typeFromContentStyle(s: ContentStyleKey): SequenceType {
  if (s === "educational") return "educational";
  if (s === "carousel") return "authority";
  if (s === "reel") return "cta";
  return "cta";
}
function styleFromTone(t: BrandToneKey): SequenceStyle {
  if (t === "luxury") return "premium";
  if (t === "motivational") return "founder";
  if (t === "rawreal") return "raw";
  return "didactic";
}

/* ─── Page ────────────────────────────────────────────────────────── */

export default function NewSequencePage() {
  return (
    <Suspense fallback={<div className="text-[12.5px] text-muted">Loading…</div>}>
      <NewSequenceContent />
    </Suspense>
  );
}

/* Stable per-id placeholder gradient (matches Library + landing). */
const SS_GRADIENTS = [
  "linear-gradient(135deg,#1E293B,#3B82F6)",
  "linear-gradient(135deg,#0F766E,#14B8A6)",
  "linear-gradient(135deg,#7C2D12,#F59E0B)",
  "linear-gradient(135deg,#312E81,#6366F1)",
  "linear-gradient(135deg,#0F172A,#94A3B8)",
];
function ssGradient(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h + seed.charCodeAt(i)) % 9999;
  return SS_GRADIENTS[h % SS_GRADIENTS.length];
}

type ApiAssetLite = {
  id: string;
  kind: string;
  title: string;
  durationSeconds: number | null;
  state: "playable" | "processing" | "failed";
  signedUrl: string | null;
  createdAt: string;
};

function dbAssetToMockShape(a: ApiAssetLite, idx: number): Asset {
  return {
    id: a.id,
    title: a.title,
    kind: (a.kind === "video" ? "video" : "photo") as Asset["kind"],
    gradient: ssGradient(a.id),
    mood: "Custom upload",
    scene: "User asset",
    /* Bias newer uploads slightly higher so AI-pick reaches for fresh
       content first. Mock assets use real scores; uploads get 7.0–8.0. */
    aestheticScore: 7.0 + Math.min(1, idx * 0.05),
    tags: ["upload"],
    recommendedUse: "Hook or supporting slide",
    duration: a.durationSeconds ?? undefined,
    src: a.signedUrl ?? undefined,
  };
}

function NewSequenceContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { extraAssets, appendContentItem, showToast, profile } = useAppState();

  const [dbAssets, setDbAssets] = useState<Asset[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/assets", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { assets: ApiAssetLite[] } | null) => {
        if (cancelled || !data) return;
        const playable = data.assets.filter((a) => a.state === "playable");
        setDbAssets(playable.map((a, i) => dbAssetToMockShape(a, i)));
      })
      .catch(() => {
        /* Network blip → builder still functions on extraAssets + sampleAssets. */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const allAssets = useMemo(
    () =>
      [...dbAssets, ...extraAssets, ...sampleAssets].filter(
        isVideoUsableInSequence,
      ),
    [dbAssets, extraAssets],
  );

  const initialIds = useMemo(() => {
    const raw = params.get("assets") ?? "";
    return raw.split(",").filter(Boolean);
  }, [params]);

  const [name, setName] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>(initialIds);
  const [photoMode, setPhotoMode] = useState<"ai" | "manual">("manual");

  /* Goal isn't surfaced in this UI — it's derived from content style + tone. */
  const goal: SequenceGoal = "dms";
  const [contentStyle, setContentStyle] = useState<ContentStyleKey>("cta");
  const [slideCount, setSlideCount] = useState(5);
  const [brandTone, setBrandTone] = useState<BrandToneKey>("luxury");
  const [persona, setPersona] = useState<PersonaKey>(
    () => personaForProfile(profile)
  );
  const [useBrandPortfolio, setUseBrandPortfolio] = useState(false);
  const [stylePreset, setStylePreset] = useState<string | null>(null);

  const [overlayIds, setOverlayIds] = useState<string[]>([]);
  const overlayInputRef = useRef<HTMLInputElement>(null);

  const [textLength, setTextLength] = useState<TextLengthKey>("long");
  const [activeDecorations, setActiveDecorations] = useState<Decoration[]>([
    "underlines",
    "highlights",
    "colorWords",
  ]);
  const [accent, setAccent] = useState(accentSwatches[1].value);
  const [customAccentOpen, setCustomAccentOpen] = useState(false);

  const [brief, setBrief] = useState("");

  const [building, setBuilding] = useState(false);
  const [buildStage, setBuildStage] = useState(0);
  const [sequence, setSequence] = useState<GeneratedSequence | null>(null);
  const [version, setVersion] = useState(0);
  const [versionTime, setVersionTime] = useState<string | null>(null);

  const [aiNote, setAiNote] = useState("");

  /* Scroll to preview when built / on each version bump. */
  useEffect(() => {
    if (sequence) {
      const el = document.getElementById("preview-section");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sequence?.id, version]);

  function toggleDecoration(d: Decoration) {
    setActiveDecorations((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );
  }
  function removeAsset(id: string) {
    setSelectedIds((s) => s.filter((x) => x !== id));
  }

  function aiPickAssets() {
    const ranked = [...allAssets]
      .sort((a, b) => b.aestheticScore - a.aestheticScore)
      .slice(0, slideCount)
      .map((a) => a.id);
    setSelectedIds(ranked);
    setPhotoMode("ai");
    showToast(
      `Auto-picked ${ranked.length} top-aesthetic asset${ranked.length === 1 ? "" : "s"}`
    );
  }

  async function onOverlayFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const list = Array.from(files);
    let added = 0;
    for (let i = 0; i < list.length; i++) {
      const file = list[i];
      if (!file.type.startsWith("image/")) continue;
      const id = `ov-${Date.now()}-${i}`;
      setOverlayIds((prev) => [id, ...prev]);
      added++;
      void URL.createObjectURL(file);
    }
    if (added > 0) showToast(`${added} overlay${added === 1 ? "" : "s"} added`);
  }

  async function build() {
    if (selectedIds.length === 0) {
      showToast("Pick at least one asset first");
      return;
    }
    setBuilding(true);
    setBuildStage(0);
    setSequence(null);
    for (let i = 0; i < buildStages.length; i++) {
      setBuildStage(i);
      await wait(550);
    }
    const seq = generateSequence(
      selectedIds.slice(0, slideCount),
      goal,
      typeFromContentStyle(contentStyle),
      styleFromTone(brandTone),
      persona,
      brief
    );
    const slides = seq.slides.slice(0, slideCount);
    setSequence({ ...seq, title: name.trim() || seq.title, slides });
    setVersion(1);
    setVersionTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    setBuilding(false);
  }

  function rebuild() {
    if (!sequence) return build();
    setBuilding(true);
    setBuildStage(0);
    void (async () => {
      const lockedSlides = sequence.slides.filter((s) => s.locked);
      for (let i = 0; i < buildStages.length; i++) {
        setBuildStage(i);
        await wait(420);
      }
      const fresh = generateSequence(
        selectedIds.slice(0, slideCount),
        goal,
        typeFromContentStyle(contentStyle),
        styleFromTone(brandTone),
        persona,
        brief
      );
      const slides = fresh.slides.slice(0, slideCount);
      const merged = slides.map((slide) => {
        const wasLocked = lockedSlides.find((l) => l.purpose === slide.purpose);
        if (wasLocked) return wasLocked;
        const nextVariant = 1;
        const overlay =
          slide.purpose === "Hook" && hookFromPrompt(brief)
            ? hookFromPrompt(brief)!
            : copyForCell(persona, goal, slide.purpose, nextVariant);
        return { ...slide, overlay, variant: nextVariant };
      });
      setSequence({
        ...fresh,
        title: name.trim() || fresh.title,
        slides: merged,
      });
      setVersion((v) => v + 1);
      setVersionTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      setBuilding(false);
    })();
  }

  function applyAiNote() {
    if (!aiNote.trim()) return;
    setAiNote("");
    rebuild();
    showToast("Applied your direction · regenerated");
  }

  function reorder(idx: number, dir: -1 | 1) {
    if (!sequence) return;
    const next = [...sequence.slides];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    setSequence({ ...sequence, slides: next });
  }
  function regenerateSlide(idx: number) {
    if (!sequence) return;
    const slide = sequence.slides[idx];
    if (slide.locked) return;
    const nextVariant = slide.variant + 1;
    const overlay =
      slide.purpose === "Hook" &&
      hookFromPrompt(brief) &&
      nextVariant % 3 === 0
        ? hookFromPrompt(brief)!
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
    const firstAsset = allAssets.find((a) => a.id === sequence.slides[0]?.assetId);
    const post: Post = {
      id: `gen-${Date.now()}`,
      title: sequence.title,
      caption: brief || sequence.title,
      type: "Story" as const,
      platform: "Instagram" as const,
      status: action === "schedule" ? "Scheduled" : "Review",
      thumbnail: firstAsset?.gradient ?? sampleAssets[0].gradient,
      publishedAt: undefined,
      scheduledAt: action === "schedule" ? new Date().toISOString() : undefined,
      reach: 0,
      likes: 0,
      comments: 0,
      saves: 0,
      shares: 0,
      engagementRate: 0,
    };
    appendContentItem(post);

    /* Fire-and-forget DB save. Authenticated users get cross-device
       persistence; demo / unauthenticated visitors silently no-op (the
       endpoint returns 401, the localStorage copy still works). */
    void fetch("/api/sequences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        title: sequence.title,
        goal,
        contentStyle,
        brandTone,
        persona,
        brief: brief || null,
        slides: sequence.slides,
        status: action === "schedule" ? "scheduled" : "review",
        scheduledAt: action === "schedule" ? new Date().toISOString() : undefined,
        accentColor: accent,
        decorations: activeDecorations,
      }),
    }).catch(() => {
      /* network blip — localStorage post still saved above. */
    });

    showToast(
      action === "schedule"
        ? `Sequence scheduled · ${sequence.slides.length} slides`
        : `Sequence saved to Content · status Review`
    );
    router.push("/content");
  }

  function downloadMock() {
    showToast(`Sequence exported · ${sequence?.slides.length ?? 0} slides`);
  }
  function publishMock() {
    showToast("Queued for Instagram · publishing soon");
  }

  const selectedAssets = useMemo(
    () =>
      selectedIds
        .map((id) => allAssets.find((a) => a.id === id))
        .filter((a): a is Asset => !!a),
    [selectedIds, allAssets]
  );

  const lengthMeta = textLengths.find((t) => t.key === textLength)!;

  return (
    <>
      <PageHeader
        title="Create content"
        description="Configure your sequence and hit build."
        actions={
          <>
            <Button variant="ghost" onClick={() => router.push("/sequence-studio")}>
              <ChevronLeft className="w-3.5 h-3.5" /> Back
            </Button>
            {!sequence && (
              <Button onClick={build} disabled={building || selectedIds.length === 0}>
                <Wand2 className="w-3.5 h-3.5" />
                {building ? "Building…" : "Build sequence"}
              </Button>
            )}
            {sequence && (
              <Button onClick={rebuild} variant="outline" disabled={building}>
                <RefreshCw className="w-3.5 h-3.5" /> Rebuild
              </Button>
            )}
          </>
        }
      />

      {/* Section 01 — Sequence details */}
      <SectionCard num="01" title="Sequence details" subtitle="Pick photos, name it, choose how to source visuals.">
        {selectedAssets.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2 gap-2">
              <span className="text-[12.5px] font-semibold text-text">
                {selectedAssets.length} {selectedAssets.length === 1 ? "photo" : "photos"} selected
              </span>
              <span className="text-[11.5px] text-muted tabular-nums">{selectedAssets.length} / 5</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {selectedAssets.map((a, i) => (
                <SelectedThumb key={a.id} asset={a} order={i + 1} onRemove={() => removeAsset(a.id)} />
              ))}
              <Link
                href="/sequence-studio"
                className="inline-flex items-center gap-1 h-[68px] px-3 rounded-[10px] border border-dashed border-border text-[12px] font-medium text-muted hover:text-text hover:border-accent/30 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Pick more
              </Link>
            </div>
          </div>
        )}

        <Field label="Name (optional)">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name this generation, e.g. 'Faye Monday CTA'"
            className="w-full h-10 px-3 rounded-[10px] bg-surface border border-border text-[13.5px] text-text focus:outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/20"
          />
        </Field>

        <Field label="Photo selection">
          <div className="grid grid-cols-2 gap-2.5">
            <SelectableCard
              active={photoMode === "ai"}
              onClick={() => {
                setPhotoMode("ai");
                aiPickAssets();
              }}
              title="Let AI pick"
              description="Auto-select unused photos"
            />
            <SelectableCard
              active={photoMode === "manual"}
              onClick={() => setPhotoMode("manual")}
              title="I'll choose"
              description="Pick specific photos"
              rightSlot={
                <Link
                  href="/sequence-studio"
                  className="text-[11.5px] text-accent hover:text-accent-2 font-medium cursor-pointer"
                >
                  Open Library →
                </Link>
              }
            />
          </div>
        </Field>
      </SectionCard>

      {/* Section 02 — Content style */}
      <SectionCard num="02" title="Content style" subtitle="Pick the format. Drives slide structure + dimensions.">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {contentStyleCards.map((c) => (
            <ContentStyleTile
              key={c.key}
              emoji={c.emoji}
              title={c.title}
              description={c.description}
              aspect={c.aspect}
              active={contentStyle === c.key}
              onClick={() => setContentStyle(c.key)}
            />
          ))}
        </div>

        <Field label="Slide count" hint={`${selectedAssets.length} ${selectedAssets.length === 1 ? "photo" : "photos"} selected`}>
          <SlideStepper value={slideCount} onChange={setSlideCount} />
        </Field>
      </SectionCard>

      {/* Section 03 — Brand tone */}
      <SectionCard num="03" title="Brand tone" subtitle="How the writing should feel.">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          {brandToneCards.map((t) => (
            <ToneTile
              key={t.key}
              title={t.title}
              description={t.description}
              active={brandTone === t.key}
              onClick={() => setBrandTone(t.key)}
            />
          ))}
        </div>

        <Field label="Brand context (optional)" hint="Reference past copy, wins, or SOPs.">
          <CheckboxCard
            checked={useBrandPortfolio}
            onChange={setUseBrandPortfolio}
            title={`${personas[persona].label}'s portfolio`}
            description="About you · saved voice & audience"
            secondary={
              <select
                value={persona}
                onChange={(e) => setPersona(e.target.value as PersonaKey)}
                className="text-[11.5px] bg-surface border border-border rounded-md px-1.5 py-1 text-text focus:outline-none focus:border-accent/40"
              >
                {(Object.keys(personas) as PersonaKey[]).map((k) => (
                  <option key={k} value={k}>
                    {personas[k].label}
                  </option>
                ))}
              </select>
            }
          />
          <div className="rounded-[10px] border border-dashed border-border bg-surface-2/40 px-3 py-2 mt-2 text-[11.5px] text-muted">
            Saved presets coming soon — save voice, palette, and decorations as one preset.
          </div>
        </Field>
      </SectionCard>

      {/* Section 04 — Style preset */}
      <SectionCard num="04" title="Style preset (optional)" subtitle="Visual direction for typography and layout.">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <PresetTile
            active={stylePreset === null}
            label="None"
            caption="Clean defaults"
            gradient="linear-gradient(135deg,#0F172A,#475569)"
            preview="default"
            onClick={() => setStylePreset(null)}
          />
          {stylePresets.map((p) => (
            <PresetTile
              key={p.key}
              active={stylePreset === p.key}
              label={p.label}
              caption={p.caption}
              gradient={p.gradient}
              preview={p.key as "shelby" | "niksetting" | "faiz"}
              onClick={() => setStylePreset(p.key)}
            />
          ))}
        </div>
      </SectionCard>

      {/* Section 05 — Screenshot overlays */}
      <SectionCard num="05" title="Screenshot overlays (optional)" subtitle="Upload evidence — revenue, DMs, testimonials. Pinned on a slide.">
        <input
          ref={overlayInputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            onOverlayFiles(e.target.files);
            if (overlayInputRef.current) overlayInputRef.current.value = "";
          }}
        />
        <button
          onClick={() => overlayInputRef.current?.click()}
          className="w-full rounded-[12px] border-2 border-dashed border-border bg-surface-2/40 hover:border-accent/40 hover:bg-surface-2/60 transition-colors py-10 px-6 grid place-items-center text-center cursor-pointer"
        >
          <div>
            <Upload className="w-5 h-5 mx-auto mb-2 text-muted" />
            <div className="text-[13px] text-text font-medium">
              Drop screenshots here or click to upload
            </div>
            <div className="text-[11px] text-muted mt-0.5">JPG, PNG, WebP · Max 10</div>
          </div>
        </button>

        <div>
          <div className="text-[11.5px] text-muted mb-2">
            Or select from your library ({Math.min(4, allAssets.filter((a) => a.kind === "screenshot" || a.kind === "proof").length || 4)})
          </div>
          <div className="flex flex-wrap gap-2">
            {allAssets
              .filter((a) => a.kind === "screenshot" || a.kind === "proof")
              .slice(0, 4)
              .map((a) => (
                <button
                  key={a.id}
                  onClick={() => {
                    setOverlayIds((prev) => (prev.includes(a.id) ? prev : [a.id, ...prev]));
                    showToast("Added from library");
                  }}
                  title={a.title}
                  className="w-14 h-14 rounded-md border border-border overflow-hidden cursor-pointer hover:border-accent/40 transition-colors"
                  style={{ background: a.gradient }}
                >
                  {a.src && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={a.src}
                      alt={a.title}
                      className="w-full h-full object-cover"
                    />
                  )}
                </button>
              ))}
          </div>
        </div>

        {overlayIds.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11.5px] text-muted">Selected · {overlayIds.length}</span>
              <button
                onClick={() => setOverlayIds([])}
                className="text-[11.5px] text-muted hover:text-text cursor-pointer"
              >
                Clear
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {overlayIds.map((id, i) => (
                <div
                  key={id}
                  className="w-14 h-16 rounded-md border border-border grid place-items-center text-white relative"
                  style={{ background: stylePresets[i % stylePresets.length].gradient }}
                  title="Overlay"
                >
                  <span className="text-[18px]">📊</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </SectionCard>

      {/* Section 06 — Text length */}
      <SectionCard num="06" title="Text length" subtitle="How verbose each slide should be.">
        <div className="grid grid-cols-3 gap-2">
          {textLengths.map((t) => {
            const active = textLength === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTextLength(t.key)}
                className={cn(
                  "h-12 rounded-[10px] border text-[13.5px] font-semibold cursor-pointer transition-colors",
                  active
                    ? "border-accent/45 bg-accent-soft text-text"
                    : "border-border bg-surface text-text/70 hover:border-accent/25 hover:text-text"
                )}
              >
                {t.label}
              </button>
            );
          })}
        </div>
        <div className="text-[12px] text-muted mt-2">{lengthMeta.words}</div>
      </SectionCard>

      {/* Section 07 — Decorations */}
      <SectionCard num="07" title="Decorations" subtitle="Toggle visual treatments to apply.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {decorationDefs.map((d) => {
            const active = activeDecorations.includes(d.key);
            return (
              <DecorationToggle
                key={d.key}
                title={d.title}
                description={d.description}
                checked={active}
                onChange={() => toggleDecoration(d.key)}
              />
            );
          })}
        </div>
      </SectionCard>

      {/* Section 08 — Accent color */}
      <SectionCard num="08" title="Accent color (optional)" subtitle="Used for highlighted words, dividers, and chips.">
        <div className="flex flex-wrap items-start gap-3">
          {accentSwatches.map((c) => {
            const active = c.value === accent && !customAccentOpen;
            return (
              <button
                key={c.key}
                onClick={() => {
                  setAccent(c.value);
                  setCustomAccentOpen(false);
                }}
                className="flex flex-col items-center gap-1.5 cursor-pointer"
              >
                <span
                  className={cn(
                    "w-9 h-9 rounded-full border-2 transition-transform",
                    active ? "border-text scale-110" : "border-border"
                  )}
                  style={{ background: c.value }}
                />
                <span className="text-[11px] text-muted">{c.label}</span>
              </button>
            );
          })}
          <button
            onClick={() => setCustomAccentOpen(true)}
            className="flex flex-col items-center gap-1.5 cursor-pointer"
          >
            <span
              className={cn(
                "w-9 h-9 rounded-full border-2 grid place-items-center transition-transform",
                customAccentOpen ? "border-text scale-110" : "border-border"
              )}
              style={{
                background: customAccentOpen ? accent : "var(--surface-2)",
              }}
            >
              <Plus
                className={cn(
                  "w-4 h-4",
                  customAccentOpen ? "text-white" : "text-muted"
                )}
              />
            </span>
            <span className="text-[11px] text-muted tabular-nums">
              {customAccentOpen ? accent.toUpperCase() : "Custom"}
            </span>
          </button>
          {customAccentOpen && (
            <input
              type="color"
              value={accent}
              onChange={(e) => setAccent(e.target.value)}
              className="self-start mt-1 h-9 w-12 rounded-md border border-border cursor-pointer bg-surface"
            />
          )}
        </div>
      </SectionCard>

      {/* Section 09 — Story brief */}
      <SectionCard num="09" title="Story brief (optional)" subtitle="The more specific, the better. The first sentence becomes your Hook.">
        <textarea
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          rows={5}
          placeholder={
            "Describe exactly what this story should be about.\n\nExamples:\n• Show how I went from $0 to $10K/month by switching from hourly to retainer. Use the revenue screenshot on slide 3.\n• Teach my 3-step framework for closing high-ticket clients over DM. Educational, no fluff."
          }
          className="w-full p-3 rounded-[10px] bg-surface border border-border text-[13px] text-text leading-relaxed focus:outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/20 resize-none"
        />
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {[
            "Why my offer works while others stall.",
            "90 days of content — what actually moved the needle.",
            "Behind the build — the boring weeks nobody films.",
          ].map((e) => (
            <button
              key={e}
              onClick={() => setBrief(e)}
              className="text-[11.5px] px-2.5 py-1.5 rounded-md bg-surface-2 text-muted border border-border cursor-pointer hover:text-text hover:border-accent/30 transition-colors"
            >
              {e}
            </button>
          ))}
        </div>
      </SectionCard>

      {/* Build button (when no preview yet) */}
      {!sequence && !building && (
        <div className="flex flex-col items-center text-center py-8">
          <Button size="md" onClick={build} disabled={selectedIds.length === 0}>
            <Wand2 className="w-3.5 h-3.5" /> Build sequence
          </Button>
          <p className="text-[11.5px] text-muted mt-2">
            Free demo · sequences live in this session.
          </p>
        </div>
      )}

      {/* Preview & ship */}
      {(building || sequence) && (
        <div id="preview-section">
          {building && (
            <Card className="mb-4">
              <BuildingState stage={buildStage} />
            </Card>
          )}

          {sequence && !building && (
            <Card className="mb-4 p-0 overflow-hidden">
              <div className="px-5 pt-5 pb-4 border-b border-border">
                <div className="flex items-center gap-1.5 mb-1">
                  <Link
                    href="/sequence-studio"
                    className="inline-flex items-center gap-1 text-[12px] text-muted hover:text-text cursor-pointer"
                  >
                    <ChevronLeft className="w-3 h-3" />
                    Back to Sequence Studio
                  </Link>
                </div>
                <h2 className="text-[20px] font-semibold tracking-[-0.01em] text-text leading-tight">
                  {sequence.title}
                </h2>
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  <Badge tone="neutral">{sequence.slides.length} slides</Badge>
                  <Badge tone="neutral">
                    {contentStyleCards.find((c) => c.key === contentStyle)?.title}
                  </Badge>
                  <Badge tone="neutral">
                    {brandToneCards.find((t) => t.key === brandTone)?.title}
                  </Badge>
                  {stylePreset && (
                    <Badge tone="neutral">
                      {stylePresets.find((p) => p.key === stylePreset)?.label}
                    </Badge>
                  )}
                </div>

                <div className="flex items-end gap-3 flex-wrap mt-4">
                  <div className="flex-1 min-w-[280px]">
                    <label className="text-[11.5px] text-muted block mb-1.5">
                      Notes for next version (optional)
                    </label>
                    <input
                      value={aiNote}
                      onChange={(e) => setAiNote(e.target.value)}
                      placeholder="e.g. move text left, make writing punchier, more context about…"
                      className="w-full h-10 px-3 rounded-[10px] bg-surface-2 border border-border text-[13px] text-text focus:outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/20"
                    />
                  </div>
                  <Button variant="outline" onClick={applyAiNote} disabled={!aiNote.trim()}>
                    <RefreshCw className="w-3.5 h-3.5" /> Regenerate
                  </Button>
                </div>
              </div>

              <div className="px-5 py-4 bg-surface-2/40 flex items-center justify-between gap-3 flex-wrap border-b border-border">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[14px] font-semibold text-text">
                    Version {version}
                  </span>
                  <Badge tone="accent">Latest</Badge>
                  {versionTime && (
                    <span className="text-[12px] text-muted tabular-nums">
                      {versionTime}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button variant="outline" size="sm" onClick={() => commit("content")}>
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </Button>
                  <button
                    onClick={publishMock}
                    className="inline-flex items-center justify-center gap-2 h-8 px-3.5 text-[13px] font-medium rounded-[10px] cursor-pointer transition-[background-color,transform] active:scale-[0.97] bg-amber-500 hover:bg-amber-600 text-white"
                  >
                    <Send className="w-3.5 h-3.5" /> Publish to Instagram
                  </button>
                  <Button variant="outline" size="sm" onClick={downloadMock}>
                    <Download className="w-3.5 h-3.5" /> Download
                  </Button>
                </div>
              </div>

              <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sequence.slides.map((slide, idx) => (
                  <PreviewSlide
                    key={slide.id}
                    slide={slide}
                    index={idx}
                    asset={allAssets.find((a) => a.id === slide.assetId)}
                    accent={accent}
                    decorations={activeDecorations}
                    showOverlay={overlayIds.length > 0 && idx === Math.min(2, sequence.slides.length - 1)}
                    onReorder={reorder}
                    onRegenerate={regenerateSlide}
                    onToggleLock={toggleLock}
                    onEditOverlay={editOverlay}
                  />
                ))}
              </div>

              <div className="px-5 py-4 border-t border-border flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="text-[13px] font-semibold text-text">Looks good?</div>
                  <div className="text-[11.5px] text-muted">Save to Content, schedule, or keep refining.</div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={rebuild}>
                    <Pencil className="w-3.5 h-3.5" /> Keep editing
                  </Button>
                  <Button variant="outline" onClick={() => commit("schedule")}>
                    Schedule
                  </Button>
                  <Button onClick={() => commit("content")}>
                    <ThumbsUp className="w-3.5 h-3.5" /> I like it — save
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      <div className="text-[11.5px] text-muted text-center pb-6 pt-1">
        91 / 500 exports used this month
      </div>
    </>
  );
}

/* ─── Section shell ───────────────────────────────────────────────── */

function SectionCard({
  num,
  title,
  subtitle,
  children,
}: {
  num: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="mb-4">
      <div className="flex items-center gap-2.5 mb-4">
        <span
          className="inline-flex items-center justify-center text-[10.5px] font-semibold text-muted bg-surface-2 border border-border rounded-md w-8 h-6 tabular-nums"
          style={{ letterSpacing: "0.04em" }}
        >
          {num}
        </span>
        <div>
          <h3 className="text-[15.5px] font-semibold text-text tracking-[-0.005em]">
            {title}
          </h3>
          {subtitle && (
            <p className="text-[12px] text-muted leading-snug">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="space-y-5">{children}</div>
    </Card>
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

function SelectableCard({
  active,
  onClick,
  title,
  description,
  rightSlot,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  description: string;
  rightSlot?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "text-left rounded-[12px] border p-4 cursor-pointer transition-colors",
        active
          ? "border-accent/45 bg-accent-soft"
          : "border-border bg-surface hover:border-accent/25"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="text-[13.5px] font-semibold text-text">{title}</div>
        {rightSlot}
      </div>
      <div className="text-[11.5px] text-muted mt-0.5">{description}</div>
    </button>
  );
}

function SelectedThumb({
  asset,
  order,
  onRemove,
}: {
  asset: Asset;
  order: number;
  onRemove: () => void;
}) {
  const isVideo = asset.kind === "video";
  return (
    <div
      className="relative w-14 h-[68px] rounded-md border border-border overflow-hidden"
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
        // eslint-disable-next-line creatorhub/no-bare-video -- demo blob-URL preview, no Cloudflare Stream variants yet; replaced by VideoPlayer in Phase 1 part 2 when DB-backed assets land
        <video
          src={asset.src}
          muted
          playsInline
          preload="metadata"
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
      <span className="absolute top-0.5 left-0.5 bg-black/40 text-white text-[9px] px-1 py-0.5 rounded font-bold tabular-nums">
        {order}
      </span>
      <button
        onClick={(e) => {
          e.preventDefault();
          onRemove();
        }}
        className="absolute top-0.5 right-0.5 w-4 h-4 grid place-items-center rounded-full bg-black/55 text-white hover:bg-black/75 cursor-pointer"
        title="Remove"
      >
        <X className="w-2.5 h-2.5" />
      </button>
      {isVideo && (
        <span className="absolute bottom-0.5 left-0.5 inline-flex items-center gap-0.5 bg-black/45 text-white text-[8.5px] px-1 py-0.5 rounded tabular-nums">
          <Play className="w-2 h-2" fill="currentColor" />
          0:{String(Math.round(asset.duration ?? 0)).padStart(2, "0")}
        </span>
      )}
    </div>
  );
}

function ContentStyleTile({
  emoji,
  title,
  description,
  aspect,
  active,
  onClick,
}: {
  emoji: string;
  title: string;
  description: string;
  aspect: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "text-left rounded-[12px] border p-4 cursor-pointer transition-colors flex flex-col gap-2",
        active
          ? "border-accent/45 bg-accent-soft"
          : "border-border bg-surface hover:border-accent/25"
      )}
    >
      <div className="text-[18px]">{emoji}</div>
      <div>
        <div className="text-[13.5px] font-semibold text-text">{title}</div>
        <div className="text-[11.5px] text-muted leading-snug mt-0.5">{description}</div>
      </div>
      <div className="text-[10.5px] text-muted tabular-nums mt-auto">{aspect}</div>
    </button>
  );
}

function SlideStepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="inline-flex items-center gap-1">
      <button
        onClick={() => onChange(Math.max(1, value - 1))}
        className="w-8 h-8 grid place-items-center rounded-md border border-border bg-surface text-text hover:border-accent/30 cursor-pointer disabled:opacity-40"
        disabled={value <= 1}
      >
        <Minus className="w-3.5 h-3.5" />
      </button>
      <div className="w-10 h-8 grid place-items-center text-[15px] font-semibold text-text tabular-nums">
        {value}
      </div>
      <button
        onClick={() => onChange(Math.min(10, value + 1))}
        className="w-8 h-8 grid place-items-center rounded-md border border-border bg-surface text-text hover:border-accent/30 cursor-pointer disabled:opacity-40"
        disabled={value >= 10}
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function ToneTile({
  title,
  description,
  active,
  onClick,
}: {
  title: string;
  description: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "text-left rounded-[12px] border p-3.5 cursor-pointer transition-colors",
        active
          ? "border-accent/45 bg-accent-soft"
          : "border-border bg-surface hover:border-accent/25"
      )}
    >
      <div className="text-[13.5px] font-semibold text-text">{title}</div>
      <div className="text-[11.5px] text-muted mt-0.5">{description}</div>
    </button>
  );
}

function CheckboxCard({
  checked,
  onChange,
  title,
  description,
  secondary,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  title: string;
  description: string;
  secondary?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-[12px] border p-3.5 flex items-center justify-between gap-3 transition-colors",
        checked
          ? "border-accent/45 bg-accent-soft"
          : "border-border bg-surface"
      )}
    >
      <button
        onClick={() => onChange(!checked)}
        className="flex items-center gap-3 flex-1 min-w-0 text-left cursor-pointer"
      >
        <span
          className={cn(
            "w-4 h-4 rounded grid place-items-center shrink-0 transition-colors",
            checked
              ? "bg-accent text-white"
              : "bg-surface-2 border border-border text-transparent"
          )}
        >
          <Check className="w-2.5 h-2.5" />
        </span>
        <span className="min-w-0">
          <div className="text-[13px] font-semibold text-text truncate">{title}</div>
          <div className="text-[11.5px] text-muted truncate">{description}</div>
        </span>
      </button>
      {secondary && <div className="shrink-0">{secondary}</div>}
    </div>
  );
}

function PresetTile({
  active,
  label,
  caption,
  gradient,
  preview,
  onClick,
}: {
  active: boolean;
  label: string;
  caption: string;
  gradient: string;
  preview: "default" | "shelby" | "niksetting" | "faiz";
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "text-left rounded-[12px] border overflow-hidden cursor-pointer transition-colors",
        active ? "border-accent/45" : "border-border hover:border-accent/25"
      )}
    >
      <div
        className="aspect-[3/4] relative grid place-items-center p-3"
        style={{ background: gradient }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
        <PresetPreviewContent which={preview} />
      </div>
      <div className="p-3 bg-surface">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-text">{label}</span>
          {active && (
            <span className="ml-auto text-[10.5px] text-accent font-semibold">
              Selected
            </span>
          )}
        </div>
        <div className="text-[11px] text-muted mt-0.5">{caption}</div>
      </div>
    </button>
  );
}

function PresetPreviewContent({
  which,
}: {
  which: "default" | "shelby" | "niksetting" | "faiz";
}) {
  if (which === "shelby") {
    return (
      <div className="relative z-10 text-center">
        <div className="text-white text-[13px] font-semibold leading-tight italic">
          &ldquo;manifesting your dream life&rdquo;
        </div>
        <div className="text-white/70 text-[10px] mt-1">close crop · script feel</div>
      </div>
    );
  }
  if (which === "niksetting") {
    return (
      <div className="relative z-10 text-center">
        <div className="text-white text-[13px] font-bold leading-tight">
          Over <span className="bg-white/20 px-1 rounded">40 people</span> flew in
        </div>
        <div className="text-white/70 text-[10px] mt-1">bold heading · accent stat</div>
      </div>
    );
  }
  if (which === "faiz") {
    return (
      <div className="relative z-10 text-center">
        <div className="text-white text-[13px] font-bold leading-tight">
          DM me &ldquo;OVERSEAS&rdquo;
        </div>
        <div
          className="mt-1 inline-block border-2 rounded-full px-2 py-0.5 text-[9.5px] text-white"
          style={{ borderColor: "rgba(255,255,255,0.5)", transform: "rotate(-3deg)" }}
        >
          scribbled CTA
        </div>
      </div>
    );
  }
  return (
    <div className="relative z-10 text-center">
      <div className="text-white text-[13px] font-semibold">Default</div>
      <div className="text-white/60 text-[10px] mt-1">Clean defaults</div>
    </div>
  );
}

function DecorationToggle({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      onClick={onChange}
      className={cn(
        "text-left rounded-[12px] border px-4 py-3 cursor-pointer flex items-center justify-between gap-3 transition-colors",
        checked
          ? "border-accent/45 bg-accent-soft"
          : "border-border bg-surface hover:border-accent/25"
      )}
    >
      <div className="min-w-0">
        <div className="text-[13px] font-semibold text-text truncate">{title}</div>
        <div className="text-[11.5px] text-muted truncate">{description}</div>
      </div>
      <span
        className={cn(
          "relative w-9 h-5 rounded-full transition-colors shrink-0",
          checked ? "bg-accent" : "bg-surface-3"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform",
            checked && "translate-x-4"
          )}
        />
      </span>
    </button>
  );
}

function BuildingState({ stage }: { stage: number }) {
  return (
    <div className="py-6">
      <div className="flex flex-col items-center text-center mb-5">
        <div className="w-12 h-12 rounded-2xl bg-accent-soft text-accent grid place-items-center mb-3 border border-accent-border">
          <Sparkles className="w-5 h-5" />
        </div>
        <h4 className="text-[15px] font-semibold tracking-tight text-text">
          Building your sequence…
        </h4>
        <p className="text-[12.5px] text-muted mt-1 max-w-sm">
          Matching assets to the goal, brand, and writing style you picked.
        </p>
      </div>
      <ul className="space-y-2 max-w-md mx-auto">
        {buildStages.map((s, i) => {
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

/* ─── Preview slide (with accent-word highlights) ────────────────── */

function highlightAccentWords(
  text: string,
  accent: string,
  decorations: Decoration[]
): React.ReactNode {
  const wantsHighlight = decorations.includes("highlights");
  const wantsColor = decorations.includes("colorWords");
  const wantsUnderline = decorations.includes("underlines");
  if (!wantsHighlight && !wantsColor && !wantsUnderline) return text;

  /* Pick up to 2 accent words deterministically: capitalized noun + a number. */
  const tokens = text.split(/(\s+)/);
  const accentIndices = new Set<number>();
  let firstCap = false;
  for (let i = 0; i < tokens.length; i++) {
    const w = tokens[i].replace(/[.,!?;:]+$/, "");
    if (!w) continue;
    if (/\d/.test(w)) accentIndices.add(i);
    if (!firstCap && /^[A-Z][a-z]{2,}/.test(w)) {
      accentIndices.add(i);
      firstCap = true;
    }
    if (accentIndices.size >= 2) break;
  }
  return tokens.map((w, i) => {
    if (!accentIndices.has(i)) return <span key={i}>{w}</span>;
    if (wantsHighlight) {
      return (
        <span
          key={i}
          className="px-1 rounded"
          style={{ background: accent + "55", color: "white" }}
        >
          {w}
        </span>
      );
    }
    if (wantsColor) {
      return (
        <span key={i} style={{ color: accent }}>
          {w}
        </span>
      );
    }
    return (
      <span
        key={i}
        style={{ borderBottom: `2px solid ${accent}`, paddingBottom: 1 }}
      >
        {w}
      </span>
    );
  });
}

function PreviewSlide({
  slide,
  index,
  asset,
  accent,
  decorations: dec,
  showOverlay,
  onReorder,
  onRegenerate,
  onToggleLock,
  onEditOverlay,
}: {
  slide: GeneratedSequence["slides"][number];
  index: number;
  asset: Asset | undefined;
  accent: string;
  decorations: Decoration[];
  showOverlay: boolean;
  onReorder: (i: number, dir: -1 | 1) => void;
  onRegenerate: (i: number) => void;
  onToggleLock: (i: number) => void;
  onEditOverlay: (i: number, t: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(slide.overlay);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(slide.overlay);
  }, [slide.overlay]);

  const decorBlocks = dec.includes("bgBlocks");
  const decorClearSpace = dec.includes("clearSpace");

  return (
    <div
      className={cn(
        "rounded-[12px] border bg-surface card-base overflow-hidden",
        slide.locked ? "border-accent/40" : "border-border"
      )}
    >
      <div className="relative" style={{ background: asset?.gradient }}>
        <div className="aspect-[9/16] relative">
          {asset?.src && asset.kind !== "video" && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={asset.src}
              alt={asset.title}
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
          {asset?.src && asset.kind === "video" && (
            // eslint-disable-next-line creatorhub/no-bare-video -- demo blob-URL preview, no Cloudflare Stream variants yet; replaced by VideoPlayer in Phase 1 part 2 when DB-backed assets land
            <video
              src={asset.src}
              muted
              playsInline
              preload="metadata"
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent" />

          <div className="absolute top-2 left-2 text-[10.5px] text-white/85 bg-black/45 backdrop-blur-sm px-1.5 py-0.5 rounded font-bold tabular-nums">
            {index + 1}
          </div>

          {showOverlay && (
            <div
              className="absolute top-9 right-3 w-14 h-16 rounded-md border-2 border-white/80 shadow-lg overflow-hidden -rotate-3"
              style={{ background: "linear-gradient(135deg,#0F766E,#14B8A6)" }}
              title="Screenshot overlay"
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              <div className="absolute bottom-1 left-1 right-1 text-white text-[8px] font-bold">
                +$4,210
              </div>
            </div>
          )}

          <div
            className={cn(
              "absolute left-3 right-3",
              decorClearSpace ? "top-3" : "bottom-3"
            )}
          >
            <div
              className={cn(
                "text-white text-[12.5px] font-semibold leading-snug drop-shadow",
                decorBlocks && "px-2 py-1.5 rounded backdrop-blur-sm"
              )}
              style={
                decorBlocks
                  ? { background: "rgba(0,0,0,0.55)" }
                  : undefined
              }
            >
              {highlightAccentWords(slide.overlay, accent, dec)}
            </div>
          </div>
        </div>
      </div>

      <div className="p-3 space-y-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <PurposePill purpose={slide.purpose} accent={accent} />
          <span className="text-[11px] text-muted truncate flex-1 min-w-0">
            {asset?.title}
          </span>
          <div className="flex items-center gap-0.5">
            <IconBtn title="Move up" onClick={() => onReorder(index, -1)}>
              <ArrowUp className="w-3 h-3" />
            </IconBtn>
            <IconBtn title="Move down" onClick={() => onReorder(index, 1)}>
              <ArrowDown className="w-3 h-3" />
            </IconBtn>
            <IconBtn
              title={slide.locked ? "Unlock" : "Lock"}
              onClick={() => onToggleLock(index)}
              active={slide.locked}
            >
              {slide.locked ? <LockIcon className="w-3 h-3" /> : <UnlockIcon className="w-3 h-3" />}
            </IconBtn>
            <IconBtn
              title={slide.locked ? "Locked" : "Regenerate"}
              onClick={() => onRegenerate(index)}
              disabled={slide.locked}
            >
              <RefreshCw className="w-3 h-3" />
            </IconBtn>
          </div>
        </div>

        {editing ? (
          <div className="flex items-start gap-1.5">
            <textarea
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={2}
              className="flex-1 p-1.5 rounded-md bg-surface border border-accent/35 text-[12px] text-text focus:outline-none focus:ring-2 focus:ring-accent/20 resize-none"
            />
            <button
              onClick={() => {
                onEditOverlay(index, draft.trim() || slide.overlay);
                setEditing(false);
              }}
              className="text-[11px] text-accent font-medium px-1.5 py-0.5 hover:bg-accent-soft rounded cursor-pointer"
            >
              Save
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="text-left text-[12px] text-muted leading-snug group cursor-pointer"
          >
            {slide.overlay}
            <Pencil className="inline-block w-3 h-3 ml-1 text-muted/0 group-hover:text-muted -translate-y-0.5" />
          </button>
        )}
      </div>
    </div>
  );
}

function PurposePill({
  purpose,
  accent,
}: {
  purpose: GeneratedSequence["slides"][number]["purpose"];
  accent: string;
}) {
  const tones: Record<typeof purpose, string> = {
    Hook: "bg-cyan-soft/15 text-cyan-soft border-cyan-soft/30",
    Context: "bg-text/[0.05] text-text/80 border-text/15",
    Proof: "bg-emerald-500/10 text-emerald-700 border-emerald-500/25",
    Insight: "",
    CTA: "bg-amber-500/10 text-amber-700 border-amber-500/25",
  };
  if (purpose === "Insight") {
    return (
      <span
        className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-wide px-1.5 py-0.5 rounded-full border"
        style={{
          background: accent + "1A",
          color: accent,
          borderColor: accent + "40",
        }}
      >
        {purpose}
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[10px] font-semibold tracking-wide px-1.5 py-0.5 rounded-full border",
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
        "w-6 h-6 grid place-items-center rounded-md transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed",
        active
          ? "text-accent bg-accent-soft"
          : "text-muted hover:text-text hover:bg-surface-2"
      )}
    >
      {children}
    </button>
  );
}
