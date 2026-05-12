"use client";

/**
 * Top-left client switcher for editors.
 *
 * Visible only when `profile.creatorType === 'editor'`. Sets the global
 * `currentClient` in store — every API route that reads user-scoped data
 * checks for `?relationship_id=<id>` and, when present, re-scopes the
 * read to the client's data (after verifying the editor still has an
 * active manager relationship to them via RLS).
 *
 * The switcher does NOT navigate — picking a client keeps the current
 * page; data on that page just re-fetches against the client's account.
 * "All clients" exits client mode and shows the editor's own data again.
 *
 * Affected surfaces (so far): /content, /calendar via /api/sequences.
 * Other surfaces (assets, library, scripts) light up as their API routes
 * adopt the same `?relationship_id` pattern.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, Users, Check } from "lucide-react";
import { useAppState } from "@/lib/store";
import { cn } from "@/lib/cn";
import type { RelationshipSummary } from "@/lib/clients/types";

export function ClientSwitcher() {
  const { profile, currentClient, setCurrentClient, showToast } = useAppState();
  const [open, setOpen] = useState(false);
  const [relationships, setRelationships] = useState<RelationshipSummary[] | null>(null);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const isEditor = profile?.creatorType === "editor";

  /* Lazy-load the client list the first time the dropdown opens. */
  const ensureLoaded = useCallback(async () => {
    if (relationships !== null || loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/clients", { credentials: "include" });
      if (!res.ok) {
        setRelationships([]);
        return;
      }
      const json = (await res.json()) as { relationships: RelationshipSummary[] };
      /* Editors are always the manager side; show only active rows. */
      setRelationships(
        json.relationships.filter(
          (r) => r.perspective === "manager" && r.status === "active",
        ),
      );
    } catch {
      setRelationships([]);
    } finally {
      setLoading(false);
    }
  }, [relationships, loading]);

  /* Close on outside click. */
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  if (!isEditor) return null;

  const buttonLabel = currentClient ? currentClient.name : "Svi klijenti";

  function pickClient(r: RelationshipSummary) {
    setCurrentClient({
      relationshipId: r.id,
      name: r.counterpartyName ?? r.counterpartyEmail ?? "Client",
    });
    setOpen(false);
    showToast(
      `Acting as ${r.counterpartyName ?? r.counterpartyEmail ?? "client"}`,
    );
  }

  function exitClientMode() {
    setCurrentClient(null);
    setOpen(false);
    showToast("Switched to all-clients view");
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next) void ensureLoaded();
        }}
        className={cn(
          "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[12px] font-medium border cursor-pointer transition-colors",
          currentClient
            ? "text-accent border-accent/25 bg-accent-soft"
            : "text-text/80 border-border hover:border-accent/30 hover:text-text",
        )}
      >
        <Users className="w-3.5 h-3.5" />
        <span className="max-w-[160px] truncate">{buttonLabel}</span>
        <ChevronDown className="w-3 h-3 opacity-60" />
      </button>

      {open && (
        <div
          className="absolute left-0 top-9 z-40 w-[280px] rounded-[12px] border border-border bg-surface shadow-[var(--shadow-card)] overflow-hidden"
          style={{ background: "var(--surface)" }}
        >
          <div className="px-3 py-2 border-b border-border bg-surface-2">
            <div className="text-[10.5px] uppercase font-semibold text-muted tracking-wider">
              Switch workspace
            </div>
          </div>

          <button
            onClick={exitClientMode}
            className={cn(
              "w-full flex items-center justify-between gap-2 px-3 py-2 text-[13px] text-left transition-colors cursor-pointer",
              !currentClient
                ? "bg-accent-soft text-accent"
                : "text-text/80 hover:bg-surface-2 hover:text-text",
            )}
          >
            <span className="font-medium">Svi klijenti</span>
            {!currentClient && <Check className="w-3.5 h-3.5 text-accent shrink-0" />}
          </button>

          <div className="max-h-[320px] overflow-y-auto">
            {loading && (
              <div className="px-3 py-3 text-[12.5px] text-muted">Loading…</div>
            )}
            {!loading && relationships?.length === 0 && (
              <div className="px-3 py-3 text-[12.5px] text-muted">
                No active clients yet. Invite one from the Clients page.
              </div>
            )}
            {relationships?.map((r) => {
              const active = currentClient?.relationshipId === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => pickClient(r)}
                  className={cn(
                    "w-full flex items-center justify-between gap-2 px-3 py-2 text-[13px] text-left transition-colors cursor-pointer",
                    active
                      ? "bg-accent-soft text-accent"
                      : "text-text/80 hover:bg-surface-2 hover:text-text",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">
                      {r.counterpartyName ?? r.counterpartyEmail ?? "Client"}
                    </div>
                    {r.counterpartyEmail && r.counterpartyName && (
                      <div className="text-[11px] text-muted truncate">
                        {r.counterpartyEmail}
                      </div>
                    )}
                  </div>
                  {active && <Check className="w-3.5 h-3.5 text-accent shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
