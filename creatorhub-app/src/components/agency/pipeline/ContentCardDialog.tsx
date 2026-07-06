"use client";

import { useEffect, useState } from "react";
import { X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { Badge } from "@/components/ui/Badge";
import {
  CONTENT_STATUS_LABEL,
  CONTENT_TYPES,
  CONTENT_TYPE_LABEL,
  METRIC_FIELDS,
  METRIC_LABEL,
  type ContentItemWithMetrics,
  type ContentType,
  type MetricField,
} from "@/lib/agency/content";

type Tab = "overview" | "script" | "media";

type Props = {
  item: ContentItemWithMetrics;
  onClose: () => void;
  onPatch: (
    id: string,
    fields: Partial<ContentItemWithMetrics>,
  ) => Promise<void> | void;
  onPatchMetrics: (
    id: string,
    patch: Partial<Record<MetricField, number>>,
  ) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
  /**
   * Client-side viewers get a read-only card — every field is locked and
   * the Delete action is hidden. RLS blocks the writes anyway; this just
   * stops the UI from offering controls that would fail.
   */
  readOnly?: boolean;
};

/**
 * Three-tab editor for a single content item. Every text input auto-saves
 * on blur via the parent's onPatch. The Media tab is a Phase 5 placeholder.
 */
export function ContentCardDialog({
  item,
  onClose,
  onPatch,
  onPatchMetrics,
  onDelete,
  readOnly = false,
}: Props) {
  const [tab, setTab] = useState<Tab>("overview");
  const [draft, setDraft] = useState({
    title: item.title,
    content_type: item.content_type,
    hook_a: item.hook_a ?? "",
    hook_b: item.hook_b ?? "",
    hook_c: item.hook_c ?? "",
    script: item.script ?? "",
    caption: item.caption ?? "",
    visual_notes: item.visual_notes ?? "",
    planned_post_date: item.planned_post_date ?? "",
  });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync draft to incoming item prop
    setDraft({
      title: item.title,
      content_type: item.content_type,
      hook_a: item.hook_a ?? "",
      hook_b: item.hook_b ?? "",
      hook_c: item.hook_c ?? "",
      script: item.script ?? "",
      caption: item.caption ?? "",
      visual_notes: item.visual_notes ?? "",
      planned_post_date: item.planned_post_date ?? "",
    });
  }, [item]);

  function blur<K extends keyof typeof draft>(field: K, raw: string) {
    if (draft[field] === raw) return;
    const next: Partial<ContentItemWithMetrics> = {};
    if (field === "content_type") {
      if (!raw) return;
      next.content_type = raw as ContentType;
    } else if (field === "planned_post_date") {
      next.planned_post_date = raw || null;
    } else if (field === "title") {
      next.title = raw.trim() || "Untitled";
    } else {
      (next as Record<string, string | null>)[field as string] =
        raw === "" ? null : raw;
    }
    void onPatch(item.id, next);
  }

  function metricBlur(field: MetricField, raw: string) {
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) return;
    if ((item.metrics?.[field] ?? 0) === n) return;
    void onPatchMetrics(item.id, { [field]: Math.trunc(n) });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-border rounded-[16px] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 p-5 border-b border-border">
          <div className="flex-1">
            <input
              value={draft.title}
              readOnly={readOnly}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              onBlur={(e) => blur("title", e.target.value)}
              className="w-full text-[18px] font-semibold tracking-[-0.005em] text-text bg-transparent border-0 outline-none placeholder:text-muted"
              placeholder="Untitled"
            />
            <div className="flex items-center gap-2 mt-1">
              <Badge tone="accent">{CONTENT_STATUS_LABEL[item.status]}</Badge>
              <Badge tone="neutral">
                {CONTENT_TYPE_LABEL[item.content_type]}
              </Badge>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-muted hover:text-text"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 pt-3">
          <Tabs
            value={tab}
            onChange={setTab}
            options={[
              { value: "overview", label: "Overview" },
              { value: "script", label: "Script & Caption" },
              { value: "media", label: "Media" },
            ]}
          />
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {tab === "overview" && (
            <div className="space-y-4">
              <Field label="Content type">
                <select
                  value={draft.content_type}
                  disabled={readOnly}
                  onChange={(e) => {
                    const v = e.target.value as ContentType;
                    setDraft((d) => ({ ...d, content_type: v }));
                    blur("content_type", v);
                  }}
                  className="w-full h-9 px-3 text-[13.5px] bg-surface border border-border rounded-[8px] outline-none focus:border-accent/40 disabled:opacity-60"
                >
                  {CONTENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {CONTENT_TYPE_LABEL[t]}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Planned post date">
                <input
                  type="date"
                  value={draft.planned_post_date}
                  readOnly={readOnly}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      planned_post_date: e.target.value,
                    }))
                  }
                  onBlur={(e) => blur("planned_post_date", e.target.value)}
                  className="w-full h-9 px-3 text-[13.5px] bg-surface border border-border rounded-[8px] outline-none focus:border-accent/40"
                />
              </Field>

              <div className="space-y-2">
                <p className="text-[12px] uppercase tracking-[0.06em] text-muted font-semibold">
                  Hooks
                </p>
                {(["hook_a", "hook_b", "hook_c"] as const).map((h, idx) => (
                  <input
                    key={h}
                    value={draft[h]}
                    readOnly={readOnly}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, [h]: e.target.value }))
                    }
                    onBlur={(e) => blur(h, e.target.value)}
                    placeholder={`Hook ${String.fromCharCode(65 + idx)}`}
                    className="w-full h-9 px-3 text-[13.5px] bg-surface border border-border rounded-[8px] outline-none focus:border-accent/40 placeholder:text-muted"
                  />
                ))}
              </div>

              {item.metrics ? (
                <div className="space-y-2 pt-2 border-t border-border">
                  <p className="text-[12px] uppercase tracking-[0.06em] text-muted font-semibold">
                    Metrics
                  </p>
                  <div className="grid grid-cols-5 gap-2">
                    {METRIC_FIELDS.map((m) => (
                      <MetricInput
                        key={m}
                        label={METRIC_LABEL[m]}
                        defaultValue={item.metrics?.[m] ?? 0}
                        readOnly={readOnly}
                        onCommit={(v) => metricBlur(m, v)}
                      />
                    ))}
                  </div>
                </div>
              ) : readOnly ? null : (
                <button
                  onClick={() => void onPatchMetrics(item.id, { views: 0 })}
                  className="text-[12.5px] text-accent hover:underline"
                >
                  Add metrics
                </button>
              )}
            </div>
          )}

          {tab === "script" && (
            <div className="space-y-4">
              <Field label="Script">
                <textarea
                  value={draft.script}
                  readOnly={readOnly}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, script: e.target.value }))
                  }
                  onBlur={(e) => blur("script", e.target.value)}
                  rows={10}
                  className="w-full px-3 py-2 text-[13.5px] bg-surface border border-border rounded-[8px] outline-none focus:border-accent/40 placeholder:text-muted leading-relaxed"
                  placeholder="Full script for the video…"
                />
              </Field>
              <Field label="Caption">
                <textarea
                  value={draft.caption}
                  readOnly={readOnly}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, caption: e.target.value }))
                  }
                  onBlur={(e) => blur("caption", e.target.value)}
                  rows={5}
                  className="w-full px-3 py-2 text-[13.5px] bg-surface border border-border rounded-[8px] outline-none focus:border-accent/40 placeholder:text-muted leading-relaxed"
                  placeholder="Post caption…"
                />
              </Field>
              <Field label="Visual notes">
                <textarea
                  value={draft.visual_notes}
                  readOnly={readOnly}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, visual_notes: e.target.value }))
                  }
                  onBlur={(e) => blur("visual_notes", e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-[13.5px] bg-surface border border-border rounded-[8px] outline-none focus:border-accent/40 placeholder:text-muted leading-relaxed"
                  placeholder="Shot list, b-roll, references…"
                />
              </Field>
            </div>
          )}

          {tab === "media" && (
            <div className="border border-dashed border-border rounded-[12px] p-8 text-center">
              <p className="text-[13px] text-muted">
                {item.bunny_video_id
                  ? `Bunny video ${item.bunny_video_id} — status ${item.bunny_video_status ?? "unknown"}.`
                  : "No video attached yet."}
              </p>
              <p className="text-[12px] text-muted mt-1">
                Upload + playback lands in Phase 5 (Bunny.net Stream).
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 p-4 border-t border-border">
          {readOnly ? (
            <span className="text-[12px] text-muted">Read-only</span>
          ) : (
            <button
              onClick={() => {
                if (confirm("Delete this content item?")) {
                  void onDelete(item.id);
                  onClose();
                }
              }}
              className="inline-flex items-center gap-1.5 text-[12.5px] text-muted hover:text-[var(--error)] transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          )}
          <Button variant="secondary" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[12px] uppercase tracking-[0.06em] text-muted font-semibold">
        {label}
      </span>
      {children}
    </label>
  );
}

function MetricInput({
  label,
  defaultValue,
  onCommit,
  readOnly = false,
}: {
  label: string;
  defaultValue: number;
  onCommit: (v: string) => void;
  readOnly?: boolean;
}) {
  const [v, setV] = useState(String(defaultValue));
  // eslint-disable-next-line react-hooks/set-state-in-effect -- sync local string to numeric default prop
  useEffect(() => setV(String(defaultValue)), [defaultValue]);
  return (
    <label className="block">
      <span className="block text-[10.5px] uppercase tracking-[0.06em] text-muted font-semibold mb-1">
        {label}
      </span>
      <input
        type="number"
        min={0}
        value={v}
        readOnly={readOnly}
        onChange={(e) => setV(e.target.value)}
        onBlur={(e) => onCommit(e.target.value)}
        className="w-full h-8 px-2 text-[12.5px] bg-surface border border-border rounded-[6px] outline-none focus:border-accent/40 tabular-nums"
      />
    </label>
  );
}
