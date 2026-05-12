"use client";

/**
 * 14-field brand profile editor. Each field auto-saves on blur via PATCH.
 * The form is "fire and update local state" — no submit button — because
 * the data layer is row-per-client and every field is independent.
 *
 * The "Analyze a transcript" affordance is rendered inline above the form;
 * clicking opens the `TranscriptAnalyzer` dialog which returns selected
 * suggestions and applies them as additional PATCHes.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FormSkeleton } from "@/components/agency/Skeleton";
import {
  BRAND_BUILD_FIELDS,
  BRAND_BUILD_FIELD_META,
  EMPTY_BRAND_PROFILE,
  type BrandBuildField,
  type BrandProfile,
  type BrandProfilePatch,
} from "@/lib/agency/workspace-types";
import { Sparkles, Check, AlertCircle, X } from "lucide-react";
import { useAppState } from "@/lib/store";
import { TranscriptAnalyzer } from "./TranscriptAnalyzer";

type SaveStatus = "idle" | "saving" | "saved" | "error";

export function BrandBuildForm({ slug }: { slug: string }) {
  const { showToast } = useAppState();
  const [profile, setProfile] = useState<BrandProfile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<Record<string, SaveStatus>>({});
  const [analyzerOpen, setAnalyzerOpen] = useState(false);

  // Initial load
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/clients/${slug}/brand-profile`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: { profile: BrandProfile }) => {
        if (!cancelled) setProfile(data.profile);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const patch = useCallback(
    async (changes: BrandProfilePatch, statusKey: string) => {
      setStatuses((s) => ({ ...s, [statusKey]: "saving" }));
      try {
        const res = await fetch(`/api/clients/${slug}/brand-profile`, {
          method: "PATCH",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(changes),
        });
        if (!res.ok) throw new Error(`http_${res.status}`);
        const data = (await res.json()) as { profile: BrandProfile };
        setProfile(data.profile);
        setStatuses((s) => ({ ...s, [statusKey]: "saved" }));
        setTimeout(
          () =>
            setStatuses((s) =>
              s[statusKey] === "saved" ? { ...s, [statusKey]: "idle" } : s
            ),
          1600
        );
      } catch (err) {
        setStatuses((s) => ({ ...s, [statusKey]: "error" }));
        showToast("Couldn't save — try again.");
        // eslint-disable-next-line no-console
        console.error("brand_profile.patch_failed", err);
      }
    },
    [slug, showToast]
  );

  if (loadError) {
    return (
      <Card className="py-10 px-6 text-center">
        <AlertCircle className="w-5 h-5 text-error mx-auto mb-2" />
        <h3 className="text-[15px] font-semibold text-text">Couldn't load this profile</h3>
        <p className="text-[13px] text-muted mt-1">Refresh the page or try again later.</p>
      </Card>
    );
  }

  if (!profile) {
    return <FormSkeleton fields={8} />;
  }

  const onApplySuggestions = (patchBody: BrandProfilePatch) => {
    const keys = Object.keys(patchBody);
    if (keys.length === 0) return;
    void patch(patchBody, "ai");
    showToast(`Applied ${keys.length} ${keys.length === 1 ? "suggestion" : "suggestions"}.`);
  };

  return (
    <div className="space-y-4">
      <Card className="flex items-start gap-3">
        <div
          className="w-9 h-9 rounded-[10px] grid place-items-center text-white shrink-0"
          style={{ background: "linear-gradient(135deg, #14315E, #0B1F3A)" }}
        >
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <h3 className="text-[14.5px] font-semibold text-text">
            Save hours with a transcript
          </h3>
          <p className="text-[13px] text-muted mt-0.5 max-w-xl">
            Paste a transcript from a discovery call, podcast, or onboarding
            video. AI extracts ~14 brand fields you can review and apply.
          </p>
        </div>
        <Button size="sm" onClick={() => setAnalyzerOpen(true)}>
          Analyze transcript
        </Button>
      </Card>

      {BRAND_BUILD_FIELDS.map((field) => (
        <FieldRow
          key={field}
          field={field}
          value={profile[field] ?? ""}
          status={statuses[field] ?? "idle"}
          onCommit={(v) => patch({ [field]: v } as BrandProfilePatch, field)}
        />
      ))}

      <PillarsRow
        value={profile.contentPillars}
        status={statuses.contentPillars ?? "idle"}
        onCommit={(pillars) =>
          patch({ contentPillars: pillars }, "contentPillars")
        }
      />

      {analyzerOpen && (
        <TranscriptAnalyzer
          slug={slug}
          currentProfile={profile ?? { ...EMPTY_BRAND_PROFILE, contentPillars: [] }}
          onClose={() => setAnalyzerOpen(false)}
          onApply={(p) => {
            onApplySuggestions(p);
            setAnalyzerOpen(false);
          }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────

function FieldRow({
  field,
  value,
  status,
  onCommit,
}: {
  field: BrandBuildField;
  value: string;
  status: SaveStatus;
  onCommit: (next: string | null) => void;
}) {
  const meta = BRAND_BUILD_FIELD_META[field];
  const [local, setLocal] = useState(value);
  const initial = useRef(value);

  // Refresh local when the canonical row changes from elsewhere (e.g. AI apply).
  useEffect(() => {
    setLocal(value);
    initial.current = value;
  }, [value]);

  const handleBlur = () => {
    const trimmed = local;
    if (trimmed === initial.current) return;
    onCommit(trimmed.length === 0 ? null : trimmed);
    initial.current = trimmed;
  };

  return (
    <Card className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <label
          htmlFor={`field-${field}`}
          className="text-[13px] font-semibold text-text"
        >
          {meta.label}
        </label>
        <SaveIndicator status={status} />
      </div>
      <p className="text-[12px] text-muted">{meta.helper}</p>
      <textarea
        id={`field-${field}`}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={handleBlur}
        placeholder={meta.placeholder}
        rows={meta.rows ?? 3}
        className="w-full bg-surface-2 border border-border rounded-[10px] px-3 py-2.5 text-[13.5px] text-text placeholder:text-muted focus:outline-none focus:border-accent/40 focus:bg-surface transition-colors resize-y"
      />
    </Card>
  );
}

function PillarsRow({
  value,
  status,
  onCommit,
}: {
  value: string[];
  status: SaveStatus;
  onCommit: (next: string[]) => void;
}) {
  const meta = BRAND_BUILD_FIELD_META.contentPillars;
  const [pending, setPending] = useState("");
  const [pillars, setPillars] = useState<string[]>(value);

  useEffect(() => {
    setPillars(value);
  }, [value]);

  const addPillar = () => {
    const trimmed = pending.trim();
    if (!trimmed) return;
    if (pillars.includes(trimmed)) return;
    if (pillars.length >= 8) return;
    const next = [...pillars, trimmed];
    setPillars(next);
    setPending("");
    onCommit(next);
  };

  const removePillar = (idx: number) => {
    const next = pillars.filter((_, i) => i !== idx);
    setPillars(next);
    onCommit(next);
  };

  return (
    <Card className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <label className="text-[13px] font-semibold text-text">{meta.label}</label>
        <SaveIndicator status={status} />
      </div>
      <p className="text-[12px] text-muted">{meta.helper}</p>
      <div className="flex flex-wrap gap-1.5">
        {pillars.map((p, i) => (
          <span
            key={`${p}-${i}`}
            className="inline-flex items-center gap-1 bg-accent/10 border border-accent/20 text-accent rounded-full pl-2.5 pr-1.5 py-1 text-[12.5px] font-medium"
          >
            {p}
            <button
              type="button"
              aria-label={`Remove ${p}`}
              onClick={() => removePillar(i)}
              className="w-4 h-4 grid place-items-center rounded-full hover:bg-accent/15 cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          value={pending}
          onChange={(e) => setPending(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addPillar();
            }
          }}
          placeholder={meta.placeholder}
          className="flex-1 bg-surface-2 border border-border rounded-[10px] px-3 py-2 text-[13.5px] text-text placeholder:text-muted focus:outline-none focus:border-accent/40 focus:bg-surface transition-colors"
          disabled={pillars.length >= 8}
        />
        <Button
          size="sm"
          variant="secondary"
          onClick={addPillar}
          disabled={!pending.trim() || pillars.length >= 8}
        >
          Add
        </Button>
      </div>
    </Card>
  );
}

function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === "idle") return null;
  if (status === "saving") {
    return <span className="text-[11.5px] text-muted">Saving…</span>;
  }
  if (status === "saved") {
    return (
      <span className="inline-flex items-center gap-1 text-[11.5px] text-success">
        <Check className="w-3 h-3" /> Saved
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11.5px] text-error">
      <AlertCircle className="w-3 h-3" /> Failed
    </span>
  );
}
