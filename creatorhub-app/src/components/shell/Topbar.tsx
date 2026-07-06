"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Plus, Sun, Moon, Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import { useAppState } from "@/lib/store";
import { IconButton } from "@/components/ui/IconButton";
import { Button } from "@/components/ui/Button";
import { AuthMenu } from "./AuthMenu";
import { RoleSwitcher } from "@/components/team/RoleSwitcher";
import { cn } from "@/lib/cn";

const titles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/analytics": "Analytics",
  "/ideas": "Ideas",
  "/library": "Asset Library",
  "/content": "Content",
  "/calendar": "Calendar",
  "/reports": "Reports",
  "/sequence-studio": "Sequence Studio",
  "/sequence-studio/new": "Create content",
  "/scripts": "Scripts",
  "/content-dna": "Transcribe & Analyze",
  "/clients": "Clients",
  "/production": "Production",
  "/team": "Team",
  "/settings": "Settings",
  "/integrations": "Integrations",
  "/help": "Help",
};

export function Topbar({
  onOpenMobileNav,
}: {
  onOpenMobileNav?: () => void;
} = {}) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useAppState();
  const title = titles[pathname] || "Dashboard";
  const [activeIntegrations, setActiveIntegrations] = useState<number | null>(null);

  /* Fetch real integration count once on mount. The pill is informational
     only — clicking goes to /integrations rather than toggling demo state. */
  useEffect(() => {
    let cancelled = false;
    fetch("/api/integrations", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { activeCount: number } | null) => {
        if (cancelled || !data) return;
        setActiveIntegrations(data.activeCount);
      })
      .catch(() => {
        /* ignore — pill stays in loading state */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const isConnected = (activeIntegrations ?? 0) > 0;
  const platformLabel = isConnected
    ? `${activeIntegrations} platform${activeIntegrations === 1 ? "" : "s"} connected`
    : "No platforms connected";

  return (
    <header
      className="h-14 sticky top-0 z-30 flex items-center justify-between gap-3 px-4 sm:px-6 border-b border-border"
      style={{
        background: "var(--surface-glass)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}
    >
      <div className="flex items-center gap-2 min-w-0">
        {/* Hamburger — mobile only */}
        <button
          onClick={onOpenMobileNav}
          className="lg:hidden w-8 h-8 grid place-items-center rounded-md text-text/80 hover:text-text hover:bg-surface-2 cursor-pointer -ml-1"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="text-[14px] sm:text-[13px] font-medium text-text truncate">
          {title}
        </span>
      </div>

      {/* Search — hidden below sm */}
      <div className="relative flex-1 max-w-[480px] hidden md:block">
        <Search className="w-3.5 h-3.5 text-muted absolute left-[11px] top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          placeholder="Search posts, ideas, reports…"
          className="w-full h-9 pl-9 pr-14 rounded-[10px] bg-surface border border-border text-[13.5px] text-text placeholder:text-muted focus:outline-none transition-colors"
        />
        <kbd
          className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center h-[22px] px-1.5 rounded-md text-[10.5px] font-medium text-muted bg-surface-2 border border-border"
        >
          ⌘K
        </kbd>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Demo role switcher — flip Owner ⇄ Editor in one click. */}
        <div className="hidden lg:block">
          <RoleSwitcher compact />
        </div>

        {/* Connection pill — links to /integrations. Reflects real
            integrations table state, not the legacy demo toggle. */}
        <Link
          href="/integrations"
          className={cn(
            "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[11.5px] font-medium border cursor-pointer transition-colors",
            isConnected
              ? "text-accent border-accent/20"
              : "text-muted border-border hover:text-text",
          )}
          style={
            isConnected
              ? { background: "rgba(37,99,235,0.10)" }
              : undefined
          }
          aria-label={platformLabel}
          title={platformLabel}
        >
          {isConnected ? (
            <>
              <span
                className="inline-block w-1.5 h-1.5 rounded-full"
                style={{
                  background: "#10B981",
                  boxShadow: "0 0 6px rgba(16,185,129,0.6)",
                }}
              />
              <span className="hidden sm:inline">{platformLabel}</span>
              <span className="sm:hidden">Live</span>
            </>
          ) : (
            <>
              <span className="hidden sm:inline">
                {activeIntegrations === null ? "Loading…" : "No platforms connected"}
              </span>
              <span className="sm:hidden">
                {activeIntegrations === null ? "…" : "Off"}
              </span>
            </>
          )}
        </Link>

        <IconButton
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? <Sun className="w-[15px] h-[15px]" /> : <Moon className="w-[15px] h-[15px]" />}
        </IconButton>

        <AuthMenu />

        <Button size="sm" className="hidden sm:inline-flex">
          <Plus className="w-3 h-3" /> New content
        </Button>
      </div>
    </header>
  );
}
