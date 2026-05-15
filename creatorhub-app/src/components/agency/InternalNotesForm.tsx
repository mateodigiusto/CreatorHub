"use client";

/**
 * Staff-only internal notes textarea. RLS already strips this table from
 * client-side users — this form is rendered only on the staff `/internal`
 * tab. Single-field, debounced auto-save.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/Card";
import { FormSkeleton } from "@/components/agency/Skeleton";
import { Lock, Check, AlertCircle } from "lucide-react";
import { useAppState } from "@/lib/store";
import type { ClientInternalNotes } from "@/lib/agency/workspace-types";

type SaveStatus = "idle" | "saving" | "saved" | "error";

export function InternalNotesForm({ slug }: { slug: string }) {
  const { showToast } = useAppState();
  const [notes, setNotes] = useState<ClientInternalNotes | null>(null);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/clients/${slug}/internal-notes`, { credentials: "include" })
      .then((r) => {
        if (r.status === 403) throw new Error("forbidden");
        if (!r.ok) throw new Error(`http_${r.status}`);
        return r.json() as Promise<{ notes: ClientInternalNotes }>;
      })
      .then(({ notes }) => {
        if (cancelled) return;
        setNotes(notes);
        setDraft(notes.body);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const save = useCallback(
    async (body: string) => {
      setStatus("saving");
      try {
        const res = await fetch(`/api/clients/${slug}/internal-notes`, {
          method: "PATCH",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ body }),
        });
        if (!res.ok) throw new Error(`http_${res.status}`);
        const data = (await res.json()) as { notes: ClientInternalNotes };
        setNotes(data.notes);
        setStatus("saved");
        window.setTimeout(
          () => setStatus((s) => (s === "saved" ? "idle" : s)),
          1600
        );
      } catch (err) {
        setStatus("error");
        showToast("Couldn't save notes.");
        console.error("internal_notes.save_failed", err);
      }
    },
    [slug, showToast]
  );

  const onChange = (value: string) => {
    setDraft(value);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      if (notes && value !== notes.body) void save(value);
    }, 600);
  };

  if (error === "forbidden") {
    return (
      <Card className="py-10 px-6 text-center">
        <Lock className="w-5 h-5 text-muted mx-auto mb-2" />
        <h3 className="text-[15px] font-semibold text-text">Director-only</h3>
        <p className="text-[13px] text-muted mt-1">
          Only directors can edit internal notes. Talk to your org admin if
          this looks wrong.
        </p>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="py-10 px-6 text-center">
        <AlertCircle className="w-5 h-5 text-error mx-auto mb-2" />
        <h3 className="text-[15px] font-semibold text-text">Couldn&apos;t load notes</h3>
        <p className="text-[13px] text-muted mt-1">Refresh or try again later.</p>
      </Card>
    );
  }

  if (!notes) return <FormSkeleton fields={2} />;

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 text-muted" />
          <span className="text-[12px] text-muted">
            Staff-only — clients never see this.
          </span>
        </div>
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
      <textarea
        value={draft}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => {
          if (timerRef.current) window.clearTimeout(timerRef.current);
          if (notes && draft !== notes.body) void save(draft);
        }}
        placeholder="Background context, sensitive notes, points to revisit. Anything you don't want the client to see."
        rows={14}
        className="w-full bg-surface-2 border border-border rounded-[10px] px-3 py-2.5 text-[13.5px] text-text placeholder:text-muted focus:outline-none focus:border-accent/40 focus:bg-surface transition-colors resize-y"
      />
    </Card>
  );
}
