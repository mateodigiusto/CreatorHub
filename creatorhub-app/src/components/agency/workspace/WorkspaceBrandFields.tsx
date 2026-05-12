"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";

export type WorkspaceBrandField = {
  key: string;
  label: string;
  helper: string;
  value: string | null;
  rows?: number;
};

/**
 * Read or edit-mode view of a list of brand-profile fields.
 *
 * `editable=false` renders a clean reading layout (no inputs at all).
 * `editable=true` renders auto-save-on-blur textareas that PATCH to the
 * given endpoint. PATCH body is `{ [key]: value | null }` — matching
 * the agency-side brand profile PATCH shape so Phase 3 only has to
 * wire it once.
 *
 * Phase 3's full agency-side BrandBuildForm is more elaborate (analyzer,
 * content_pillars multi-input, etc). This is the slim portal version —
 * a creator viewing their own brand fields doesn't need the analyzer.
 */
export function WorkspaceBrandFields({
  fields,
  editable,
  endpoint,
}: {
  fields: WorkspaceBrandField[];
  editable: boolean;
  /**
   * Where to PATCH a single field, e.g.
   * `/api/clients/[slug]/brand-profile`. The handler is owned by
   * Phase 3 — this component only fires the request.
   */
  endpoint: string;
}) {
  if (!editable) {
    return (
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {fields.map((f) => (
          <Card key={f.key} className="space-y-1.5">
            <p className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-muted">
              {f.label}
            </p>
            {f.value ? (
              <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-text-2">
                {f.value}
              </p>
            ) : (
              <p className="text-[13px] italic text-muted">Not set yet.</p>
            )}
          </Card>
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {fields.map((f) => (
        <EditableField key={f.key} field={f} endpoint={endpoint} />
      ))}
    </div>
  );
}

function EditableField({
  field,
  endpoint,
}: {
  field: WorkspaceBrandField;
  endpoint: string;
}) {
  const [value, setValue] = useState(field.value ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "error" | "saved">(
    "idle",
  );

  async function commit() {
    const next = value.trim() ? value : null;
    if ((next ?? "") === (field.value ?? "")) return;
    setStatus("saving");
    try {
      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field.key]: next }),
      });
      setStatus(res.ok ? "saved" : "error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <Card className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-muted">
          {field.label}
        </p>
        {status === "saving" && (
          <span className="text-[11px] text-muted">Saving…</span>
        )}
        {status === "saved" && (
          <span className="text-[11px] text-[var(--success)]">Saved</span>
        )}
        {status === "error" && (
          <span className="text-[11px] text-[var(--error)]">Save failed</span>
        )}
      </div>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        rows={field.rows ?? 3}
        placeholder={field.helper}
        className="w-full resize-none rounded-[8px] border border-border bg-surface px-3 py-2 text-[13.5px] leading-relaxed text-text outline-none placeholder:text-muted focus:border-accent/40"
      />
    </Card>
  );
}
