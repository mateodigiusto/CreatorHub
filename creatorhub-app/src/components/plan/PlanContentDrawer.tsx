"use client";

import { useEffect, useState } from "react";
import { X, Sparkles, FileText, Lightbulb } from "lucide-react";
import { cn } from "@/lib/cn";
import { StorySequenceFlow } from "./StorySequenceFlow";
import { Button } from "@/components/ui/Button";
import { useAppState } from "@/lib/store";
import { ideas } from "@/lib/mock/data";

export type PlanContentDrawerEntry = "calendar" | "ideas" | "content";

type Tab = "quick" | "story" | "from-idea";

export function PlanContentDrawer({
  open,
  onClose,
  entry,
  slotDate,
  initialTab = "story",
}: {
  open: boolean;
  onClose: () => void;
  entry: PlanContentDrawerEntry;
  slotDate?: Date;
  initialTab?: Tab;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);

  useEffect(() => {
    if (open) setTab(initialTab);
  }, [open, initialTab]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && open) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="absolute inset-0 bg-navy/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="ml-auto relative w-full max-w-[760px] h-full bg-surface/96 backdrop-blur-xl border-l border-border shadow-[-12px_0_48px_-12px_rgba(10,15,28,0.18)] flex flex-col">
        <div className="flex items-center justify-between px-6 h-14 border-b border-border shrink-0">
          <div>
            <h3 className="text-[15px] font-semibold tracking-tight text-navy">
              Plan content
            </h3>
            {slotDate && entry === "calendar" && (
              <div className="text-[11.5px] text-muted">
                For{" "}
                <span className="text-teal font-medium">
                  {slotDate.toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 grid place-items-center rounded-md text-muted hover:bg-surface-2 hover:text-text transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 pt-4 border-b border-border shrink-0">
          <div className="inline-flex items-center bg-surface-2 border border-border rounded-[10px] p-0.5">
            <TabButton
              active={tab === "quick"}
              onClick={() => setTab("quick")}
              icon={<FileText className="w-3.5 h-3.5" />}
            >
              Quick post
            </TabButton>
            <TabButton
              active={tab === "story"}
              onClick={() => setTab("story")}
              icon={<Sparkles className="w-3.5 h-3.5" />}
              accent
            >
              Story Sequence AI
            </TabButton>
            <TabButton
              active={tab === "from-idea"}
              onClick={() => setTab("from-idea")}
              icon={<Lightbulb className="w-3.5 h-3.5" />}
            >
              From idea
            </TabButton>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {tab === "story" && (
            <StorySequenceFlow
              entry={entry}
              slotDate={slotDate}
              onDone={onClose}
            />
          )}
          {tab === "quick" && <QuickPostStub onDone={onClose} entry={entry} slotDate={slotDate} />}
          {tab === "from-idea" && (
            <FromIdeaStub onDone={onClose} entry={entry} slotDate={slotDate} />
          )}
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  accent,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "h-8 px-3 text-[12.5px] font-medium rounded-[8px] transition-colors inline-flex items-center gap-1.5",
        active
          ? accent
            ? "bg-accent text-white shadow-[0_1px_0_rgba(37,99,235,0.4)]"
            : "bg-surface text-text shadow-[var(--shadow-card)]"
          : accent
          ? "text-accent hover:text-accent hover:bg-accent/10"
          : "text-muted hover:text-text"
      )}
    >
      {icon}
      {children}
    </button>
  );
}

function QuickPostStub({
  onDone,
  entry,
  slotDate,
}: {
  onDone: () => void;
  entry: PlanContentDrawerEntry;
  slotDate?: Date;
}) {
  const { showToast } = useAppState();
  const [title, setTitle] = useState("");
  const [type, setType] = useState<"Reel" | "Carousel" | "Static">("Reel");
  return (
    <div className="p-6 space-y-5">
      <div>
        <label className="text-[12px] text-muted block mb-1.5">Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Working title…"
          className="w-full h-10 px-3 rounded-[10px] bg-surface border border-border text-[13.5px] text-navy focus:outline-none focus:border-teal/40 focus:ring-2 focus:ring-teal/20"
        />
      </div>
      <div>
        <label className="text-[12px] text-muted block mb-1.5">Format</label>
        <div className="inline-flex rounded-[10px] bg-surface-2 border border-border p-0.5">
          {(["Reel", "Carousel", "Static"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={cn(
                "h-8 px-3 text-[12.5px] font-medium rounded-[8px] transition-colors",
                t === type
                  ? "bg-surface text-navy shadow-[0_1px_0_rgba(10,15,28,0.06)]"
                  : "text-muted hover:text-navy"
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <div className="pt-3 flex items-center gap-2 border-t border-border">
        <Button
          onClick={() => {
            showToast(
              entry === "calendar" && slotDate
                ? `Quick post scheduled for ${slotDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}.`
                : "Quick post saved to Content."
            );
            onDone();
          }}
        >
          {entry === "calendar" ? "Schedule in this slot" : "Move to Content"}
        </Button>
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function FromIdeaStub({
  onDone,
  entry,
  slotDate,
}: {
  onDone: () => void;
  entry: PlanContentDrawerEntry;
  slotDate?: Date;
}) {
  const { showToast } = useAppState();
  const [picked, setPicked] = useState<string | null>(null);
  return (
    <div className="p-6">
      <p className="text-[13px] text-muted mb-4">
        Pick an idea to turn into a content item.
      </p>
      <div className="grid grid-cols-2 gap-2.5">
        {ideas.slice(0, 6).map((i) => (
          <button
            key={i.id}
            onClick={() => setPicked(i.id)}
            className={cn(
              "text-left p-3 rounded-[10px] border transition-colors",
              picked === i.id
                ? "border-teal/40 bg-teal/[0.05]"
                : "border-border bg-surface hover:border-teal/25 hover:bg-teal/[0.03]"
            )}
          >
            <div className="text-[12.5px] text-navy font-medium leading-snug">
              {i.title}
            </div>
            <div className="text-[11px] text-muted mt-1.5">
              {i.format} · {i.score} match
            </div>
          </button>
        ))}
      </div>
      <div className="mt-6 pt-5 flex items-center gap-2 border-t border-border">
        <Button
          disabled={!picked}
          onClick={() => {
            showToast(
              entry === "calendar" && slotDate
                ? `Idea scheduled for ${slotDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}.`
                : "Idea moved to Content."
            );
            onDone();
          }}
        >
          {entry === "calendar" ? "Schedule in this slot" : "Move to Content"}
        </Button>
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
