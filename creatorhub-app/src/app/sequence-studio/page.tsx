"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Thumb } from "@/components/ui/Thumb";
import { useAppState } from "@/lib/store";
import { Wand2, Image as ImageIcon, Settings as SettingsIcon, Play } from "lucide-react";
import { PlanContentDrawer } from "@/components/plan/PlanContentDrawer";

export default function SequenceStudioPage() {
  const { extraPosts } = useAppState();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const generated = extraPosts.filter((p) => p.id.startsWith("gen-"));

  return (
    <>
      <PageHeader
        title="Sequence Studio"
        description="Turn assets, brand context, and a goal into a ready-to-publish sequence."
        actions={
          <Button size="md" onClick={() => setDrawerOpen(true)}>
            <Wand2 className="w-3.5 h-3.5" /> Start a sequence
          </Button>
        }
      />

      <div className="grid grid-cols-3 gap-4 mb-5">
        <StepCard
          step="01"
          icon={<ImageIcon className="w-3.5 h-3.5" />}
          title="Pick assets"
          description="Choose 3–5 photos or proof assets. Sequence Studio scores each on mood, scene, and aesthetic."
        />
        <StepCard
          step="02"
          icon={<SettingsIcon className="w-3.5 h-3.5" />}
          title="Set direction"
          description="Pick a goal (Get DMs, Build authority, Sell offer…), sequence type, and style. Adds your brand context."
        />
        <StepCard
          step="03"
          icon={<Play className="w-3.5 h-3.5" />}
          title="Generate & ship"
          description="Get a 5-slide sequence (Hook → Context → Proof → Insight → CTA). Move to Content or schedule it."
        />
      </div>

      <Card>
        <CardHeader
          title="Recent sequences"
          description={
            generated.length === 0
              ? "Sequences you generate will show up here."
              : `${generated.length} generated this session`
          }
          action={
            <Button variant="ghost" size="sm" onClick={() => setDrawerOpen(true)}>
              <Wand2 className="w-3 h-3" /> New sequence
            </Button>
          }
        />
        {generated.length === 0 ? (
          <div className="border border-dashed border-border rounded-[12px] py-10 px-6 flex flex-col items-center text-center">
            <div className="w-11 h-11 rounded-xl grid place-items-center mb-3 text-white" style={{
              background: "linear-gradient(135deg, #14315E, #0B1F3A)",
              boxShadow: "0 4px 12px rgba(11,31,58,0.30)",
            }}>
              <Wand2 className="w-5 h-5" />
            </div>
            <h3 className="text-[15px] font-semibold text-text">No sequences yet</h3>
            <p className="text-[13px] text-muted mt-1.5 max-w-md leading-relaxed">
              Click <span className="text-text font-medium">Start a sequence</span> to upload or pick assets and generate your first sequence in 3 steps.
            </p>
            <Button size="md" className="mt-5" onClick={() => setDrawerOpen(true)}>
              <Wand2 className="w-3.5 h-3.5" /> Start a sequence
            </Button>
          </div>
        ) : (
          <ul className="grid grid-cols-3 gap-3 list-none p-0 m-0">
            {generated.map((p) => (
              <li
                key={p.id}
                className="lift bg-surface border border-border rounded-[12px] p-3 card-base"
              >
                <Thumb gradient={p.thumbnail} size="lg" label="Sequence" />
                <div className="mt-3">
                  <div className="text-[13px] font-medium text-text leading-[1.4] line-clamp-2">
                    {p.title}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <Badge tone={p.status === "Scheduled" ? "accent" : "neutral"}>
                      {p.status}
                    </Badge>
                    <span className="text-[12px] text-muted">5 slides</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <PlanContentDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        entry="content"
        initialTab="story"
      />
    </>
  );
}

function StepCard({
  step,
  icon,
  title,
  description,
}: {
  step: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <span
          className="text-[10.5px] uppercase font-semibold text-muted"
          style={{ letterSpacing: "0.08em" }}
        >
          Step {step}
        </span>
        <div
          className="w-7 h-7 rounded-md grid place-items-center text-white"
          style={{
            background: "linear-gradient(135deg, #14315E, #0B1F3A)",
            border: "1px solid rgba(11,31,58,0.40)",
          }}
        >
          {icon}
        </div>
      </div>
      <h3 className="text-[15px] font-semibold text-text tracking-[-0.005em]">
        {title}
      </h3>
      <p className="text-[12.5px] text-muted mt-1.5 leading-relaxed">
        {description}
      </p>
    </Card>
  );
}
