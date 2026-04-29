import { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "neutral" | "accent" | "teal" | "blue" | "green" | "amber" | "red" | "navy";

const tones: Record<Tone, string> = {
  neutral: "bg-surface-2 text-text border border-border",
  accent: "bg-accent/10 text-accent border border-accent/20",
  // legacy alias — same as accent
  teal: "bg-accent/10 text-accent border border-accent/20",
  blue: "bg-blue-soft/15 text-accent border border-accent/20",
  green: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20",
  amber: "bg-amber-500/10 text-amber-600 border border-amber-500/20",
  red: "bg-red-500/10 text-red-500 border border-red-500/20",
  navy: "bg-text text-bg",
};

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
