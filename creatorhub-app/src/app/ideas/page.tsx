"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { AiCallout } from "@/components/ui/AiCallout";
import { Drawer } from "@/components/ui/Drawer";
import { useAppState } from "@/lib/store";
import { ideas, winningFormats, aiInsights } from "@/lib/mock/data";
import { Idea } from "@/lib/mock/types";
import { Sparkles, Bookmark, ArrowRight, Plus, Library, Wand2 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { PlanContentDrawer } from "@/components/plan/PlanContentDrawer";

export default function IdeasPage() {
  const { connected } = useAppState();
  const [selected, setSelected] = useState<Idea | null>(null);
  const [planOpen, setPlanOpen] = useState(false);

  if (!connected) {
    return (
      <>
        <PageHeader title="Ideas" description="Turn data into next content." />
        <EmptyState
          title="No ideas yet."
          description="Once your analytics are connected, CreatorHub will suggest content ideas based on what already works."
          primaryAction={{ label: "Connect Instagram" }}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Ideas"
        description="Suggestions grounded in your own analytics — not random AI noise."
        actions={
          <>
            <Button variant="outline" size="md">
              <Library className="w-4 h-4" /> Inspiration library
            </Button>
            <Button size="md">
              <Plus className="w-4 h-4" /> New idea
            </Button>
          </>
        }
      />

      <AiCallout title="Why these ideas" body={aiInsights.ideas} />

      <div className="mt-4">
        <button
          onClick={() => setPlanOpen(true)}
          className="lift lift-strong w-full text-left rounded-[14px] p-5 relative overflow-hidden group"
          style={{
            background:
              "linear-gradient(135deg, var(--accent-soft), rgba(99,102,241,0.05) 60%, rgba(96,165,250,0.04))",
            border: "1px solid var(--accent-border)",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.10), 0 1px 2px rgba(7,17,31,0.06)",
          }}
        >
          <div
            aria-hidden
            className="absolute -top-16 -right-12 w-56 h-56 rounded-full pointer-events-none"
            style={{
              background:
                "radial-gradient(circle, var(--accent-glow), transparent 70%)",
              filter: "blur(40px)",
            }}
          />
          <div className="relative flex items-center gap-4">
            <div
              className="w-11 h-11 rounded-xl bg-accent text-white grid place-items-center shrink-0"
              style={{ boxShadow: "0 4px 12px rgba(37,99,235,0.30)" }}
            >
              <Wand2 className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-[15px] font-semibold tracking-tight text-navy">
                  Generate a Story Sequence from your assets
                </h3>
                <Badge tone="teal">New</Badge>
              </div>
              <p className="text-[12.5px] text-muted mt-1 max-w-2xl">
                Pick a few photos or proof assets, set a goal, and CreatorHub
                drafts a 5-slide Instagram story — Hook → Context → Proof →
                Insight → CTA.
              </p>
            </div>
            <span className="text-teal text-[12.5px] font-medium inline-flex items-center gap-1 shrink-0">
              Start <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mt-6">
        <div className="col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-[15px] font-semibold tracking-tight text-navy">
                AI-generated ideas
              </h2>
              <p className="text-[12.5px] text-muted">
                Based on your top performing posts
              </p>
            </div>
            <Button variant="outline" size="sm">
              <Sparkles className="w-3.5 h-3.5" /> Generate more
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {ideas.map((idea) => (
              <button
                key={idea.id}
                onClick={() => setSelected(idea)}
                onMouseMove={(e) => {
                  const r = e.currentTarget.getBoundingClientRect();
                  e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
                  e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
                }}
                className="lift lift-strong spotlight text-left bg-surface border border-border rounded-[14px] p-5 card-base"
              >
                <div className="flex items-center justify-between mb-3">
                  <Badge tone="neutral">{idea.format}</Badge>
                  <span
                    className={cn(
                      "text-[11px] font-semibold tracking-wider px-1.5 py-0.5 rounded-full",
                      idea.score >= 85
                        ? "text-teal bg-teal/10"
                        : "text-teal-blue bg-teal-blue/10"
                    )}
                  >
                    {idea.score} match
                  </span>
                </div>
                <h3 className="text-[14.5px] font-semibold text-navy leading-snug">
                  {idea.title}
                </h3>
                <p className="text-[12.5px] text-muted mt-2 leading-relaxed line-clamp-3">
                  {idea.hypothesis}
                </p>
                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between gap-2">
                  <span className="text-[11px] inline-flex items-center gap-1.5 text-teal bg-teal/8 border border-teal/20 px-1.5 py-0.5 rounded-full font-medium">
                    <span className="w-1 h-1 rounded-full bg-teal" />
                    From {idea.source.toLowerCase().includes("reel") ? "your top Reel" : "your data"}
                  </span>
                  <Bookmark
                    className={cn(
                      "w-4 h-4 shrink-0 transition-colors",
                      idea.saved ? "fill-teal text-teal" : "text-muted hover:text-teal"
                    )}
                  />
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Winning formats"
              description="Your saved patterns"
            />
            <ul className="space-y-3">
              {winningFormats.map((f) => (
                <li
                  key={f.name}
                  className="border border-border rounded-[10px] p-3"
                >
                  <div className="text-[13px] font-medium text-navy">
                    {f.name}
                  </div>
                  <div className="text-[11.5px] text-muted mt-1">
                    {f.uses} uses · avg {f.avgReach} reach
                  </div>
                  <div className="mt-2">
                    <Badge tone="teal">{f.lift} lift</Badge>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardHeader
              title="Inspiration library"
              description="Saved references"
            />
            <p className="text-[13px] text-muted">
              Curate posts and creators to draw from. CreatorHub uses these as
              context when suggesting ideas.
            </p>
            <Button variant="outline" size="sm" className="mt-4">
              Browse library <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Card>
        </div>
      </div>

      <Drawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Idea detail"
      >
        {selected && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Badge tone="neutral">{selected.format}</Badge>
              <Badge tone="teal">{selected.score} match</Badge>
            </div>
            <h2 className="text-[18px] font-semibold tracking-tight text-navy leading-snug">
              {selected.title}
            </h2>

            <div className="mt-5 rounded-[10px] bg-teal/[0.05] border border-teal/15 p-4">
              <div className="text-[11px] uppercase tracking-wider text-teal font-semibold mb-1.5">
                Hypothesis
              </div>
              <p className="text-[13.5px] text-navy/90 leading-relaxed">
                {selected.hypothesis}
              </p>
            </div>

            <div className="mt-5">
              <div className="text-[11px] uppercase tracking-wider text-muted font-semibold mb-1.5">
                Sourced from
              </div>
              <p className="text-[13px] text-navy">{selected.source}</p>
            </div>

            <div className="mt-7 flex items-center gap-2">
              <Button>Add to calendar</Button>
              <Button variant="outline">Save to library</Button>
            </div>
          </div>
        )}
      </Drawer>

      <PlanContentDrawer
        open={planOpen}
        onClose={() => setPlanOpen(false)}
        entry="ideas"
        initialTab="story"
      />
    </>
  );
}
