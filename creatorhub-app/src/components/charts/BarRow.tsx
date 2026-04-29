export function BarRow({
  label,
  value,
  max,
  suffix = "",
  labelWidth = 120,
}: {
  label: string;
  value: number;
  max: number;
  suffix?: string;
  labelWidth?: number;
}) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div
      className="grid items-center gap-3"
      style={{ gridTemplateColumns: `${labelWidth}px 1fr 64px` }}
    >
      <span className="text-[13px] text-text">{label}</span>
      <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: "linear-gradient(90deg, #0B1F3A, #1B4FD4)",
          }}
        />
      </div>
      <span className="text-[12.5px] text-muted text-right tabular-nums">
        {value.toLocaleString()}
        {suffix}
      </span>
    </div>
  );
}
