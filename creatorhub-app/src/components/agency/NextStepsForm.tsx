"use client";

/**
 * 4-field strategy editor. Writes to the same `brand_profiles` row as
 * BrandBuildForm — fields are `next_steps_*`. Auto-save on blur.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/Card";
import { FormSkeleton } from "@/components/agency/Skeleton";
import {
  STRATEGY_FIELDS,
  STRATEGY_FIELD_META,
  type BrandProfile,
  type BrandProfilePatch,
  type StrategyField,
} from "@/lib/agency/workspace-types";
import { Check, AlertCircle } from "lucide-react";
import { useAppState } from "@/lib/store";

type SaveStatus = "idle" | "saving" | "saved" | "error";

export function NextStepsForm({ slug }: { slug: string }) {
  const { showToast } = useAppState();
  const [profile, setProfile] = useState<BrandProfile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<Record<string, SaveStatus>>({});

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/clients/${slug}/brand-profile`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: { profile: BrandProfile }) => {
        if (!cancelled) setProfile(d.profile);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const patch = useCallback(
    async (changes: BrandProfilePatch, key: string) => {
      setStatuses((s) => ({ ...s, [key]: "saving" }));
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
        setStatuses((s) => ({ ...s, [key]: "saved" }));
        setTimeout(
          () =>
            setStatuses((s) =>
              s[key] === "saved" ? { ...s, [key]: "idle" } : s
            ),
          1600
        );
      } catch (err) {
        setStatuses((s) => ({ ...s, [key]: "error" }));
        showToast("Couldn't save — try again.");
        // eslint-disable-next-line no-console
        console.error("next_steps.patch_failed", err);
      }
    },
    [slug, showToast]
  );

  if (loadError) {
    return (
      <Card className="py-10 px-6 text-center">
        <AlertCircle className="w-5 h-5 text-error mx-auto mb-2" />
        <h3 className="text-[15px] font-semibold text-text">Couldn't load strategy</h3>
        <p className="text-[13px] text-muted mt-1">Refresh the page or try again later.</p>
      </Card>
    );
  }

  if (!profile) return <FormSkeleton fields={4} />;

  return (
    <div className="space-y-4">
      {STRATEGY_FIELDS.map((field) => (
        <StrategyFieldRow
          key={field}
          field={field}
          value={profile[field] ?? ""}
          status={statuses[field] ?? "idle"}
          onCommit={(v) => patch({ [field]: v } as BrandProfilePatch, field)}
        />
      ))}
    </div>
  );
}

function StrategyFieldRow({
  field,
  value,
  status,
  onCommit,
}: {
  field: StrategyField;
  value: string;
  status: SaveStatus;
  onCommit: (next: string | null) => void;
}) {
  const meta = STRATEGY_FIELD_META[field];
  const [local, setLocal] = useState(value);
  const initial = useRef(value);

  useEffect(() => {
    setLocal(value);
    initial.current = value;
  }, [value]);

  const handleBlur = () => {
    if (local === initial.current) return;
    onCommit(local.length === 0 ? null : local);
    initial.current = local;
  };

  return (
    <Card className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <label
          htmlFor={`strategy-${field}`}
          className="text-[13px] font-semibold text-text"
        >
          {meta.label}
        </label>
        {status === "saving" && (
          <span className="text-[11.5px] text-muted">Saving…</span>
        )}
        {status === "saved" && (
          <span className="inline-flex items-center gap-1 text-[11.5px] text-success">
            <Check className="w-3 h-3" /> Saved
          </span>
        )}
        {status === "error" && (
          <span className="inline-flex items-center gap-1 text-[11.5px] text-error">
            <AlertCircle className="w-3 h-3" /> Failed
          </span>
        )}
      </div>
      <p className="text-[12px] text-muted">{meta.helper}</p>
      <textarea
        id={`strategy-${field}`}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={handleBlur}
        placeholder={meta.placeholder}
        rows={meta.rows}
        className="w-full bg-surface-2 border border-border rounded-[10px] px-3 py-2.5 text-[13.5px] text-text placeholder:text-muted focus:outline-none focus:border-accent/40 focus:bg-surface transition-colors resize-y"
      />
    </Card>
  );
}
