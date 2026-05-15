import { Card, CardHeader } from "@/components/ui/Card";

function Meter({
  label,
  used,
  max,
}: {
  label: string;
  used: number;
  max: number;
}) {
  const unlimited = !Number.isFinite(max);
  const pct = unlimited ? Math.min(1, used > 0 ? 0.04 : 0) : Math.min(1, Math.max(0, used / Math.max(1, max)));
  const tone =
    !unlimited && used >= max
      ? "var(--error)"
      : !unlimited && pct >= 0.8
        ? "var(--warning)"
        : "var(--accent)";
  const display = unlimited ? `${used.toLocaleString()} / Unlimited` : `${used.toLocaleString()} / ${max.toLocaleString()}`;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <div className="text-[13px] text-text">{label}</div>
        <div
          className="text-[12.5px] text-muted"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {display}
        </div>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{
            width: `${Math.round(pct * 100)}%`,
            background: tone,
          }}
        />
      </div>
    </div>
  );
}

export function UsageCard({
  clientsUsed,
  clientsMax,
  monthlyViewsUsed,
  monthlyViewsMax,
}: {
  clientsUsed: number;
  clientsMax: number;
  monthlyViewsUsed: number;
  monthlyViewsMax: number;
}) {
  return (
    <Card>
      <CardHeader title="Usage" description="Resets at the start of each month." />
      <div className="flex flex-col gap-4">
        <Meter label="Clients" used={clientsUsed} max={clientsMax} />
        <Meter label="Monthly views" used={monthlyViewsUsed} max={monthlyViewsMax} />
      </div>
    </Card>
  );
}
