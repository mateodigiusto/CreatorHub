"use client";

import { useState } from "react";
import { Banknote, Pencil, Check, X } from "lucide-react";
import type { RelationshipDetail, RetainerCadence } from "@/lib/clients/types";

const CADENCE_LABELS: Record<RetainerCadence, string> = {
  monthly: "/ month",
  quarterly: "/ quarter",
  project: "per project",
};

const COMMON_CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD"];

export function RetainerCard({
  relationship,
  onUpdated,
  onError,
}: {
  relationship: RelationshipDetail;
  onUpdated: (next: Partial<RelationshipDetail>) => void;
  onError: (msg: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [amount, setAmount] = useState(
    relationship.retainerAmount?.toString() ?? "",
  );
  const [currency, setCurrency] = useState(
    relationship.retainerCurrency ?? "USD",
  );
  const [cadence, setCadence] = useState<RetainerCadence>(
    relationship.retainerCadence ?? "monthly",
  );

  const hasRetainer = relationship.retainerAmount !== null;
  const formatted = hasRetainer
    ? new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: relationship.retainerCurrency ?? "USD",
        minimumFractionDigits: 0,
      }).format(relationship.retainerAmount ?? 0)
    : null;

  async function save() {
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) {
      onError("Enter a positive number for the retainer amount.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/clients/${relationship.id}/retainer`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          retainerAmount: n,
          retainerCurrency: currency,
          retainerCadence: cadence,
        }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        onError(`Couldn't save: ${err.error ?? res.status}`);
        return;
      }
      onUpdated({
        retainerAmount: n,
        retainerCurrency: currency,
        retainerCadence: cadence,
      });
      setEditing(false);
    } catch {
      onError("Network error. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function clear() {
    if (!confirm("Remove the retainer for this client?")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/clients/${relationship.id}/retainer`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ retainerAmount: null }),
      });
      if (!res.ok) {
        onError("Couldn't clear retainer.");
        return;
      }
      onUpdated({
        retainerAmount: null,
        retainerCurrency: null,
        retainerCadence: null,
      });
      setAmount("");
      setEditing(false);
    } catch {
      onError("Network error. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mb-4 rounded-[12px] border border-border bg-surface card-base px-4 py-3 flex items-center gap-3">
      <div className="w-8 h-8 rounded-md grid place-items-center bg-accent-soft border border-accent-border text-accent shrink-0">
        <Banknote className="w-4 h-4" />
      </div>

      {!editing ? (
        <>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] uppercase font-semibold text-muted tracking-wide">
              Retainer
            </div>
            <div className="text-[14px] font-semibold text-text mt-0.5 tabular-nums">
              {hasRetainer ? (
                <>
                  {formatted}{" "}
                  <span className="text-[12px] font-normal text-muted">
                    {CADENCE_LABELS[relationship.retainerCadence ?? "monthly"]}
                  </span>
                </>
              ) : (
                <span className="text-muted font-normal text-[12.5px]">
                  Not set — track what you charge this client.
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => setEditing(true)}
            className="text-muted hover:text-text inline-flex items-center gap-1 text-[12px] cursor-pointer px-2 py-1 rounded hover:bg-surface-2"
          >
            <Pencil className="w-3 h-3" />
            {hasRetainer ? "Edit" : "Set retainer"}
          </button>
        </>
      ) : (
        <div className="flex-1 flex flex-wrap items-center gap-2">
          <input
            type="number"
            min="1"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="2500"
            className="w-28 h-9 px-2.5 rounded-[8px] bg-surface border border-border text-[13px] text-text focus:outline-none focus:border-accent/40"
          />
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="h-9 px-2 rounded-[8px] bg-surface border border-border text-[13px] text-text focus:outline-none focus:border-accent/40 cursor-pointer"
          >
            {COMMON_CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            value={cadence}
            onChange={(e) => setCadence(e.target.value as RetainerCadence)}
            className="h-9 px-2 rounded-[8px] bg-surface border border-border text-[13px] text-text focus:outline-none focus:border-accent/40 cursor-pointer"
          >
            <option value="monthly">/ month</option>
            <option value="quarterly">/ quarter</option>
            <option value="project">per project</option>
          </select>
          <button
            onClick={save}
            disabled={saving}
            className="h-9 px-3 inline-flex items-center gap-1 rounded-[8px] bg-accent text-white text-[12.5px] font-medium hover:bg-accent-2 cursor-pointer disabled:opacity-60"
          >
            <Check className="w-3.5 h-3.5" />
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            onClick={() => {
              setEditing(false);
              setAmount(relationship.retainerAmount?.toString() ?? "");
            }}
            disabled={saving}
            className="h-9 px-2.5 inline-flex items-center gap-1 rounded-[8px] text-muted hover:text-text text-[12.5px] cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            Cancel
          </button>
          {hasRetainer && (
            <button
              onClick={clear}
              disabled={saving}
              className="ml-auto text-[11.5px] text-muted hover:text-red-600 cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}
