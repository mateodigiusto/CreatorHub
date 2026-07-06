"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { Card } from "./Card";
import { Button } from "./Button";
import { Plug } from "lucide-react";

type Action = {
  label: string;
  onClick?: () => void;
  href?: string;
};

export function EmptyState({
  title,
  description,
  icon,
  primaryAction,
  secondaryAction,
}: {
  title: string;
  description: string;
  icon?: ReactNode;
  primaryAction?: Action;
  secondaryAction?: Action;
}) {
  return (
    <Card className="py-16 px-8 flex flex-col items-center text-center relative overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.5] pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(var(--pattern-color) 1px, transparent 1px)",
          backgroundSize: "16px 16px",
          maskImage:
            "radial-gradient(ellipse at center, black 30%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, black 30%, transparent 75%)",
        }}
      />
      <div className="relative z-10 flex flex-col items-center">
        <div className="relative w-14 h-14 mb-5">
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background:
                "radial-gradient(circle at 50% 50%, var(--accent-glow), transparent 65%)",
            }}
          />
          <div className="absolute inset-0 rounded-full border border-accent/25" />
          <div className="absolute inset-1.5 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center text-accent">
            {icon ?? <Plug className="w-4 h-4" />}
          </div>
        </div>

        <h3 className="text-[18px] font-semibold tracking-[-0.01em] text-text max-w-md leading-snug">
          {title}
        </h3>
        <p className="text-[13.5px] text-muted mt-2 max-w-md leading-relaxed">
          {description}
        </p>

        {(primaryAction || secondaryAction) && (
          <div className="flex items-center gap-2 mt-6">
            {primaryAction && <ActionButton action={primaryAction} />}
            {secondaryAction && (
              <ActionButton action={secondaryAction} variant="ghost" />
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

function ActionButton({
  action,
  variant,
}: {
  action: Action;
  variant?: "ghost";
}) {
  if (action.href) {
    return (
      <Link href={action.href}>
        <Button variant={variant}>{action.label}</Button>
      </Link>
    );
  }
  return (
    <Button variant={variant} onClick={action.onClick}>
      {action.label}
    </Button>
  );
}
