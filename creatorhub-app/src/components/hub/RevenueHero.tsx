"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { AreaChart } from "@/components/charts/AreaChart";
import { Button } from "@/components/ui/Button";
import {
  useClients,
  formatMoney,
  mrr,
  totalCollected,
  thisMonthCollected,
  monthlyRevenueSeries,
} from "@/lib/demo/clients";
import { LogPaymentModal } from "./LogPaymentModal";

export function RevenueHero() {
  const { clients, payments } = useClients();
  const [logOpen, setLogOpen] = useState(false);
  const [months, setMonths] = useState<6 | 12>(6);

  const total = totalCollected(payments);
  const thisMonth = thisMonthCollected(payments);
  const recurring = mrr(clients);
  const series = monthlyRevenueSeries(payments, months);
  const peak = Math.max(...series.map((p) => p.y), 0);

  return (
    <>
      <div className="bg-surface border border-border rounded-[14px] card-base overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-4 p-5 pb-2">
          <div>
            <div className="text-[12.5px] font-medium text-muted">
              Collected all-time
            </div>
            <div
              className="text-[34px] font-semibold text-text tracking-[-0.02em] leading-tight mt-0.5"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {formatMoney(total)}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-[9px] border border-border bg-surface-2 p-0.5">
              {([6, 12] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMonths(m)}
                  className={
                    "px-2.5 h-7 rounded-[7px] text-[12px] font-medium cursor-pointer transition-colors " +
                    (months === m
                      ? "bg-surface text-text shadow-sm"
                      : "text-muted hover:text-text")
                  }
                >
                  {m}M
                </button>
              ))}
            </div>
            <Button size="sm" variant="secondary" onClick={() => setLogOpen(true)}>
              <Plus className="w-3.5 h-3.5" /> Log payment
            </Button>
          </div>
        </div>

        <div className="px-2">
          <AreaChart data={series} height={200} />
        </div>

        <div className="grid grid-cols-3 divide-x divide-border border-t border-border">
          <Stat label="This month" value={formatMoney(thisMonth)} />
          <Stat label="Recurring / mo (MRR)" value={formatMoney(recurring)} accent />
          <Stat label="Best month" value={formatMoney(peak)} />
        </div>
      </div>

      <LogPaymentModal open={logOpen} onClose={() => setLogOpen(false)} />
    </>
  );
}

function Stat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="px-5 py-3.5">
      <div className="text-[11.5px] text-muted">{label}</div>
      <div
        className={
          "text-[18px] font-semibold tracking-[-0.01em] mt-0.5 " +
          (accent ? "text-accent" : "text-text")
        }
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {value}
      </div>
    </div>
  );
}
