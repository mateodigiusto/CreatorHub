import { Card } from "@/components/ui/Card";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { Kpi } from "@/lib/mock/types";

export function KpiCard({ kpi }: { kpi: Kpi }) {
  const positive = kpi.delta >= 0;
  return (
    <Card lift>
      <div className="flex items-start justify-between">
        <div className="text-[12.5px] text-muted font-medium">{kpi.label}</div>
        <span
          className={cn(
            "inline-flex items-center gap-0.5 text-[11.5px] font-medium px-1.5 py-0.5 rounded-full",
            positive ? "text-emerald-700 bg-emerald-500/10" : "text-red-600 bg-red-500/10"
          )}
        >
          {positive ? (
            <ArrowUpRight className="w-3 h-3" />
          ) : (
            <ArrowDownRight className="w-3 h-3" />
          )}
          {positive ? "+" : ""}
          {kpi.delta}%
        </span>
      </div>
      <div className="mt-2 text-[28px] font-semibold tracking-[-0.02em] text-navy tabular-nums">
        {kpi.value}
      </div>
      <div className="text-[12px] text-muted mt-0.5">{kpi.deltaLabel}</div>
    </Card>
  );
}
