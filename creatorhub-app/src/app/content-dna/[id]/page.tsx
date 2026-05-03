"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Compass,
  Wand2,
  Brain,
  Activity,
  Heart,
  BookOpen,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";
import { useAppState } from "@/lib/store";
import { cn } from "@/lib/cn";
import type {
  StructureBeat,
  WhyItWorked,
  AnalysisVariations,
  ScriptShot,
} from "@/lib/content-dna/types";

type AnalysisRow = {
  id: string;
  source_url: string;
  source_platform: string;
  source_title: string | null;
  source_creator: string | null;
  source_thumbnail: string | null;
  transcription: string | null;
  hook: string | null;
  structure: StructureBeat[] | null;
  why_it_worked: WhyItWorked | null;
  variations: AnalysisVariations | null;
  status: string;
};

type DraftRow = {
  id: string;
  analysis_id: string;
  angle: string | null;
  audience: string | null;
  target_platform: string | null;
  tone: string | null;
  script: string | null;
  hooks: string[] | null;
  shots: ScriptShot[] | null;
  captions: string[] | null;
};

type Step = "import" | "rebuild" | "build";

export default function ContentDnaAnalysisPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { showToast } = useAppState();

  const [analysis, setAnalysis] = useState<AnalysisRow | null>(null);
  const [drafts, setDrafts] = useState<DraftRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>("import");

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/content-dna/${id}`, { credentials: "include" });
      if (!r.ok) {
        setLoading(false);
        return;
      }
      const json = (await r.json()) as { analysis: AnalysisRow; drafts: DraftRow[] };
      setAnalysis(json.analysis);
      setDrafts(json.drafts ?? []);
      setLoading(false);
    } catch {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --- one-shot bootstrap */
    void load();
  }, [load]);

  const latestDraft = useMemo(() => drafts[0] ?? null, [drafts]);

  if (loading) {
    return (
      <>
        <PageHeader title="Content DNA" description="Loading breakdown…" />
        <Card className="h-[280px] animate-pulse">&nbsp;</Card>
      </>
    );
  }
  if (!analysis) {
    return (
      <>
        <PageHeader
          title="Breakdown not found"
          description="This analysis doesn't exist or isn't yours."
        />
        <Button variant="outline" size="sm" onClick={() => router.push("/content-dna")}>
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Content DNA
        </Button>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={analysis.source_title ?? "Untitled breakdown"}
        description={
          analysis.source_creator
            ? `Breakdown of ${analysis.source_creator}`
            : "Competitor video breakdown"
        }
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => router.push("/content-dna")}>
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </Button>
            <a
              href={analysis.source_url}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1 text-[12.5px] font-medium text-muted hover:text-text px-2 py-1.5 cursor-pointer"
            >
              Open original <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </>
        }
      />

      <div className="mb-5">
        <Tabs
          value={step}
          onChange={(v) => setStep(v as Step)}
          options={[
            { value: "import", label: "01 · Import" },
            { value: "rebuild", label: "02 · Rebuild" },
            { value: "build", label: "03 · Build" },
          ]}
        />
      </div>

      {step === "import" && <ImportStep analysis={analysis} />}
      {step === "rebuild" && (
        <RebuildStep
          analysis={analysis}
          onContinue={() => setStep("build")}
        />
      )}
      {step === "build" && (
        <BuildStep
          latestDraft={latestDraft}
          onSubmit={async (input) => {
            const r = await fetch(`/api/content-dna/${id}/draft`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify(input),
            });
            if (!r.ok) {
              const err = (await r.json().catch(() => ({}))) as { error?: string };
              showToast(`Couldn't generate: ${err.error ?? r.status}`);
              return;
            }
            await load();
            showToast("Draft generated");
          }}
        />
      )}
    </>
  );
}

/* ─── Step 1: Import ─────────────────────────────────────────────── */

function ImportStep({ analysis }: { analysis: AnalysisRow }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card className="lg:col-span-2">
        <CardHeader
          title="The hook"
          description="The first 6–8 seconds the original used to earn the watch."
        />
        <div className="rounded-[12px] border border-accent/30 bg-accent-soft p-4">
          <div className="text-[15px] font-semibold text-text leading-snug">
            {analysis.hook ?? "—"}
          </div>
        </div>

        <div className="mt-6">
          <CardHeader title="Beat structure" description="Time-coded skeleton." />
          <div className="space-y-2">
            {(analysis.structure ?? []).map((b, i) => (
              <BeatRow key={i} index={i + 1} beat={b} />
            ))}
          </div>
        </div>

        {analysis.transcription && (
          <div className="mt-6">
            <CardHeader title="Transcription excerpt" description="What the camera caught." />
            <div className="text-[13.5px] text-text/85 leading-relaxed border-l-2 border-accent/30 pl-3 italic">
              {analysis.transcription}
            </div>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title="Why this worked" description="Pattern psychology — the upgrade layer." />
        <div className="space-y-3">
          <WhyRow
            icon={<Brain className="w-3.5 h-3.5" />}
            label="Hook psychology"
            body={analysis.why_it_worked?.hook_psychology}
          />
          <WhyRow
            icon={<Activity className="w-3.5 h-3.5" />}
            label="Retention triggers"
            body={analysis.why_it_worked?.retention_triggers}
          />
          <WhyRow
            icon={<Heart className="w-3.5 h-3.5" />}
            label="Emotional pattern"
            body={analysis.why_it_worked?.emotional_pattern}
          />
          <WhyRow
            icon={<BookOpen className="w-3.5 h-3.5" />}
            label="Story structure"
            body={analysis.why_it_worked?.story_structure}
          />
        </div>
      </Card>
    </div>
  );
}

function BeatRow({ index, beat }: { index: number; beat: StructureBeat }) {
  return (
    <div className="rounded-[10px] border border-border bg-surface-2 px-3.5 py-2.5 flex items-start gap-3">
      <span
        className="inline-flex items-center justify-center w-[22px] h-[22px] rounded-full text-[11px] font-semibold tabular-nums text-text shrink-0 mt-0.5"
        style={{ background: "var(--surface-3)" }}
      >
        {index}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-text">{beat.name}</span>
          <span className="text-[11px] tabular-nums text-muted">{beat.timestamp}</span>
        </div>
        <div className="text-[12.5px] text-muted mt-0.5 leading-snug">{beat.description}</div>
      </div>
    </div>
  );
}

function WhyRow({
  icon,
  label,
  body,
}: {
  icon: React.ReactNode;
  label: string;
  body: string | undefined;
}) {
  return (
    <div className="rounded-[10px] border border-border p-3">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-accent">{icon}</span>
        <span
          className="text-[10.5px] uppercase font-semibold text-muted"
          style={{ letterSpacing: "0.06em" }}
        >
          {label}
        </span>
      </div>
      <div className="text-[12.5px] text-text/85 leading-snug">{body ?? "—"}</div>
    </div>
  );
}

/* ─── Step 2: Rebuild ────────────────────────────────────────────── */

function RebuildStep({
  analysis,
  onContinue,
}: {
  analysis: AnalysisRow;
  onContinue: () => void;
}) {
  const v = analysis.variations;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card>
        <CardHeader
          title="Hook variations"
          description="Same psychology, your phrasing."
          action={<Badge tone="accent">{v?.hooks.length ?? 0}</Badge>}
        />
        <div className="space-y-2">
          {(v?.hooks ?? []).map((h, i) => (
            <CopyableRow key={i} text={h} />
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Angle variations"
          description="Different stories, same structure."
          action={<Badge tone="accent">{v?.angles.length ?? 0}</Badge>}
        />
        <div className="space-y-2">
          {(v?.angles ?? []).map((a, i) => (
            <CopyableRow key={i} text={a} />
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Title variations"
          description="Browseable headline options."
          action={<Badge tone="accent">{v?.titles.length ?? 0}</Badge>}
        />
        <div className="space-y-2">
          {(v?.titles ?? []).map((t, i) => (
            <CopyableRow key={i} text={t} />
          ))}
        </div>
      </Card>

      <div className="lg:col-span-3 mt-2 flex items-center justify-between gap-3 px-1">
        <p className="text-[12.5px] text-muted">
          Structural clone, content original — pick the angle that&rsquo;s
          actually yours, then build it on the next step.
        </p>
        <Button onClick={onContinue}>
          <Wand2 className="w-3.5 h-3.5" /> Build my version
        </Button>
      </div>
    </div>
  );
}

function CopyableRow({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        void navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
      className="lift w-full text-left rounded-[10px] border border-border bg-surface-2 px-3 py-2.5 cursor-pointer card-base flex items-start justify-between gap-2"
    >
      <span className="text-[13px] text-text leading-snug min-w-0">{text}</span>
      <span
        className={cn(
          "shrink-0 text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded tracking-wide",
          copied
            ? "bg-accent text-white"
            : "bg-surface-3 text-muted",
        )}
        style={{ letterSpacing: "0.06em" }}
      >
        {copied ? (
          <span className="inline-flex items-center gap-1">
            <Check className="w-2.5 h-2.5" /> Copied
          </span>
        ) : (
          <span className="inline-flex items-center gap-1">
            <Copy className="w-2.5 h-2.5" /> Copy
          </span>
        )}
      </span>
    </button>
  );
}

/* ─── Step 3: Build ──────────────────────────────────────────────── */

const TONE_OPTIONS = [
  "Educational",
  "Storytelling",
  "Direct",
  "Premium",
  "Founder",
  "Bold",
];
const PLATFORM_OPTIONS = ["Reel", "TikTok", "YouTube short", "Long-form video", "Carousel"];

function BuildStep({
  latestDraft,
  onSubmit,
}: {
  latestDraft: DraftRow | null;
  onSubmit: (input: { angle: string; audience: string; targetPlatform: string; tone: string }) => Promise<void>;
}) {
  const [angle, setAngle] = useState(latestDraft?.angle ?? "");
  const [audience, setAudience] = useState(latestDraft?.audience ?? "");
  const [targetPlatform, setTargetPlatform] = useState(latestDraft?.target_platform ?? "Reel");
  const [tone, setTone] = useState(latestDraft?.tone ?? "Direct");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    await onSubmit({ angle, audience, targetPlatform, tone });
    setSubmitting(false);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card className="lg:col-span-1">
        <CardHeader
          title="Your inputs"
          description="The structural clone keeps the bones. Your inputs replace the soul."
        />
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <Field
            label="What's your angle?"
            value={angle}
            placeholder="e.g. The exact 4-part DM template that triples reply rate"
            onChange={setAngle}
            multi
          />
          <Field
            label="Who's your audience?"
            value={audience}
            placeholder="e.g. solo coaches doing $5–20K/mo"
            onChange={setAudience}
          />
          <SelectField
            label="Target platform"
            value={targetPlatform}
            options={PLATFORM_OPTIONS}
            onChange={setTargetPlatform}
          />
          <SelectField
            label="Tone"
            value={tone}
            options={TONE_OPTIONS}
            onChange={setTone}
          />
          <Button type="submit" disabled={submitting} className="w-full">
            <Wand2 className="w-3.5 h-3.5" />
            {submitting ? "Generating…" : latestDraft ? "Regenerate" : "Generate script"}
          </Button>
        </form>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader
          title="Output"
          description="Script, hook variations, shot list, captions."
        />
        {!latestDraft ? (
          <div className="flex flex-col items-center justify-center text-center py-12 px-6">
            <div
              className="w-12 h-12 rounded-2xl grid place-items-center text-white mb-4"
              style={{
                background: "linear-gradient(135deg, #14315E, #0B1F3A)",
              }}
            >
              <Compass className="w-6 h-6" />
            </div>
            <div className="text-[14px] font-semibold text-text">
              Fill the form, then generate.
            </div>
            <div className="text-[12.5px] text-muted mt-1 max-w-[420px]">
              We use the analysis on the left as the structural backbone. Your
              angle + audience + tone become the actual content.
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <div
                className="text-[10.5px] uppercase font-semibold text-muted mb-1.5"
                style={{ letterSpacing: "0.08em" }}
              >
                Script
              </div>
              <pre className="rounded-[10px] border border-border bg-surface-2 p-3.5 text-[12.5px] text-text/90 leading-relaxed whitespace-pre-wrap font-mono">
                {latestDraft.script ?? "—"}
              </pre>
            </div>

            <div>
              <div
                className="text-[10.5px] uppercase font-semibold text-muted mb-1.5"
                style={{ letterSpacing: "0.08em" }}
              >
                Hook variations
              </div>
              <div className="space-y-2">
                {(latestDraft.hooks ?? []).map((h, i) => (
                  <CopyableRow key={i} text={h} />
                ))}
              </div>
            </div>

            <div>
              <div
                className="text-[10.5px] uppercase font-semibold text-muted mb-1.5"
                style={{ letterSpacing: "0.08em" }}
              >
                Shot list
              </div>
              <div className="space-y-2">
                {(latestDraft.shots ?? []).map((s, i) => (
                  <div
                    key={i}
                    className="rounded-[10px] border border-border bg-surface-2 px-3 py-2.5 flex items-start gap-3"
                  >
                    <span className="text-[11px] font-semibold tabular-nums text-muted w-[28px] shrink-0 mt-0.5">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] text-text leading-snug">
                        {s.description}
                      </div>
                      <div className="text-[11px] text-muted mt-0.5 tabular-nums">
                        ~{s.duration_seconds}s
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div
                className="text-[10.5px] uppercase font-semibold text-muted mb-1.5"
                style={{ letterSpacing: "0.08em" }}
              >
                Caption ideas
              </div>
              <div className="space-y-2">
                {(latestDraft.captions ?? []).map((c, i) => (
                  <CopyableRow key={i} text={c} />
                ))}
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function Field({
  label,
  value,
  placeholder,
  onChange,
  multi,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
  multi?: boolean;
}) {
  return (
    <div>
      <label className="text-[11.5px] font-semibold text-text block mb-1.5">{label}</label>
      {multi ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="w-full px-3 py-2 rounded-[10px] bg-surface border border-border text-[13px] text-text leading-snug focus:outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/20 resize-none"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full h-10 px-3 rounded-[10px] bg-surface border border-border text-[13.5px] text-text focus:outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/20"
        />
      )}
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-[11.5px] font-semibold text-text block mb-1.5">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-10 px-3 rounded-[10px] bg-surface border border-border text-[13.5px] text-text focus:outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/20"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}
