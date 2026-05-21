"use client";

import { useState } from "react";
import { X, Building2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

/**
 * Inline dialog to spin up an additional organization. POSTs to
 * /api/organizations/create-additional, which also switches the
 * active-org cookie to the new org — so on success we hard-reload and
 * the app lands in the new org.
 */
export function CreateOrgDialog({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"agency" | "solo">("agency");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/organizations/create-additional", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: trimmed, kind }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(errorCopy(body.error));
        setSubmitting(false);
        return;
      }
      /* create-additional already set the active-org cookie — reload into
         the new org, landing on the surface that matches its kind. */
      window.location.assign(kind === "agency" ? "/clients" : "/dashboard");
    } catch {
      setError("Network error. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center p-4 bg-navy/40 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[420px] rounded-[14px] bg-surface border border-border shadow-[0_24px_60px_-12px_rgba(7,17,31,0.35)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg grid place-items-center bg-accent/10 border border-accent/20 text-accent">
              <Building2 className="w-3.5 h-3.5" />
            </span>
            <h2 className="text-[14px] font-semibold text-text">
              Create organization
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-7 h-7 grid place-items-center rounded-md text-muted hover:text-text hover:bg-surface-2 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={submit} className="px-5 py-4">
          <label className="block text-[12px] font-medium text-text mb-1.5">
            Organization name
          </label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            placeholder="Acme Studio"
            className="w-full h-10 px-3 rounded-[10px] bg-surface border border-border text-[13.5px] text-text placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
          />

          <div className="text-[12px] font-medium text-text mt-4 mb-1.5">
            Type
          </div>
          <div className="grid grid-cols-2 gap-2">
            <KindOption
              label="Agency"
              hint="Manages multiple clients"
              active={kind === "agency"}
              onClick={() => setKind("agency")}
            />
            <KindOption
              label="Solo"
              hint="Just your own content"
              active={kind === "solo"}
              onClick={() => setKind("solo")}
            />
          </div>

          {error && (
            <div className="mt-3 text-[12px] text-[var(--error)]">{error}</div>
          )}

          <div className="flex items-center justify-end gap-2 mt-5">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={!name.trim() || submitting}>
              {submitting ? "Creating…" : "Create organization"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function KindOption({
  label,
  hint,
  active,
  onClick,
}: {
  label: string;
  hint: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "text-left rounded-[10px] border p-2.5 transition-colors cursor-pointer " +
        (active
          ? "border-accent/50 bg-accent/[0.06]"
          : "border-border hover:border-accent/30")
      }
    >
      <div className="text-[13px] font-medium text-text">{label}</div>
      <div className="text-[11px] text-muted mt-0.5 leading-snug">{hint}</div>
    </button>
  );
}

function errorCopy(code: string | undefined): string {
  switch (code) {
    case "name_required":
      return "Enter an organization name (1–80 characters).";
    case "no_founding_org":
      return "Finish onboarding your first organization before adding another.";
    case "slug_unavailable":
      return "Couldn't find a free URL for that name — try a different one.";
    default:
      return "Couldn't create the organization. Try again.";
  }
}
