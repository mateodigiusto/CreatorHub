"use client";

import { ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

type Props = {
  active: boolean;
  onClick: () => void;
  title: string;
  description?: string;
  icon?: ReactNode;
  /* Optional badge ("Primary", "Recommended") in the top-right. */
  badge?: ReactNode;
  /* When in multi-select mode, show a checkmark instead of a single-pick highlight. */
  multi?: boolean;
  size?: "sm" | "md" | "lg";
};

export function PickCard({
  active,
  onClick,
  title,
  description,
  icon,
  badge,
  multi,
  size = "md",
}: Props) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "lift relative text-left rounded-[14px] border bg-surface card-base cursor-pointer transition-colors group",
        size === "sm" && "p-3.5",
        size === "md" && "p-4",
        size === "lg" && "p-5",
        active
          ? "border-accent/45 bg-accent-soft"
          : "border-border hover:border-accent/25"
      )}
    >
      {multi && (
        <span
          className={cn(
            "absolute top-2.5 right-2.5 w-4 h-4 rounded grid place-items-center transition-colors",
            active
              ? "bg-accent text-white"
              : "bg-surface-2 border border-border text-transparent"
          )}
        >
          <Check className="w-2.5 h-2.5" />
        </span>
      )}
      {badge && !multi && (
        <span className="absolute top-2.5 right-2.5">{badge}</span>
      )}
      {icon && (
        <div
          className={cn(
            "w-9 h-9 rounded-lg grid place-items-center mb-3 transition-colors",
            active
              ? "bg-accent text-white"
              : "bg-surface-2 text-text/70 border border-border"
          )}
        >
          {icon}
        </div>
      )}
      <div className="text-[14px] font-semibold text-text leading-tight">
        {title}
      </div>
      {description && (
        <div className="text-[12px] text-muted leading-snug mt-1">
          {description}
        </div>
      )}
    </button>
  );
}
