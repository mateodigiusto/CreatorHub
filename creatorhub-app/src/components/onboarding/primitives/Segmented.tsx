"use client";

import { cn } from "@/lib/cn";

type Opt<T extends string> = { key: T; label: string; description?: string };

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T | undefined;
  options: Opt<T>[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => {
        const active = value === o.key;
        return (
          <button
            key={o.key}
            onClick={() => onChange(o.key)}
            className={cn(
              "h-12 rounded-[10px] border text-[13.5px] font-semibold cursor-pointer transition-colors",
              active
                ? "border-accent/45 bg-accent-soft text-text"
                : "border-border bg-surface text-text/70 hover:border-accent/25 hover:text-text"
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
