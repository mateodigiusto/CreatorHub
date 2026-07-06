"use client";

export function ProgressBar({
  step,
  total,
}: {
  step: number;
  total: number;
}) {
  const pct = Math.min(100, Math.max(0, Math.round(((step + 1) / total) * 100)));
  return (
    <div className="w-full">
      <div className="flex items-baseline justify-between text-[11.5px] mb-1.5">
        <span className="text-muted tabular-nums">
          Step <span className="text-text font-semibold">{step + 1}</span> of {total}
        </span>
        <span className="text-muted tabular-nums">{pct}%</span>
      </div>
      <div className="h-[3px] w-full rounded-full bg-surface-2 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${pct}%`,
            background: "linear-gradient(90deg, var(--accent), var(--accent-2))",
          }}
        />
      </div>
    </div>
  );
}
