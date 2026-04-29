"use client";

import { Search, Bell, Plus, WifiOff } from "lucide-react";
import { useAppState } from "@/lib/store";
import { StatusDot } from "@/components/ui/StatusDot";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { cn } from "@/lib/cn";

export function Topbar() {
  const { connected, setConnected } = useAppState();
  return (
    <header className="h-16 border-b border-border bg-bg/70 backdrop-blur-xl sticky top-0 z-30 flex items-center px-8 gap-4">
      <div className="relative w-[380px] max-w-full">
        <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          placeholder="Search posts, ideas, reports…"
          className="w-full h-9 pl-9 pr-14 rounded-[10px] bg-surface/80 border border-border text-[13.5px] text-text placeholder:text-muted focus:outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/20 focus:bg-surface transition-colors"
        />
        <kbd className="absolute right-2 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center h-6 px-1.5 rounded-[6px] bg-surface-2 text-[10.5px] text-muted font-medium border border-border">
          ⌘K
        </kbd>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={() => setConnected(!connected)}
          className={cn(
            "h-9 px-3 rounded-[10px] text-[12.5px] font-medium border inline-flex items-center gap-2 transition-colors",
            connected
              ? "bg-accent/[0.08] text-accent border-accent/25 hover:bg-accent/[0.14]"
              : "bg-surface text-muted border-border hover:border-text-muted hover:text-text"
          )}
        >
          {connected ? (
            <>
              <StatusDot tone="accent" size={6} />
              Instagram connected
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5" />
              Connect Instagram
            </>
          )}
        </button>

        <ThemeToggle />

        <button className="h-9 w-9 grid place-items-center rounded-[10px] bg-surface/80 border border-border text-muted hover:text-text hover:border-text-muted transition-colors">
          <Bell className="w-4 h-4" />
        </button>

        <button className="h-9 px-3.5 rounded-[10px] bg-accent text-white text-[13px] font-medium inline-flex items-center gap-2 hover:bg-accent-2 active:scale-[0.97] transition-[transform,background-color] duration-150">
          <Plus className="w-4 h-4" />
          New
        </button>
      </div>
    </header>
  );
}
