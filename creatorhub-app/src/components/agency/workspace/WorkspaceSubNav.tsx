"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

/**
 * The 8 client-facing tabs. Mirrors `/clients/[slug]/*` SubNav minus
 * `internal` (staff-only) and `settings` (handled by the agency).
 */
export const WORKSPACE_TABS = [
  { href: "/workspace/overview", label: "Overview" },
  { href: "/workspace/brand-build", label: "Brand Build" },
  { href: "/workspace/strategy", label: "Strategy" },
  { href: "/workspace/pipeline", label: "Pipeline" },
  { href: "/workspace/calendar", label: "Calendar" },
  { href: "/workspace/metrics", label: "Metrics" },
  { href: "/workspace/assets", label: "Assets" },
  { href: "/workspace/meetings", label: "Meetings" },
] as const;

export function WorkspaceSubNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Workspace sections"
      className="flex items-center gap-1 overflow-x-auto border-b border-border bg-surface/60 px-4"
    >
      {WORKSPACE_TABS.map((t) => {
        const active =
          pathname === t.href || pathname?.startsWith(t.href + "/");
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "relative whitespace-nowrap px-3 py-3 text-[13px] font-medium transition-colors",
              active
                ? "text-text"
                : "text-muted hover:text-text",
            )}
          >
            {t.label}
            {active && (
              <span className="absolute inset-x-3 bottom-0 h-[2px] rounded-full bg-accent" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
