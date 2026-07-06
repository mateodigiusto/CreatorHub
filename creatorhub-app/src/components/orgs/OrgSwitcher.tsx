"use client";

/**
 * Multi-org switcher (Phase 9). Mounts in the sidebar header, below the
 * wordmark. Self-contained — fetches `/api/organizations/mine` on first
 * open.
 *
 * Renders against the dark sidebar background, so all colors are
 * translucent-white rather than theme tokens.
 *
 * - One org   → still renders (shows the active org name + lets the user
 *               create another from the dropdown).
 * - Many orgs → lists each with a role badge; clicking an inactive one
 *               POSTs /switch then hard-reloads into that org.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronsUpDown, Check, Plus, Building2, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { useAppState } from "@/lib/store";
import { CreateOrgDialog } from "./CreateOrgDialog";
import type { OrgSummary } from "@/lib/orgs/types";

/** Where to land after entering an org — agencies live in /clients,
 *  solo accounts in /dashboard. */
function landingFor(kind: OrgSummary["kind"]): string {
  return kind === "agency" ? "/clients" : "/dashboard";
}

export function OrgSwitcher() {
  const { showToast } = useAppState();
  const [orgs, setOrgs] = useState<OrgSummary[] | null>(null);
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/organizations/mine", {
        credentials: "include",
      });
      if (!res.ok) {
        setOrgs([]);
        return;
      }
      const json = (await res.json()) as { organizations: OrgSummary[] };
      setOrgs(json.organizations);
    } catch {
      setOrgs([]);
    }
  }, []);

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --- one-shot bootstrap */
    void load();
  }, [load]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  /* Nothing to show until the fetch resolves, and nothing to show if the
     user has no memberships (they'd be mid-onboarding). */
  if (orgs === null || orgs.length === 0) return null;

  const active = orgs.find((o) => o.isActive) ?? orgs[0];

  async function switchTo(org: OrgSummary) {
    if (org.isActive || switching) return;
    setSwitching(org.id);
    try {
      const res = await fetch("/api/organizations/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ organizationId: org.id }),
      });
      if (!res.ok) {
        setSwitching(null);
        showToast("Couldn't switch organization. Try again.");
        return;
      }
      /* Hard reload so every server component re-resolves the session
         against the new active-org cookie. Land on the surface that
         matches the org kind. */
      window.location.assign(landingFor(org.kind));
    } catch {
      setSwitching(null);
      showToast("Network error. Try again.");
    }
  }

  return (
    <div className="relative px-1 pt-3" ref={wrapRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-[8px] text-left transition-colors cursor-pointer hover:bg-white/10"
      >
        <span className="w-6 h-6 rounded-md grid place-items-center bg-white/10 border border-white/15 text-white/80 shrink-0">
          <Building2 className="w-3.5 h-3.5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[12.5px] font-medium text-white/90 truncate">
            {active.name}
          </span>
          <span className="block text-[10.5px] text-white/45 truncate capitalize">
            {active.kind} · {active.role}
            {active.isAdmin ? " · admin" : ""}
          </span>
        </span>
        <ChevronsUpDown className="w-3.5 h-3.5 text-white/40 shrink-0" />
      </button>

      {open && (
        <div className="absolute left-1 right-1 top-[calc(100%+4px)] z-50 rounded-[10px] bg-surface border border-border shadow-[0_16px_40px_-8px_rgba(7,17,31,0.45)] py-1 overflow-hidden">
          <div className="px-3 py-1.5 text-[10px] uppercase font-semibold text-muted tracking-wider">
            {orgs.length === 1 ? "Organization" : `${orgs.length} organizations`}
          </div>
          <div className="max-h-[280px] overflow-y-auto">
            {orgs.map((org) => (
              <button
                key={org.id}
                onClick={() => switchTo(org)}
                disabled={!!switching}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 text-left transition-colors",
                  org.isActive
                    ? "bg-accent/[0.06]"
                    : "hover:bg-surface-2 cursor-pointer",
                )}
              >
                <span className="w-6 h-6 rounded-md grid place-items-center bg-surface-2 border border-border text-muted shrink-0">
                  <Building2 className="w-3 h-3" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-medium text-text truncate">
                    {org.name}
                  </span>
                  <span className="block text-[11px] text-muted truncate capitalize">
                    {org.role}
                    {org.isAdmin ? " · admin" : ""} · {org.plan}
                  </span>
                </span>
                {switching === org.id ? (
                  <Loader2 className="w-3.5 h-3.5 text-muted animate-spin shrink-0" />
                ) : org.isActive ? (
                  <Check className="w-3.5 h-3.5 text-accent shrink-0" />
                ) : null}
              </button>
            ))}
          </div>
          <div className="border-t border-border mt-1 pt-1">
            <button
              onClick={() => {
                setOpen(false);
                setShowCreate(true);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-text hover:bg-surface-2 cursor-pointer"
            >
              <span className="w-6 h-6 rounded-md grid place-items-center bg-surface-2 border border-border text-muted shrink-0">
                <Plus className="w-3.5 h-3.5" />
              </span>
              Create new organization
            </button>
          </div>
        </div>
      )}

      {showCreate && <CreateOrgDialog onClose={() => setShowCreate(false)} />}
    </div>
  );
}
