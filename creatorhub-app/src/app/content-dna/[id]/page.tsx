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
  Trash2,
  Edit3,
  Save,
  X,
  Download,
  AlertTriangle,
  Pencil,
  FileText,
  RotateCcw,
  Hash,
  MicVocal,
  Megaphone,
  Gauge,
  Lightbulb,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";
import { useAppState } from "@/lib/store";
import { useClientQuery } from "@/lib/clients/use-client-query";
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
  /* v21 enrichment fields populated by the AI pipeline. All nullable —
     legacy rows analyzed before v21 won't have these. */
  hook_analysis: {
    text: string;
    why_it_works: string;
    attention_arc: string[];
  } | null;
  themes: string[] | null;
  tone: string | null;
  cta: string | null;
  content_score: number | null;
  steal_notes: string | null;
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
  created_at: string;
};

type Step = "import" | "rebuild" | "build";

export default function ContentDnaAnalysisPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { showToast } = useAppState();
  const clientQ = useClientQuery();

  const [analysis, setAnalysis] = useState<AnalysisRow | null>(null);
  const [drafts, setDrafts] = useState<DraftRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>("import");
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/content-dna/${id}${clientQ.q}`, { credentials: "include" });
      if (!r.ok) {
        setLoading(false);
        return;
      }
      const json = (await r.json()) as { analysis: AnalysisRow; drafts: DraftRow[] };
      setAnalysis(json.analysis);
      setDrafts(json.drafts ?? []);
      setActiveDraftId((prev) => prev ?? json.drafts?.[0]?.id ?? null);
      setLoading(false);
    } catch {
      setLoading(false);
    }
  }, [id, clientQ.q]);

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --- one-shot bootstrap */
    void load();
  }, [load]);

  /* While the row is in 'analyzing' state, the cron worker is mid-pipeline.
     Refetch every 4s so the page flips to 'ready' (or 'failed') as soon as
     the worker writes results. Stops polling the moment status changes. */
  useEffect(() => {
    if (analysis?.status !== "analyzing") return;
    const id = setInterval(() => {
      void load();
    }, 4000);
    return () => clearInterval(id);
  }, [analysis?.status, load]);

  const activeDraft = useMemo(
    () => drafts.find((d) => d.id === activeDraftId) ?? drafts[0] ?? null,
    [drafts, activeDraftId],
  );

  const [generatingScript, setGeneratingScript] = useState(false);
  const [savingHook, setSavingHook] = useState(false);
  /* Once a hook is saved, swap the button copy to "In Idea Bank" so the
     user knows it landed. Cleared if they navigate away and come back. */
  const [hookSaved, setHookSaved] = useState(false);

  /* "Add hook to Idea Bank" — captures the analyzed hook as a saved idea
     so the user can revisit it from /ideas later. 24h dedupe on the
     server keeps double-clicks from creating duplicates. */
  async function handleSaveHookToIdeas() {
    if (savingHook || !analysis?.hook) return;
    setSavingHook(true);
    try {
      const r = await fetch(`/api/ideas${clientQ.q}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          hook: analysis.hook,
          sourceAnalysisId: analysis.id,
          sourceUrl: analysis.source_url,
          score: analysis.content_score,
          saved: true,
        }),
      });
      if (!r.ok) {
        const err = (await r.json().catch(() => ({}))) as { error?: string };
        showToast(`Couldn't save: ${err.error ?? r.status}`);
        return;
      }
      const json = (await r.json()) as { deduped?: boolean };
      setHookSaved(true);
      showToast(json.deduped ? "Already in Idea Bank." : "Added to Idea Bank.");
    } catch {
      showToast("Network error. Try again.");
    } finally {
      setSavingHook(false);
    }
  }

  /* "Generate Script From This" — POST to /api/scripts/generate with
     sourceAnalysisId so the script generator inherits the hook + themes
     of this transcript. On success, navigate to /scripts/[id]. */
  async function handleGenerateScript() {
    if (generatingScript || !analysis) return;
    setGeneratingScript(true);
    try {
      const r = await fetch(`/api/scripts/generate${clientQ.q}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          platform: "instagram",
          format: "reel",
          sourceAnalysisId: analysis.id,
        }),
      });
      if (!r.ok) {
        const err = (await r.json().catch(() => ({}))) as { error?: string };
        showToast(`Couldn't generate: ${err.error ?? r.status}`);
        setGeneratingScript(false);
        return;
      }
      const json = (await r.json()) as { script: { id: string } };
      router.push(`/scripts/${json.script.id}`);
    } catch {
      showToast("Network error. Try again.");
      setGeneratingScript(false);
    }
  }

  async function handleDeleteAnalysis() {
    setDeleting(true);
    try {
      const r = await fetch(`/api/content-dna/${id}${clientQ.q}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!r.ok) {
        showToast("Couldn't delete. Try again.");
        setDeleting(false);
        return;
      }
      showToast("Breakdown deleted");
      router.replace("/content-dna");
    } catch {
      showToast("Network error. Try again.");
      setDeleting(false);
    }
  }

  async function handleSaveTitle() {
    const t = titleDraft.trim();
    if (!analysis || t === (analysis.source_title ?? "")) {
      setEditingTitle(false);
      return;
    }
    try {
      const r = await fetch(`/api/content-dna/${id}${clientQ.q}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ sourceTitle: t }),
      });
      if (!r.ok) {
        showToast("Couldn't rename. Try again.");
        return;
      }
      setAnalysis({ ...analysis, source_title: t || null });
      showToast("Title updated");
      setEditingTitle(false);
    } catch {
      showToast("Network error. Try again.");
    }
  }

  async function handleDeleteDraft(draftId: string) {
    try {
      const r = await fetch(`/api/content-dna/${id}/draft/${draftId}${clientQ.q}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!r.ok) {
        showToast("Couldn't delete draft.");
        return;
      }
      const remaining = drafts.filter((d) => d.id !== draftId);
      setDrafts(remaining);
      if (activeDraftId === draftId) {
        setActiveDraftId(remaining[0]?.id ?? null);
      }
      showToast("Draft deleted");
    } catch {
      showToast("Network error. Try again.");
    }
  }

  async function handleSaveDraftScript(draftId: string, script: string) {
    try {
      const r = await fetch(`/api/content-dna/${id}/draft/${draftId}${clientQ.q}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ script }),
      });
      if (!r.ok) {
        showToast("Couldn't save edit.");
        return false;
      }
      setDrafts((prev) => prev.map((d) => (d.id === draftId ? { ...d, script } : d)));
      showToast("Script saved");
      return true;
    } catch {
      showToast("Network error. Try again.");
      return false;
    }
  }

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

  /* Failed status — show retry UI before the steps. */
  if (analysis.status === "failed") {
    return (
      <>
        <PageHeader
          title={analysis.source_title ?? "Breakdown failed"}
          description="Something went wrong analyzing this video."
          actions={
            <Button variant="outline" size="sm" onClick={() => router.push("/content-dna")}>
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </Button>
          }
        />
        <Card>
          <div className="flex items-start gap-3 p-3 rounded-[10px] border border-red-500/30 bg-red-500/5">
            <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <div className="text-[13px] font-semibold text-text">Analysis failed</div>
              <div className="text-[12.5px] text-muted mt-0.5 leading-snug">
                The video may have been removed, the URL may be a private
                share, or the transcription pipeline timed out. Try the URL
                again from the landing page.
              </div>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <Button onClick={() => router.push("/content-dna")}>
              <RotateCcw className="w-3.5 h-3.5" /> Try a different URL
            </Button>
            <Button
              variant="outline"
              onClick={() => setConfirmingDelete(true)}
              className="border-red-500/40 text-red-600 dark:text-red-400 hover:bg-red-500/5"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete this row
            </Button>
          </div>
        </Card>
        {confirmingDelete && (
          <DeleteConfirm
            target="this breakdown"
            onConfirm={handleDeleteAnalysis}
            onCancel={() => setConfirmingDelete(false)}
            busy={deleting}
          />
        )}
      </>
    );
  }

  /* Analyzing status — should be near-instantaneous in scaffold mode, but
     when the real LLM pipeline lands this view will show progress. */
  if (analysis.status === "analyzing") {
    return (
      <>
        <PageHeader
          title="Analyzing…"
          description="Transcribing and extracting structure."
        />
        <Card>
          <div className="flex items-center gap-3 py-6 px-3 justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
            <div className="text-[13px] text-muted">
              This usually takes 10–20 seconds.
            </div>
          </div>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title=""
        description=""
        /* The real header is below — PageHeader is empty here so the
           inline-edit + actions row controls layout. */
      />

      {/* Editable title row — replaces PageHeader content. */}
      <div className="flex flex-col gap-3 mb-5 -mt-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            {editingTitle ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleSaveTitle();
                    if (e.key === "Escape") setEditingTitle(false);
                  }}
                  maxLength={200}
                  className="flex-1 h-9 px-3 rounded-[10px] bg-surface border border-accent/40 text-[18px] font-semibold text-text focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
                <Button size="sm" onClick={handleSaveTitle}>
                  <Save className="w-3.5 h-3.5" /> Save
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setEditingTitle(false)}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group">
                <h1 className="text-[20px] sm:text-[22px] font-semibold tracking-[-0.015em] text-text leading-tight truncate">
                  {analysis.source_title ?? "Untitled breakdown"}
                </h1>
                <button
                  onClick={() => {
                    setTitleDraft(analysis.source_title ?? "");
                    setEditingTitle(true);
                  }}
                  className="p-1 rounded text-muted hover:text-text hover:bg-surface-2 cursor-pointer opacity-60 group-hover:opacity-100"
                  aria-label="Rename"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <div className="text-[12.5px] text-muted mt-1 truncate">
              {analysis.source_creator ?? "Competitor video breakdown"}
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => router.push("/content-dna")}>
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </Button>
            <a
              href={analysis.source_url}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1 text-[12.5px] font-medium text-muted hover:text-text px-2 py-1.5 cursor-pointer rounded hover:bg-surface-2"
            >
              Open original <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                window.open(
                  `/api/content-dna/${id}/export-pdf${clientQ.q}`,
                  "_blank",
                );
              }}
              disabled={analysis.status !== "ready"}
              title={
                analysis.status !== "ready"
                  ? "Wait for the analysis to finish"
                  : "Download this breakdown as a branded PDF"
              }
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export PDF</span>
            </Button>
            <Button
              size="sm"
              onClick={handleGenerateScript}
              disabled={generatingScript || analysis.status !== "ready"}
              title={
                analysis.status !== "ready"
                  ? "Wait for the analysis to finish"
                  : "Generate a new script that inherits this video's hook + themes"
              }
            >
              <Wand2 className="w-3.5 h-3.5" />
              {generatingScript ? "Generating…" : "Generate Script"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmingDelete(true)}
              className="border-red-500/40 text-red-600 dark:text-red-400 hover:bg-red-500/5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Delete</span>
            </Button>
          </div>
        </div>
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

      {step === "import" && (
        <ImportStep
          analysis={analysis}
          onSaveHook={handleSaveHookToIdeas}
          hookSaved={hookSaved}
          savingHook={savingHook}
        />
      )}
      {step === "rebuild" && (
        <RebuildStep
          analysis={analysis}
          onContinue={() => setStep("build")}
        />
      )}
      {step === "build" && (
        <BuildStep
          drafts={drafts}
          activeDraft={activeDraft}
          activeDraftId={activeDraftId}
          onSelectDraft={setActiveDraftId}
          onDeleteDraft={handleDeleteDraft}
          onSaveDraftScript={handleSaveDraftScript}
          onGenerate={async (input) => {
            const r = await fetch(`/api/content-dna/${id}/draft${clientQ.q}`, {
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

      {confirmingDelete && (
        <DeleteConfirm
          target="this breakdown"
          subtext="All drafts attached to this breakdown will also be deleted."
          onConfirm={handleDeleteAnalysis}
          onCancel={() => setConfirmingDelete(false)}
          busy={deleting}
        />
      )}
    </>
  );
}

/* ─── Step 1: Import ─────────────────────────────────────────────── */

function ImportStep({
  analysis,
  onSaveHook,
  hookSaved,
  savingHook,
}: {
  analysis: AnalysisRow;
  onSaveHook: () => void;
  hookSaved: boolean;
  savingHook: boolean;
}) {
  return (
    <>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card className="lg:col-span-2">
        <CardHeader
          title="The hook"
          description="The first 6–8 seconds the original used to earn the watch."
          action={
            analysis.hook ? (
              <Button
                variant="outline"
                size="sm"
                onClick={onSaveHook}
                disabled={savingHook || hookSaved}
                title={
                  hookSaved
                    ? "Already in your Idea Bank"
                    : "Save this hook to /ideas for later"
                }
              >
                <Lightbulb className="w-3.5 h-3.5" />
                {hookSaved
                  ? "In Idea Bank"
                  : savingHook
                    ? "Saving…"
                    : "Add to Idea Bank"}
              </Button>
            ) : null
          }
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

    <EnrichmentPanel analysis={analysis} />
    </>
  );
}

/* ─── v21 enrichment panel ───────────────────────────────────────── */

function EnrichmentPanel({ analysis }: { analysis: AnalysisRow }) {
  const hasEnrichment =
    analysis.hook_analysis ||
    (analysis.themes && analysis.themes.length > 0) ||
    analysis.tone ||
    analysis.cta ||
    analysis.content_score !== null ||
    analysis.steal_notes;

  /* Skip the panel entirely for legacy rows analyzed before v21 — they
     just don't have enrichment data and a panel of nulls would look broken. */
  if (!hasEnrichment) return null;

  return (
    <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card className="lg:col-span-2">
        <CardHeader
          title="Hook breakdown"
          description="What the first 3 seconds did + why it landed."
        />
        {analysis.hook_analysis ? (
          <div className="space-y-3">
            <div className="rounded-[10px] border border-accent/30 bg-accent-soft p-3">
              <div className="text-[10.5px] uppercase font-semibold text-accent mb-1" style={{ letterSpacing: "0.06em" }}>
                Verbatim hook
              </div>
              <div className="text-[13.5px] font-medium text-text leading-snug">
                {analysis.hook_analysis.text}
              </div>
            </div>
            <div className="rounded-[10px] border border-border p-3">
              <div className="text-[10.5px] uppercase font-semibold text-muted mb-1" style={{ letterSpacing: "0.06em" }}>
                Why it works
              </div>
              <div className="text-[12.5px] text-text/85 leading-snug">
                {analysis.hook_analysis.why_it_works}
              </div>
            </div>
            {analysis.hook_analysis.attention_arc?.length > 0 && (
              <div className="rounded-[10px] border border-border p-3">
                <div className="text-[10.5px] uppercase font-semibold text-muted mb-1.5" style={{ letterSpacing: "0.06em" }}>
                  Attention arc (first 10s)
                </div>
                <ul className="space-y-1">
                  {analysis.hook_analysis.attention_arc.map((a, i) => (
                    <li key={i} className="text-[12.5px] text-text/85 leading-snug flex gap-2">
                      <span className="text-muted shrink-0">{i + 1}.</span>
                      <span>{a}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="text-[12.5px] text-muted italic">No hook breakdown available.</div>
        )}

        {analysis.steal_notes && (
          <div className="mt-4">
            <CardHeader
              title={
                <span className="inline-flex items-center gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5 text-accent" /> What to steal
                </span>
              }
              description="Specific things to borrow — angles, hook style, visual technique."
            />
            <div className="rounded-[10px] border border-accent/20 bg-accent-soft/50 p-3 text-[13px] text-text/90 leading-relaxed whitespace-pre-wrap">
              {analysis.steal_notes}
            </div>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title="At a glance" />
        <div className="space-y-3">
          {analysis.content_score !== null && (
            <ScoreRow score={analysis.content_score} />
          )}
          {analysis.tone && (
            <FactRow
              icon={<MicVocal className="w-3.5 h-3.5" />}
              label="Tone"
              value={analysis.tone}
            />
          )}
          {analysis.cta && (
            <FactRow
              icon={<Megaphone className="w-3.5 h-3.5" />}
              label="Call to action"
              value={analysis.cta}
            />
          )}
          {analysis.themes && analysis.themes.length > 0 && (
            <div className="rounded-[10px] border border-border p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-accent">
                  <Hash className="w-3.5 h-3.5" />
                </span>
                <span
                  className="text-[10.5px] uppercase font-semibold text-muted"
                  style={{ letterSpacing: "0.06em" }}
                >
                  Themes
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {analysis.themes.map((t, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded-full bg-surface-2 border border-border text-[11.5px] text-text/85"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

function ScoreRow({ score }: { score: number }) {
  /* Score color follows the same palette as the rest of the app:
     accent for "good" (≥7), muted for middling, warning red below 4. */
  const tone =
    score >= 7 ? "text-accent" : score >= 4 ? "text-text" : "text-red-600 dark:text-red-400";
  return (
    <div className="rounded-[10px] border border-border p-3">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-accent">
          <Gauge className="w-3.5 h-3.5" />
        </span>
        <span
          className="text-[10.5px] uppercase font-semibold text-muted"
          style={{ letterSpacing: "0.06em" }}
        >
          Content score
        </span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={cn("text-[28px] font-semibold tabular-nums tracking-tight", tone)}>
          {score.toFixed(1)}
        </span>
        <span className="text-[13px] text-muted">/ 10</span>
      </div>
    </div>
  );
}

function FactRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
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
      <div className="text-[12.5px] text-text/90 leading-snug capitalize first-letter:uppercase">
        {value}
      </div>
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
        <div className="flex items-center gap-2 flex-wrap">
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

      <div className="lg:col-span-3 mt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
        <p className="text-[12.5px] text-muted">
          Structural clone, content original — pick the angle that&rsquo;s
          actually yours, then build it on the next step.
        </p>
        <Button onClick={onContinue} className="self-start sm:self-auto">
          <Wand2 className="w-3.5 h-3.5" /> Build my version
        </Button>
      </div>
    </div>
  );
}

function CopyableRow({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* Safari + permissions fallback — show a textarea select prompt. */
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      } catch {
        /* Final fallback — no-op silently. */
      }
      document.body.removeChild(ta);
    }
  }
  return (
    <button
      onClick={copy}
      className="lift w-full text-left rounded-[10px] border border-border bg-surface-2 px-3 py-2.5 cursor-pointer card-base flex items-start justify-between gap-2"
    >
      <span className="text-[13px] text-text leading-snug min-w-0">{text}</span>
      <span
        className={cn(
          "shrink-0 text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded tracking-wide",
          copied ? "bg-accent text-white" : "bg-surface-3 text-muted",
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

type BuildInput = { angle: string; audience: string; targetPlatform: string; tone: string };

function BuildStep({
  drafts,
  activeDraft,
  activeDraftId,
  onSelectDraft,
  onDeleteDraft,
  onSaveDraftScript,
  onGenerate,
}: {
  drafts: DraftRow[];
  activeDraft: DraftRow | null;
  activeDraftId: string | null;
  onSelectDraft: (id: string) => void;
  onDeleteDraft: (id: string) => Promise<void>;
  onSaveDraftScript: (id: string, script: string) => Promise<boolean>;
  onGenerate: (input: BuildInput) => Promise<void>;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-1 space-y-4">
        <BuildForm activeDraft={activeDraft} onGenerate={onGenerate} drafts={drafts} />
        {drafts.length > 0 && (
          <DraftHistory
            drafts={drafts}
            activeDraftId={activeDraftId}
            onSelect={onSelectDraft}
            onDelete={onDeleteDraft}
          />
        )}
      </div>

      <Card className="lg:col-span-2">
        <DraftOutput
          draft={activeDraft}
          onSaveScript={onSaveDraftScript}
        />
      </Card>
    </div>
  );
}

function BuildForm({
  activeDraft,
  drafts,
  onGenerate,
}: {
  activeDraft: DraftRow | null;
  drafts: DraftRow[];
  onGenerate: (input: BuildInput) => Promise<void>;
}) {
  const [angle, setAngle] = useState(activeDraft?.angle ?? "");
  const [audience, setAudience] = useState(activeDraft?.audience ?? "");
  const [targetPlatform, setTargetPlatform] = useState(activeDraft?.target_platform ?? "Reel");
  const [tone, setTone] = useState(activeDraft?.tone ?? "Direct");
  const [submitting, setSubmitting] = useState(false);

  /* Sync form when user clicks a different draft in the history. */
  /* eslint-disable react-hooks/set-state-in-effect --- one-shot sync from active draft */
  useEffect(() => {
    if (!activeDraft) return;
    setAngle(activeDraft.angle ?? "");
    setAudience(activeDraft.audience ?? "");
    setTargetPlatform(activeDraft.target_platform ?? "Reel");
    setTone(activeDraft.tone ?? "Direct");
  }, [activeDraft]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    await onGenerate({ angle, audience, targetPlatform, tone });
    setSubmitting(false);
  }

  const buttonLabel = drafts.length === 0 ? "Generate script" : "Generate variation";

  return (
    <Card>
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
          {submitting ? "Generating…" : buttonLabel}
        </Button>
      </form>
    </Card>
  );
}

function DraftHistory({
  drafts,
  activeDraftId,
  onSelect,
  onDelete,
}: {
  drafts: DraftRow[];
  activeDraftId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => Promise<void>;
}) {
  return (
    <Card>
      <CardHeader
        title="Drafts"
        description={`${drafts.length} saved`}
      />
      <div className="space-y-1.5">
        {drafts.map((d) => {
          const active = d.id === activeDraftId;
          const dt = new Date(d.created_at);
          const dateStr = dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
          const timeStr = dt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
          const summary = d.angle?.trim() || d.audience?.trim() || `${d.tone ?? "Draft"} · ${d.target_platform ?? "—"}`;
          return (
            <div
              key={d.id}
              className={cn(
                "group rounded-[10px] border px-3 py-2 cursor-pointer transition-colors flex items-start gap-2",
                active
                  ? "border-accent/45 bg-accent-soft"
                  : "border-border bg-surface-2 hover:border-accent/25",
              )}
              onClick={() => onSelect(d.id)}
            >
              <div className="flex-1 min-w-0">
                <div className="text-[12.5px] font-medium text-text leading-snug truncate">
                  {summary}
                </div>
                <div className="text-[10.5px] text-muted mt-0.5 tabular-nums">
                  {dateStr} · {timeStr}
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  void onDelete(d.id);
                }}
                className={cn(
                  "p-1 rounded text-muted hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 cursor-pointer transition-colors shrink-0",
                  active ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus:opacity-100",
                )}
                aria-label="Delete draft"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function DraftOutput({
  draft,
  onSaveScript,
}: {
  draft: DraftRow | null;
  onSaveScript: (id: string, script: string) => Promise<boolean>;
}) {
  const [editingScript, setEditingScript] = useState(false);
  const [scriptDraft, setScriptDraft] = useState("");
  const [savingScript, setSavingScript] = useState(false);
  const [scriptCopied, setScriptCopied] = useState(false);

  /* Reset edit-mode when the active draft changes. */
  /* eslint-disable react-hooks/set-state-in-effect --- one-shot reset on draft switch */
  useEffect(() => {
    setEditingScript(false);
    setScriptDraft(draft?.script ?? "");
  }, [draft?.id, draft?.script]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!draft) {
    return (
      <>
        <CardHeader
          title="Output"
          description="Script, hook variations, shot list, captions."
        />
        <div className="flex flex-col items-center justify-center text-center py-12 px-6">
          <div
            className="w-12 h-12 rounded-2xl grid place-items-center text-white mb-4"
            style={{ background: "linear-gradient(135deg, #14315E, #0B1F3A)" }}
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
      </>
    );
  }

  async function copyScript() {
    if (!draft?.script) return;
    try {
      await navigator.clipboard.writeText(draft.script);
      setScriptCopied(true);
      setTimeout(() => setScriptCopied(false), 1200);
    } catch {
      /* fallback handled at the row level */
    }
  }

  function downloadScript() {
    if (!draft?.script) return;
    const filename = `script-${draft.id.slice(0, 8)}.md`;
    const md = scriptToMarkdown(draft);
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function saveEdit() {
    if (!draft) return;
    setSavingScript(true);
    const ok = await onSaveScript(draft.id, scriptDraft);
    setSavingScript(false);
    if (ok) setEditingScript(false);
  }

  return (
    <>
      <CardHeader
        title="Output"
        description="Script, hook variations, shot list, captions."
        action={
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={copyScript}>
              {scriptCopied ? (
                <>
                  <Check className="w-3.5 h-3.5" /> Copied
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" /> Copy
                </>
              )}
            </Button>
            <Button variant="ghost" size="sm" onClick={downloadScript}>
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download</span>
            </Button>
          </div>
        }
      />

      <div className="space-y-5">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div
              className="text-[10.5px] uppercase font-semibold text-muted"
              style={{ letterSpacing: "0.08em" }}
            >
              Script
            </div>
            {editingScript ? (
              <div className="flex items-center gap-1">
                <Button size="sm" onClick={saveEdit} disabled={savingScript}>
                  <Save className="w-3 h-3" /> {savingScript ? "Saving…" : "Save"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setScriptDraft(draft.script ?? "");
                    setEditingScript(false);
                  }}
                  disabled={savingScript}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setScriptDraft(draft.script ?? "");
                  setEditingScript(true);
                }}
              >
                <Edit3 className="w-3 h-3" /> Edit
              </Button>
            )}
          </div>
          {editingScript ? (
            <textarea
              value={scriptDraft}
              onChange={(e) => setScriptDraft(e.target.value)}
              rows={16}
              maxLength={50_000}
              className="w-full rounded-[10px] border border-accent/40 bg-surface px-3.5 py-3 text-[12.5px] text-text leading-relaxed font-mono focus:outline-none focus:ring-2 focus:ring-accent/20 resize-y"
            />
          ) : (
            <pre className="rounded-[10px] border border-border bg-surface-2 p-3.5 text-[12.5px] text-text/90 leading-relaxed whitespace-pre-wrap font-mono max-h-[480px] overflow-y-auto">
              {draft.script ?? "—"}
            </pre>
          )}
        </div>

        <OutputSection title="Hook variations">
          {(draft.hooks ?? []).map((h, i) => (
            <CopyableRow key={i} text={h} />
          ))}
        </OutputSection>

        <OutputSection title="Shot list">
          {(draft.shots ?? []).map((s, i) => (
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
        </OutputSection>

        <OutputSection title="Caption ideas">
          {(draft.captions ?? []).map((c, i) => (
            <CopyableRow key={i} text={c} />
          ))}
        </OutputSection>
      </div>
    </>
  );
}

function OutputSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div
        className="text-[10.5px] uppercase font-semibold text-muted mb-1.5 inline-flex items-center gap-1.5"
        style={{ letterSpacing: "0.08em" }}
      >
        <FileText className="w-2.5 h-2.5" /> {title}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function scriptToMarkdown(draft: DraftRow): string {
  const lines: string[] = [];
  lines.push(`# ${draft.angle?.trim() || "Content DNA draft"}`);
  lines.push("");
  if (draft.audience) lines.push(`**Audience:** ${draft.audience}`);
  if (draft.target_platform) lines.push(`**Platform:** ${draft.target_platform}`);
  if (draft.tone) lines.push(`**Tone:** ${draft.tone}`);
  lines.push("");
  lines.push("## Script");
  lines.push("");
  lines.push(draft.script ?? "");
  lines.push("");
  if (draft.hooks?.length) {
    lines.push("## Hook variations");
    lines.push("");
    draft.hooks.forEach((h) => lines.push(`- ${h}`));
    lines.push("");
  }
  if (draft.shots?.length) {
    lines.push("## Shot list");
    lines.push("");
    draft.shots.forEach((s, i) => {
      lines.push(`${i + 1}. (${s.duration_seconds}s) ${s.description}`);
    });
    lines.push("");
  }
  if (draft.captions?.length) {
    lines.push("## Caption ideas");
    lines.push("");
    draft.captions.forEach((c, i) => {
      lines.push(`### Caption ${i + 1}`);
      lines.push("");
      lines.push(c);
      lines.push("");
    });
  }
  return lines.join("\n");
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
          maxLength={500}
          className="w-full px-3 py-2 rounded-[10px] bg-surface border border-border text-[13px] text-text leading-snug focus:outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/20 resize-none"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={500}
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

/* ─── Delete confirm modal ───────────────────────────────────────── */

function DeleteConfirm({
  target,
  subtext,
  onConfirm,
  onCancel,
  busy,
}: {
  target: string;
  subtext?: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-[16px] bg-surface border border-border shadow-[var(--shadow-lift)] p-5">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-red-500/10 grid place-items-center shrink-0">
            <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
          </div>
          <div className="min-w-0">
            <div className="text-[15px] font-semibold text-text">Delete {target}?</div>
            <div className="text-[12.5px] text-muted mt-0.5 leading-snug">
              {subtext ?? "This cannot be undone."}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={onConfirm}
            disabled={busy}
            className="!bg-red-600 hover:!bg-red-700"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {busy ? "Deleting…" : "Yes, delete"}
          </Button>
        </div>
      </div>
    </div>
  );
}
