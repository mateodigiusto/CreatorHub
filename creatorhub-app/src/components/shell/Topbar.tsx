"use client";

import { Search, Bell, Plus, Sun, Moon } from "lucide-react";
import { usePathname } from "next/navigation";
import { useAppState } from "@/lib/store";
import { IconButton } from "@/components/ui/IconButton";
import { Button } from "@/components/ui/Button";
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
  "/settings": "Settings",
  "/integrations": "Integrations",
  "/help": "Help",
};

export function Topbar() {
  const pathname = usePathname();
  const { connected, setConnected, theme, toggleTheme } = useAppState();
  const title = titles[pathname] || "Dashboard";

  return (
    <header
      className="h-14 sticky top-0 z-30 flex items-center justify-between gap-4 px-6 border-b border-border"
      style={{
        background: "var(--surface-glass)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-[13px] text-muted">Workspace</span>
        <span className="text-[13px] text-muted">/</span>
        <span className="text-[13px] font-medium text-text">{title}</span>
      </div>

      <div className="relative flex-1 max-w-[480px]">
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

      <div className="flex items-center gap-2">
        <button
          onClick={() => setConnected(!connected)}
          className={cn(
            "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[11.5px] font-medium border cursor-pointer transition-colors",
            connected
              ? "text-accent border-accent/20"
              : "text-muted border-border hover:text-text"
          )}
          style={
            connected
              ? { background: "rgba(37,99,235,0.10)" }
              : undefined
          }
        >
          {connected ? (
            <>
              <span
                className="inline-block w-1.5 h-1.5 rounded-full"
                style={{
                  background: "#10B981",
                  boxShadow: "0 0 6px rgba(16,185,129,0.6)",
                }}
              />
              4 platforms connected
            </>
          ) : (
            <>No platforms connected</>
          )}
        </button>

        <IconButton
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? <Sun className="w-[15px] h-[15px]" /> : <Moon className="w-[15px] h-[15px]" />}
        </IconButton>

        <IconButton aria-label="Notifications" title="Notifications">
          <Bell className="w-[15px] h-[15px]" />
        </IconButton>

        <Button size="sm">
          <Plus className="w-3 h-3" /> New content
        </Button>
      </div>
    </header>
  );
}
