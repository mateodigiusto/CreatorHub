"use client";

/**
 * Manual script generation form.
 *
 * Overrides the user's script_preferences for a one-off generation —
 * pick the platform, format, and (optionally) a source transcript to
 * inherit hook/themes from. POSTs to /api/scripts/generate then routes
 * to /scripts/[id].
 *
 * Linked from the /scripts landing page and from /content-dna/[id]
 * (the "Generate Script From This" button uses the API directly with
 * defaults; this page is for when the user wants to override them).
 */

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Sparkles,
  Wand2,
  Microscope,
  Check,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useAppState } from "@/lib/store";
import { useClientQuery } from "@/lib/clients/use-client-query";
import { cn } from "@/lib/cn";
import type { Platform } from "@/lib/onboarding/types";

type ScriptFormat = "reel" | "longform" | "vsl" | "story_sequence" | "email";

type AnalysisOption = {
  id: string;
  source_title: string | null;
  source_creator: string | null;
  source_platform: string;
  hook: string | null;
};

const FORMATS: Array<{ key: ScriptFormat; label: string; description: string }> = [
  { key: "reel", label: "Short-form Reel", description: "60–90s vertical. Hook + 2-4 beats + CTA." },
  { key: "longform", label: "Long-form video", description: "8–15 min YouTube. Multiple key points." },
  { key: "vsl", label: "VSL", description: "Sales video. Pain → Promise → Proof → CTA." },
  { key: "story_sequence", label: "Story sequence", description: "5–7 IG story slides building one argument." },
  { key: "email", label: "Email", description: "200–400 word email to a warm list." },
];

const PLATFORMS: Platform[] = [
  "instagram", "tiktok", "youtube", "linkedin", "x", "facebook",
];

export default function NewScriptPage() {
  return (
    <Suspense fallback={null}>
      <NewScriptInner />
    </Suspense>
  );
}

function NewScriptInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { showToast } = useAppState();
  const clientQ = useClientQuery();

  /* Allow ?source=<analysisId> deep link from the content-dna page so
     the user lands here with the source already picked. */
  const initialSource = params.get("source");

  const [platform, setPlatform] = useState<Platform>("instagram");
  const [format, setFormat] = useState<ScriptFormat>("reel");
  const [sourceId, setSourceId] = useState<string | null>(initialSource);
  const [analyses, setAnalyses] = useState<AnalysisOption[] | null>(null);
  const [generating, setGenerating] = useState(false);

  /* Lazy-load the user's recent analyses so they can pick one as the
     source. Only fetch once — the list rarely changes mid-session. */
  const loadAnalyses = useCallback(async () => {
    try {
      const r = await fetch("/api/content-dna", { credentials: "include" });
      if (!r.ok) {
        setAnalyses([]);
        return;
      }
      const json = (await r.json()) as { analyses: AnalysisOption[] };
      /* Filter to ready-only. analyzing/failed rows have no usable hook. */
      type AnyRow = AnalysisOption & { status: string };
      setAnalyses(
        (json.analyses as AnyRow[])
          .filter((a) => a.status === "ready")
          .slice(0, 12),
      );
    } catch {
      setAnalyses([]);
    }
  }, []);

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --- one-shot bootstrap */
    void loadAnalyses();
  }, [loadAnalyses]);

  async function generate() {
    if (generating) return;
    setGenerating(true);
    try {
      const res = await fetch(`/api/scripts/generate${clientQ.q}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          platform,
          format,
          sourceAnalysisId: sourceId,
        }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        showToast(`Couldn't generate: ${err.error ?? res.status}`);
        setGenerating(false);
        return;
      }
      const json = (await res.json()) as { script: { id: string } };
      router.push(`/scripts/${json.script.id}`);
    } catch {
      showToast("Network error. Try again.");
      setGenerating(false);
    }
  }

  return (
    <>
      <PageHeader
        title={
          <span className="inline-flex items-center gap-2">
            <button
              onClick={() => router.push("/scripts")}
              className="p-1 rounded-md hover:bg-surface-2 cursor-pointer text-muted hover:text-text"
              aria-label="Back to scripts"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <span>New script</span>
          </span>
        }
        description="Override your default preferences for a single script. Picks a transcript as the structural inspiration when you want it."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {/* Format */}
          <Card>
            <CardHeader title="Format" description="Drives the structure + length of the script." />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {FORMATS.map((f) => {
                const active = format === f.key;
                return (
                  <button
                    key={f.key}
                    onClick={() => setFormat(f.key)}
                    className={cn(
                      "lift text-left rounded-[12px] border p-3.5 bg-surface card-base transition-colors cursor-pointer",
                      active
                        ? "border-accent/40 ring-2 ring-accent/15"
                        : "border-border",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-[13.5px] font-semibold text-text">{f.label}</div>
                      {active && <Check className="w-4 h-4 text-accent shrink-0" />}
                    </div>
                    <div className="text-[12px] text-muted mt-1 leading-snug">
                      {f.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Platform */}
          <Card>
            <CardHeader title="Platform" description="Influences voice + line length." />
            <div className="flex flex-wrap gap-1.5">
              {PLATFORMS.map((p) => {
                const active = platform === p;
                return (
                  <button
                    key={p}
                    onClick={() => setPlatform(p)}
                    className={cn(
                      "px-3 py-1.5 rounded-full border text-[12.5px] capitalize transition-colors cursor-pointer",
                      active
                        ? "border-accent/40 bg-accent-soft text-accent font-medium"
                        : "border-border bg-surface text-muted hover:border-accent/30 hover:text-text",
                    )}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Source transcript picker */}
          <Card>
            <CardHeader
              title={
                <span className="inline-flex items-center gap-2">
                  Source <Badge tone="neutral">Optional</Badge>
                </span>
              }
              description="Pick a transcript to inherit structural style from. Same hook shape, your topic."
            />
            {analyses === null ? (
              <div className="h-20 rounded-md bg-surface-2 animate-pulse" />
            ) : analyses.length === 0 ? (
              <div className="rounded-[10px] border border-dashed border-border p-4 text-center">
                <div className="text-[13px] text-text font-medium">
                  No transcripts yet.
                </div>
                <div className="text-[12px] text-muted mt-1 mb-3 max-w-[420px] mx-auto">
                  Add one in Transcribe & Analyze, then come back here to use
                  it as a structural source.
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push("/content-dna")}
                >
                  <Microscope className="w-3.5 h-3.5" /> Open Transcribe
                </Button>
              </div>
            ) : (
              <div className="space-y-1.5">
                <button
                  onClick={() => setSourceId(null)}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-md border text-[12.5px] transition-colors flex items-center justify-between gap-2 cursor-pointer",
                    !sourceId
                      ? "border-accent/40 bg-accent-soft text-text"
                      : "border-border bg-surface text-text hover:border-accent/30",
                  )}
                >
                  <span>
                    <span className="font-medium">No source</span>
                    <span className="text-muted ml-2">— generate from your profile only</span>
                  </span>
                  {!sourceId && <Check className="w-3.5 h-3.5 text-accent" />}
                </button>
                {analyses.map((a) => {
                  const active = sourceId === a.id;
                  return (
                    <button
                      key={a.id}
                      onClick={() => setSourceId(a.id)}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-md border transition-colors cursor-pointer flex items-center justify-between gap-2",
                        active
                          ? "border-accent/40 bg-accent-soft"
                          : "border-border bg-surface hover:border-accent/30",
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-[12.5px] font-medium text-text truncate">
                          {a.source_title ?? "Untitled video"}
                        </div>
                        <div className="text-[11.5px] text-muted truncate">
                          {a.source_creator ?? a.source_platform}
                          {a.hook && <> · &ldquo;{a.hook.slice(0, 60)}{a.hook.length > 60 ? "…" : ""}&rdquo;</>}
                        </div>
                      </div>
                      {active && <Check className="w-3.5 h-3.5 text-accent shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader
              title={
                <span className="inline-flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-accent" /> Generation
                </span>
              }
              description="Lands as a Draft. Edit, then approve to schedule."
            />
            <div className="space-y-2 text-[12.5px] text-muted leading-relaxed">
              <Row label="Format" value={FORMATS.find((f) => f.key === format)?.label ?? format} />
              <Row label="Platform" value={platform} />
              <Row
                label="Source"
                value={
                  sourceId
                    ? analyses?.find((a) => a.id === sourceId)?.source_title ?? "Selected transcript"
                    : "None — profile only"
                }
              />
            </div>
            <Button className="mt-4 w-full" onClick={generate} disabled={generating}>
              <Wand2 className="w-3.5 h-3.5" />
              {generating ? "Generating…" : "Generate script"}
            </Button>
          </Card>

          <Card>
            <CardHeader title="Tip" />
            <div className="text-[12.5px] text-muted leading-relaxed">
              For sharper output, transcribe 2–3 of your top-performing
              videos first, then pick one as the source. The generator
              mirrors the structural pattern that worked, with your topic.
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-muted">{label}</span>
      <span className="text-text font-medium text-right capitalize first-letter:uppercase truncate max-w-[60%]">
        {value}
      </span>
    </div>
  );
}
