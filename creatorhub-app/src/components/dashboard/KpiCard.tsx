import { Card } from "@/components/ui/Card";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { Kpi } from "@/lib/mock/types";
import { MiniSpark } from "@/components/charts/MiniSpark";

export function KpiCard({
  kpi,
  trend,
}: {
  kpi: Kpi;
  trend?: number[];
}) {
  const positive = kpi.delta >= 0;
  return (
    <Card lift>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[12.5px] text-muted font-medium">{kpi.label}</span>
        {kpi.delta !== 0 && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-[11.5px] font-medium px-[7px] py-[2px] rounded-full",
              positive
                ? "text-emerald-700 bg-emerald-500/10"
                : "text-red-600 bg-red-500/10"
            )}
          >
            {positive ? (
              <ArrowUpRight className="w-2.5 h-2.5" />
            ) : (
              <ArrowDownRight className="w-2.5 h-2.5" />
            )}
            {positive ? "+" : ""}
            {kpi.delta}%
          </span>
        )}
      </div>
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-[28px] font-semibold tracking-[-0.02em] text-text tabular-nums leading-none">
            {kpi.value}
          </div>
          <div className="text-[12px] text-muted mt-0.5">{kpi.deltaLabel}</div>
        </div>
        {trend && trend.length > 0 && <MiniSpark values={trend} />}
      </div>
    </Card>
  );
}
