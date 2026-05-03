"use client";

import { ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

type Props = {
  active: boolean;
  onClick: () => void;
  name: string;
  tagline: string;
  /* Display-ready price strings — caller computes them from cycle. */
  priceTop: string;       // e.g. "$67"   or "$27"
  priceUnit: string;      // e.g. "/mo"   or "/mo · billed yearly"
  /* Annual badge ("60% off") — only shown on annual cycle. */
  discountBadge?: ReactNode;
  features: string[];
  recommended?: boolean;
};

export function PlanCard({
  active,
  onClick,
  name,
  tagline,
  priceTop,
  priceUnit,
  discountBadge,
  features,
  recommended,
}: Props) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "lift relative text-left rounded-[16px] border bg-surface card-base p-5 cursor-pointer transition-colors",
        active
          ? "border-accent/55 bg-accent-soft ring-2 ring-accent/15"
          : "border-border hover:border-accent/25",
      )}
    >
      {recommended && !active && (
        <span className="absolute top-3 right-3 text-[10px] font-semibold uppercase text-accent bg-accent-soft border border-accent-border px-1.5 py-0.5 rounded tracking-wide">
          Recommended
        </span>
      )}
      {active && (
        <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-accent text-white grid place-items-center">
          <Check className="w-3 h-3" strokeWidth={3} />
        </span>
      )}
      <div className="text-[15px] font-semibold text-text">{name}</div>
      <div className="text-[12px] text-muted mt-0.5 leading-snug">{tagline}</div>
      <div className="mt-4 flex items-baseline gap-1">
        <span className="text-[28px] font-semibold tracking-[-0.02em] text-text tabular-nums">
          {priceTop}
        </span>
        <span className="text-[12.5px] text-muted">{priceUnit}</span>
      </div>
      {discountBadge && <div className="mt-1.5">{discountBadge}</div>}
      <ul className="mt-4 space-y-1.5">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-[12.5px] text-text/85 leading-snug">
            <Check className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
    </button>
  );
}
