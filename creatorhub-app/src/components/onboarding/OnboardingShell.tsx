"use client";

import { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "./ProgressBar";
import { cn } from "@/lib/cn";

export function OnboardingShell({
  step,
  total,
  motivational,
  canBack,
  canNext,
  nextLabel = "Next",
  hideFooter,
  hideBack,
  onBack,
  onNext,
  onSkip,
  children,
}: {
  step: number;
  total: number;
  motivational?: string;
  canBack: boolean;
  canNext: boolean;
  nextLabel?: string;
  hideFooter?: boolean;
  hideBack?: boolean;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col relative z-10">
      {/* Top bar */}
      <header className="sticky top-0 z-20 bg-bg/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-[840px] mx-auto px-6 py-3 flex items-center gap-6">
          <div className="flex items-center gap-2 shrink-0">
            <div
              className="w-7 h-7 rounded-lg grid place-items-center text-[13px] font-semibold"
              style={{
                color: "#A8C5FF",
                background:
                  "linear-gradient(135deg, rgba(20,49,94,0.85), rgba(11,31,58,0.70))",
                border: "1px solid rgba(93,169,233,0.30)",
              }}
            >
              C
            </div>
            <span className="text-[15px] font-semibold tracking-tight text-text">
              Creator<span style={{ color: "var(--accent)" }}>Hub</span>
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <ProgressBar step={step} total={total} />
            {motivational && (
              <div className="text-[11px] text-accent font-medium mt-1.5 text-right">
                {motivational}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Step content */}
      <main className="flex-1 w-full">
        <div
          key={step}
          className="max-w-[840px] mx-auto px-6 py-10"
          style={{
            animation: "slide-reveal 240ms cubic-bezier(0.23,1,0.32,1) both",
          }}
        >
          {children}
        </div>
      </main>

      {/* Footer */}
      {!hideFooter && (
        <footer className="sticky bottom-0 z-20 bg-bg/85 backdrop-blur-xl border-t border-border">
          <div className="max-w-[840px] mx-auto px-6 py-3 flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              onClick={onBack}
              disabled={!canBack}
              className={cn(hideBack && "invisible")}
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Back
            </Button>
            <div className="flex items-center gap-3">
              <button
                onClick={onSkip}
                className="text-[12px] text-muted hover:text-text underline-offset-2 hover:underline cursor-pointer"
              >
                Skip setup
              </button>
              <Button onClick={onNext} disabled={!canNext}>
                {nextLabel} <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
