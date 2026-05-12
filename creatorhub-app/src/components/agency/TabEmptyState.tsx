"use client";

import { ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FileText } from "lucide-react";

/**
 * Empty state designed for the agency / workspace tabs. Smaller and
 * tab-local — doesn't fill the whole page, doesn't offer "Continue with
 * sample data" (which the legacy `EmptyState` does). Matches the navy /
 * blue palette and the dotted-pattern radial that `EmptyState` uses.
 *
 * Used by Phase 2/3/4/5/7 tab pages. Each tab passes its own
 * title/description/icon/CTA. Examples in the Phase 8 notes doc.
 */
export function TabEmptyState({
  title,
  description,
  icon,
  primaryAction,
  secondaryAction,
  size = "md",
}: {
  title: string;
  description: string;
  icon?: ReactNode;
  primaryAction?: { label: string; onClick?: () => void; href?: string; disabled?: boolean };
  secondaryAction?: { label: string; onClick?: () => void; href?: string; disabled?: boolean };
  size?: "sm" | "md";
}) {
  const padY = size === "sm" ? "py-10" : "py-14";

  return (
    <Card className={`${padY} px-8 flex flex-col items-center text-center relative overflow-hidden`}>
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.45] pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(var(--pattern-color, rgba(37,99,235,0.10)) 1px, transparent 1px)",
          backgroundSize: "16px 16px",
          maskImage:
            "radial-gradient(ellipse at center, black 30%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, black 30%, transparent 75%)",
        }}
      />
      <div className="relative z-10 flex flex-col items-center">
        <div className="relative w-12 h-12 mb-4">
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background:
                "radial-gradient(circle at 50% 50%, var(--accent-glow), transparent 65%)",
            }}
          />
          <div className="absolute inset-0 rounded-full border border-accent/25" />
          <div className="absolute inset-1.5 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center text-accent">
            {icon ?? <FileText className="w-4 h-4" />}
          </div>
        </div>

        <h3 className="text-[16px] font-semibold tracking-[-0.005em] text-text max-w-md leading-snug">
          {title}
        </h3>
        <p className="text-[13px] text-muted mt-1.5 max-w-md leading-relaxed">
          {description}
        </p>

        {(primaryAction || secondaryAction) && (
          <div className="flex items-center gap-2 mt-5">
            {primaryAction && (
              primaryAction.href ? (
                <a href={primaryAction.href} aria-disabled={primaryAction.disabled}>
                  <Button disabled={primaryAction.disabled}>{primaryAction.label}</Button>
                </a>
              ) : (
                <Button onClick={primaryAction.onClick} disabled={primaryAction.disabled}>
                  {primaryAction.label}
                </Button>
              )
            )}
            {secondaryAction && (
              secondaryAction.href ? (
                <a href={secondaryAction.href} aria-disabled={secondaryAction.disabled}>
                  <Button variant="ghost" disabled={secondaryAction.disabled}>
                    {secondaryAction.label}
                  </Button>
                </a>
              ) : (
                <Button
                  variant="ghost"
                  onClick={secondaryAction.onClick}
                  disabled={secondaryAction.disabled}
                >
                  {secondaryAction.label}
                </Button>
              )
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
