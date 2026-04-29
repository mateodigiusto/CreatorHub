"use client";

import { Sun, Moon } from "lucide-react";
import { useAppState } from "@/lib/store";

export function ThemeToggle() {
  const { theme, toggleTheme } = useAppState();
  const isDark = theme === "dark";
  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="h-9 w-9 grid place-items-center rounded-[10px] bg-surface/80 border border-border text-muted hover:text-text hover:border-accent/40 hover:bg-accent/[0.04] transition-colors"
    >
      {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}
