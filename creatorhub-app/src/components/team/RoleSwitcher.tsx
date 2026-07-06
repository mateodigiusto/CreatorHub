"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Check, FlaskConical } from "lucide-react";
import { cn } from "@/lib/cn";
import { useAppState } from "@/lib/store";
import {
  useDemoTeam,
  hasFullAppAccess,
  ROLE_LABEL,
  type DemoRole,
} from "@/lib/demo/team";

const ROLES: DemoRole[] = ["owner", "admin", "manager", "editor"];

const ROLE_HINT: Record<DemoRole, string> = {
  owner: "Full app + manage roles",
  admin: "Full app + manage roles",
  manager: "Full app + production",
  editor: "Editor Portal only",
};

/**
 * Demo control: flip the acting role in one click. Switching to Editor sends
 * you into the restricted Editor Portal; switching to a full-app role lands
 * on Production. The whole roles demo hinges on this being one click.
 */
export function RoleSwitcher({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const { role, setRole, me } = useDemoTeam();
  const { showToast } = useAppState();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (open && ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  function pick(next: DemoRole) {
    setOpen(false);
    if (next === role) return;
    setRole(next);
    showToast(`Now viewing as ${ROLE_LABEL[next]}`);
    router.push(hasFullAppAccess(next) ? "/production" : "/editor-portal");
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "inline-flex items-center gap-2 rounded-[10px] border border-border bg-surface hover:border-accent/40 transition-colors cursor-pointer",
          compact ? "h-8 px-2.5 text-[12.5px]" : "h-9 px-3 text-[13px]",
        )}
        aria-label="Switch demo role"
      >
        <FlaskConical className="w-3.5 h-3.5 text-accent" />
        <span className="text-muted">Viewing as</span>
        <span className="font-medium text-text">{ROLE_LABEL[role]}</span>
        <ChevronDown
          className={cn(
            "w-3.5 h-3.5 text-muted transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+6px)] z-50 w-[260px] rounded-[12px] bg-surface border border-border shadow-[0_16px_40px_-12px_rgba(7,17,31,0.28)] p-1.5">
          <div className="px-2.5 py-1.5 text-[10.5px] uppercase tracking-wider font-semibold text-muted">
            Demo · switch role
          </div>
          {ROLES.map((r) => {
            const active = r === role;
            return (
              <button
                key={r}
                onClick={() => pick(r)}
                className={cn(
                  "w-full flex items-start gap-2.5 px-2.5 py-2 rounded-[8px] text-left cursor-pointer transition-colors",
                  active ? "bg-accent-soft" : "hover:bg-surface-2",
                )}
              >
                <span className="w-4 mt-0.5 shrink-0">
                  {active && <Check className="w-3.5 h-3.5 text-accent" />}
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-medium text-text">
                    {ROLE_LABEL[r]}
                  </span>
                  <span className="block text-[11.5px] text-muted">
                    {ROLE_HINT[r]}
                  </span>
                </span>
              </button>
            );
          })}
          {me && (
            <div className="px-2.5 py-1.5 mt-1 border-t border-border text-[11px] text-muted">
              Acting as <span className="text-text-2 font-medium">{me.name}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
