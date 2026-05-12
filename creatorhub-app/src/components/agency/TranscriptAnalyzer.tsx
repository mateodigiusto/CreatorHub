"use client";

/**
 * Modal that takes a transcript, posts it to /brand-profile/analyze, and
 * renders the AI suggestions with checkboxes. Applying the selection
 * PATCHes the brand_profiles row.
 *
 * Built on a native `<dialog>` to stay shadcn-free per the agency plan
 * (§0 "UI stack" — no shadcn for v1).
 */

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { X, Sparkles, Loader2, AlertCircle } from "lucide-react";
import {
  BRAND_BUILD_FIELD_META,
  STRATEGY_FIELD_META,
  type AnalyzerResult,
  type AnalyzerSuggestion,
  type BrandProfile,
  type BrandProfilePatch,
} from "@/lib/agency/workspace-types";

type Phase = "idle" | "analyzing" | "results" | "error";

export function TranscriptAnalyzer({
  slug,
  currentProfile,
  onClose,
  onApply,
}: {
  slug: string;
  currentProfile: BrandProfile | Omit<BrandProfile, "clientId" | "organizationId" | "createdAt" | "updatedAt">;
  onClose: () => void;
  onApply: (patch: BrandProfilePatch) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [transcript, setTranscript] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<AnalyzerSuggestion[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  useEffect(() => {
    const d = dialogRef.current;
    if (d && !d.open) d.showModal();
    return () => {
      if (d && d.open) d.close();
    };
  }, []);

  const analyze = async () => {
    if (transcript.trim().length < 80) {
      setErrorCode("transcript_too_short");
      setPhase("error");
      return;
    }
    setPhase("analyzing");
    setErrorCode(null);
    try {
      const res = await fetch(`/api/clients/${slug}/brand-profile/analyze`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ transcript }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setErrorCode(data.error ?? `http_${res.status}`);
        setPhase("error");
        return;
      }
      const data = (await res.json()) as AnalyzerResult;
      setSuggestions(data.suggestions);
      // Pre-select high-confidence non-empty suggestions
      const pre = new Set<number>();
      data.suggestions.forEach((s, i) => {
        const hasValue =
          typeof s.value === "string" ? s.value.trim().length > 0 : s.value.length > 0;
        if (hasValue && s.confidence >= 0.55) pre.add(i);
      });
      setSelected(pre);
      setPhase("results");
    } catch (err) {
      setErrorCode("network_error");
      setPhase("error");
      console.error("analyze.fetch_failed", err);
    }
  };

  const apply = () => {
    if (selected.size === 0) return;
    const patch: BrandProfilePatch = {};
    selected.forEach((idx) => {
      const s = suggestions[idx];
      if (!s) return;
      if (s.field === "contentPillars") {
        // Merge with existing rather than replace — analyzer suggestions
        // augment the human's curated list.
        const merged = Array.from(
          new Set([...(currentProfile.contentPillars ?? []), ...(s.value as string[])])
        ).slice(0, 8);
        patch.contentPillars = merged;
      } else {
        // String fields. Direct assign.
        (patch as Record<string, unknown>)[s.field] = s.value as string;
      }
    });
    onApply(patch);
  };

  return (
    <dialog
      ref={dialogRef}
      className="bg-transparent backdrop:bg-black/60 backdrop:backdrop-blur-sm max-w-[860px] w-full m-auto p-0 outline-none"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <Card className="max-h-[88vh] overflow-hidden flex flex-col">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-[10px] grid place-items-center text-white shrink-0"
              style={{ background: "linear-gradient(135deg, #14315E, #0B1F3A)" }}
            >
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-[16px] font-semibold text-text">
                Analyze transcript
              </h2>
              <p className="text-[12.5px] text-muted mt-0.5">
                Paste any interview, podcast, or call. The model returns
                ≥5 suggestions you can review and apply.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 grid place-items-center rounded-[10px] hover:bg-surface-2 text-muted hover:text-text cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto mt-4 -mx-1 px-1">
          {(phase === "idle" || phase === "error") && (
            <TranscriptInput
              value={transcript}
              onChange={setTranscript}
              errorCode={phase === "error" ? errorCode : null}
            />
          )}
          {phase === "analyzing" && <AnalyzingState />}
          {phase === "results" && (
            <SuggestionsList
              suggestions={suggestions}
              selected={selected}
              onToggle={(i) =>
                setSelected((prev) => {
                  const next = new Set(prev);
                  if (next.has(i)) next.delete(i);
                  else next.add(i);
                  return next;
                })
              }
            />
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-border mt-4">
          {phase === "results" && (
            <span className="text-[12.5px] text-muted mr-auto">
              {selected.size} of {suggestions.length} selected
            </span>
          )}
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          {phase === "results" ? (
            <Button onClick={apply} disabled={selected.size === 0}>
              Apply {selected.size > 0 ? `${selected.size} ` : ""}
              {selected.size === 1 ? "suggestion" : "suggestions"}
            </Button>
          ) : (
            <Button onClick={analyze} disabled={phase === "analyzing"}>
              {phase === "analyzing" ? "Analyzing…" : "Analyze"}
            </Button>
          )}
        </div>
      </Card>
    </dialog>
  );
}

function TranscriptInput({
  value,
  onChange,
  errorCode,
}: {
  value: string;
  onChange: (s: string) => void;
  errorCode: string | null;
}) {
  return (
    <div>
      <label className="text-[13px] font-semibold text-text">Transcript</label>
      <p className="text-[12px] text-muted mt-1 mb-2">
        Minimum 80 characters. Up to ~25k tokens (about 80,000 characters).
      </p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Paste the full transcript here…"
        rows={14}
        className="w-full bg-surface-2 border border-border rounded-[10px] px-3 py-2.5 text-[13.5px] text-text placeholder:text-muted focus:outline-none focus:border-accent/40 focus:bg-surface transition-colors font-mono resize-y"
      />
      {errorCode && (
        <div className="mt-3 flex items-start gap-2 text-[12.5px] text-error">
          <AlertCircle className="w-4 h-4 mt-0.5" />
          <span>{describeError(errorCode)}</span>
        </div>
      )}
    </div>
  );
}

function AnalyzingState() {
  return (
    <div className="py-16 flex flex-col items-center gap-3 text-center">
      <Loader2 className="w-6 h-6 text-accent animate-spin" />
      <h3 className="text-[15px] font-semibold text-text">Reading the transcript</h3>
      <p className="text-[13px] text-muted max-w-sm">
        Extracting brand fields. This usually takes 5–15 seconds.
      </p>
    </div>
  );
}

function SuggestionsList({
  suggestions,
  selected,
  onToggle,
}: {
  suggestions: AnalyzerSuggestion[];
  selected: Set<number>;
  onToggle: (i: number) => void;
}) {
  if (suggestions.length === 0) {
    return (
      <div className="py-12 text-center">
        <AlertCircle className="w-5 h-5 text-muted mx-auto mb-2" />
        <h3 className="text-[15px] font-semibold text-text">No suggestions returned</h3>
        <p className="text-[13px] text-muted mt-1">Try a longer transcript.</p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {suggestions.map((s, i) => {
        const meta =
          s.field === "contentPillars"
            ? BRAND_BUILD_FIELD_META.contentPillars
            : s.field in BRAND_BUILD_FIELD_META
              ? BRAND_BUILD_FIELD_META[s.field as keyof typeof BRAND_BUILD_FIELD_META]
              : STRATEGY_FIELD_META[s.field as keyof typeof STRATEGY_FIELD_META];
        const isChecked = selected.has(i);
        const displayValue = Array.isArray(s.value)
          ? s.value.join(", ")
          : s.value;
        return (
          <li
            key={i}
            className={`border rounded-[12px] p-3.5 cursor-pointer transition-colors ${
              isChecked
                ? "bg-accent/[0.06] border-accent/30"
                : "bg-surface border-border hover:border-accent/20"
            }`}
            onClick={() => onToggle(i)}
          >
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => onToggle(i)}
                onClick={(e) => e.stopPropagation()}
                className="mt-1 w-4 h-4 accent-accent cursor-pointer"
                aria-label={`Apply ${meta.label}`}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-3 mb-1">
                  <span className="text-[13px] font-semibold text-text">
                    {meta.label}
                  </span>
                  <ConfidenceBar value={s.confidence} />
                </div>
                <p className="text-[13.5px] text-text leading-relaxed whitespace-pre-wrap">
                  {displayValue}
                </p>
                <p className="text-[12px] text-muted mt-2 leading-relaxed italic">
                  {s.rationale}
                </p>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const tone =
    value >= 0.7
      ? "text-success"
      : value >= 0.45
        ? "text-accent"
        : "text-muted";
  return (
    <span
      className={`text-[11px] font-medium tabular-nums ${tone}`}
      title={`${pct}% confidence`}
    >
      {pct}%
    </span>
  );
}

function describeError(code: string): string {
  switch (code) {
    case "transcript_too_short":
      return "Transcript is too short. Add at least a paragraph.";
    case "transcript_too_long":
      return "Transcript exceeds the 25k-token limit. Trim and try again.";
    case "transcript_required":
      return "Paste a transcript before analyzing.";
    case "plan_not_allowed":
      return "AI analyzer isn't available on your current plan. Upgrade to unlock.";
    case "ai_response_malformed":
      return "The AI returned an unexpected response. Try again.";
    case "ai_upstream_error":
      return "The AI service is unavailable. Try again in a moment.";
    case "network_error":
      return "Network problem. Check your connection and retry.";
    default:
      return "Something went wrong. Try again.";
  }
}
