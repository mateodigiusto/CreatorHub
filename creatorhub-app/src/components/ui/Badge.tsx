import { ReactNode, CSSProperties } from "react";
import { cn } from "@/lib/cn";

type Tone = "neutral" | "accent" | "teal" | "blue" | "green" | "amber" | "red" | "navy";

const toneStyles: Record<Tone, CSSProperties> = {
  neutral: {
    background: "var(--surface-2)",
    color: "var(--text)",
    border: "1px solid var(--border)",
  },
  accent: {
    background: "rgba(37, 99, 235, 0.10)",
    color: "var(--accent)",
    border: "1px solid rgba(37, 99, 235, 0.20)",
  },
  // Legacy alias — same as accent
  teal: {
    background: "rgba(37, 99, 235, 0.10)",
    color: "var(--accent)",
    border: "1px solid rgba(37, 99, 235, 0.20)",
  },
  blue: {
    background: "rgba(96, 165, 250, 0.15)",
    color: "var(--accent)",
    border: "1px solid rgba(37, 99, 235, 0.20)",
  },
  green: {
    background: "rgba(16, 185, 129, 0.10)",
    color: "#047857",
    border: "1px solid rgba(16, 185, 129, 0.20)",
  },
  amber: {
    background: "rgba(245, 158, 11, 0.10)",
    color: "#B45309",
    border: "1px solid rgba(245, 158, 11, 0.20)",
  },
  red: {
    background: "rgba(239, 68, 68, 0.10)",
    color: "#DC2626",
    border: "1px solid rgba(239, 68, 68, 0.20)",
  },
  navy: {
    background: "var(--text)",
    color: "var(--bg)",
    border: "1px solid var(--text)",
  },
};

export function Badge({
  children,
  tone = "neutral",
  className,
  style,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-[9px] py-[3px] text-[11px] font-medium",
        className
      )}
      style={{ ...toneStyles[tone], ...style }}
    >
      {children}
    </span>
  );
}
