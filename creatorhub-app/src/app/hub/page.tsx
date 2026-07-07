"use client";

import { useState } from "react";
import Link from "next/link";
import { UserPlus, ChevronRight, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { RevenueHero } from "@/components/hub/RevenueHero";
import { SelfTasksPanel } from "@/components/hub/SelfTasksPanel";
import { AddClientModal } from "@/components/hub/AddClientModal";
import { AiAssistant } from "@/components/hub/AiAssistant";
import {
  useClients,
  formatMoney,
  CLIENT_STATUS_LABEL,
  CLIENT_STATUS_TONE,
  type Client,
} from "@/lib/demo/clients";
import { useDemoTeam } from "@/lib/demo/team";
import { useAppState } from "@/lib/store";
import { displayNameFor } from "@/lib/onboarding/personalize";

function nextPaymentLabel(c: Client): string {
  if (c.status !== "active" || c.cadence !== "monthly") return "—";
  const d = new Date();
  const next = new Date(d.getFullYear(), d.getMonth() + 1, 2);
  return next.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function HubPage() {
  const { clients } = useClients();
  const { tasks } = useDemoTeam();
  const { profile } = useAppState();
  const [addOpen, setAddOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const firstName = displayNameFor(profile).split(" ")[0];

  const wipFor = (name: string) =>
    tasks.filter((t) => t.client === name && t.status !== "done").length;

  const activeCount = clients.filter((c) => c.status === "active").length;

  return (
    <>
      <PageHeader
        title={`Welcome back, ${firstName}`}
        description="Your business at a glance — what you're making and who you're making it for. Only you see this."
        actions={
          <>
            <Button variant="secondary" onClick={() => setAiOpen(true)}>
              <Sparkles className="w-4 h-4" /> Assistant
            </Button>
            <Button onClick={() => setAddOpen(true)}>
              <UserPlus className="w-4 h-4" /> Add client
            </Button>
          </>
        }
      />

      <RevenueHero />

      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-5 mt-5">
        {/* Clients */}
        <div className="bg-surface border border-border rounded-[14px] card-base overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
            <h3 className="text-[14px] font-semibold text-text">Clients</h3>
            <span className="text-[11.5px] text-muted">
              {activeCount} active · {clients.length} total
            </span>
          </div>

          <div className="hidden sm:grid grid-cols-[1.8fr_0.9fr_0.9fr_0.7fr_24px] gap-3 px-5 py-2 text-[11px] uppercase tracking-wide text-muted border-b border-border">
            <span>Client</span>
            <span>Retainer</span>
            <span>Next payment</span>
            <span>In progress</span>
            <span />
          </div>

          <ul className="list-none m-0 p-0 divide-y divide-border">
            {clients.map((c) => {
              const wip = wipFor(c.name);
              return (
                <li key={c.id}>
                  <Link
                    href={`/hub/${c.id}`}
                    className="grid grid-cols-[1fr_24px] sm:grid-cols-[1.8fr_0.9fr_0.9fr_0.7fr_24px] gap-3 items-center px-5 py-3 hover:bg-accent/[0.04] transition-colors"
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      <span
                        className="w-8 h-8 shrink-0 rounded-[9px] grid place-items-center text-white text-[12px] font-semibold"
                        style={{ background: c.avatar }}
                      >
                        {c.name.slice(0, 2).toUpperCase()}
                      </span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-2">
                          <span className="text-[13.5px] font-medium text-text truncate">
                            {c.name}
                          </span>
                          <Badge tone={CLIENT_STATUS_TONE[c.status]}>
                            {CLIENT_STATUS_LABEL[c.status]}
                          </Badge>
                        </span>
                        {c.company && (
                          <span className="block text-[11.5px] text-muted truncate">
                            {c.company}
                          </span>
                        )}
                      </span>
                    </span>
                    <span
                      className="hidden sm:block text-[13px] text-text-2"
                      style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                      {c.retainer
                        ? formatMoney(c.retainer) +
                          (c.cadence === "monthly" ? "/mo" : "")
                        : "—"}
                    </span>
                    <span className="hidden sm:block text-[13px] text-text-2">
                      {nextPaymentLabel(c)}
                    </span>
                    <span className="hidden sm:block">
                      {wip > 0 ? (
                        <span className="text-[12.5px] text-text-2">
                          {wip} task{wip > 1 ? "s" : ""}
                        </span>
                      ) : (
                        <span className="text-[12.5px] text-muted">—</span>
                      )}
                    </span>
                    <ChevronRight className="w-4 h-4 text-muted justify-self-end" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        <SelfTasksPanel />
      </div>

      <AddClientModal open={addOpen} onClose={() => setAddOpen(false)} />
      <AiAssistant open={aiOpen} onClose={() => setAiOpen(false)} />
    </>
  );
}
