"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { DemoBadge } from "@/components/ui/DemoBadge";
import { AiCallout } from "@/components/ui/AiCallout";
import { Tabs } from "@/components/ui/Tabs";
import { useAppState } from "@/lib/store";
import { ideas, aiInsights } from "@/lib/mock/data";
import { Wand2, Bookmark, ArrowRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { PlanContentDrawer } from "@/components/plan/PlanContentDrawer";

const estimatedReach: Record<string, string> = {
  i1: "120K",
  i2: "60K",
  i3: "42K",
  i4: "98K",
  i5: "55K",
  i6: "30K",
};

export default function IdeasPage() {
  const { connected } = useAppState();
  const [tab, setTab] = useState<"all" | "saved">("all");
  const [savedSet, setSavedSet] = useState<Set<string>>(
    new Set(ideas.filter((i) => i.saved).map((i) => i.id))
  );
  const [planOpen, setPlanOpen] = useState(false);

  if (!connected) {
    return (
      <>
        <PageHeader title="Ideas" description="Turn data into next content." />
        <EmptyState
          title="No ideas yet."
          description="Once your analytics are connected, CreatorHub will suggest content ideas based on what already works."
          primaryAction={{ label: "Connect a platform" }}
        />
      </>
    );
  }

  const toggle = (id: string) =>
    setSavedSet((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const visible =
    tab === "all" ? ideas : ideas.filter((i) => savedSet.has(i.id));

  return (
    <>
      <DemoBadge />
      <PageHeader
        title="Ideas"
        description="AI-generated hooks aligned with your last 30 days of performance."
        actions={
          <>
            <Tabs
              value={tab}
              onChange={(v) => setTab(v as typeof tab)}
              options={[
                { value: "all", label: "All" },
                { value: "saved", label: `Saved (${savedSet.size})` },
              ]}
            />
            <Button size="md" onClick={() => setPlanOpen(true)}>
              <Wand2 className="w-3.5 h-3.5" /> Generate ideas
            </Button>
          </>
        }
      />

      <AiCallout body={aiInsights.ideas} cta="See the reasoning" />

      <div className="grid grid-cols-2 gap-4 mt-4">
        {visible.map((idea) => {
          const saved = savedSet.has(idea.id);
          return (
            <Card key={idea.id} lift>
              <div className="flex items-start justify-between gap-3 mb-2">
                <Badge tone="neutral">{idea.format}</Badge>
                <button
                  onClick={() => toggle(idea.id)}
                  title={saved ? "Saved" : "Save idea"}
                  className={cn(
                    "w-7 h-7 grid place-items-center rounded-[8px] border transition-colors cursor-pointer",
                    saved
                      ? "border-accent/20 text-accent"
                      : "border-border text-muted hover:text-text"
                  )}
                  style={
                    saved ? { background: "rgba(37,99,235,0.10)" } : undefined
                  }
                >
                  <Bookmark
                    className={cn(
                      "w-3.5 h-3.5",
                      saved && "fill-accent"
                    )}
                  />
                </button>
              </div>
              <h3 className="text-[15.5px] leading-[1.35] font-semibold tracking-[-0.005em] text-text mt-1 mb-1.5">
                {idea.title}
              </h3>
              <p className="text-[12.5px] text-muted leading-relaxed">
                {idea.source}
              </p>

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                <div className="flex items-center gap-2.5">
                  <ScoreRing score={idea.score} />
                  <div>
                    <div className="text-[12px] text-muted">Match score</div>
                    <div className="text-[13px] text-text font-medium">
                      Est. reach {estimatedReach[idea.id] ?? "—"}
                    </div>
                  </div>
                </div>
                <Button size="sm" variant="outline">
                  Open <ArrowRight className="w-3 h-3" />
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      <PlanContentDrawer
        open={planOpen}
        onClose={() => setPlanOpen(false)}
        entry="ideas"
        initialTab="story"
      />
    </>
  );
}

function ScoreRing({ score }: { score: number }) {
  const r = 14;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  return (
    <svg width={36} height={36} viewBox="0 0 36 36">
      <circle
        cx={18}
        cy={18}
        r={r}
        fill="none"
        stroke="var(--surface-2)"
        strokeWidth={3}
      />
      <circle
        cx={18}
        cy={18}
        r={r}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={3}
        strokeDasharray={c}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 18 18)"
      />
      <text
        x={18}
        y={21}
        textAnchor="middle"
        fontSize="10"
        fontWeight={600}
        fill="var(--text)"
        fontFamily="inherit"
      >
        {score}
      </text>
    </svg>
  );
}
