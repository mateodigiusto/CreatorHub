"use client";

import { cn } from "@/lib/cn";

/**
 * Phase 8 — skeleton primitives + per-tab loading shells.
 *
 * Uses Tailwind's built-in `animate-pulse` (no new keyframes needed in
 * globals.css). The bar reads `bg-surface-2` so it themes automatically:
 * lighter slate in light mode, darker navy fill in dark mode. Rounded
 * corners match the radius scale of the surfaces they shim.
 *
 * Conventions for callers:
 *   - Render a skeleton ONLY while the initial data fetch is pending.
 *     After first success, render the real shell with row-level shimmers
 *     (or nothing). Don't show skeletons during refetches — that flickers.
 *   - Match the skeleton geometry roughly to the loaded layout so the
 *     paint doesn't shift more than ~50px when data arrives.
 */

export function Skeleton({
  className,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn(
        "bg-surface-2 rounded-md animate-pulse",
        className,
      )}
      {...rest}
    />
  );
}

/** A full-width text-line skeleton — `h-3.5` (~14px) is roughly one line of
 *  the body text size used across agency tabs. */
export function SkeletonLine({ widthClass = "w-full" }: { widthClass?: string }) {
  return <Skeleton className={cn("h-3.5", widthClass)} />;
}

/** Skeleton card body, padded the same as a real `Card`. */
export function SkeletonCard({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "bg-surface border border-border rounded-[14px] p-5",
        className,
      )}
    >
      <Skeleton className="h-4 w-1/3 mb-4" />
      <div className="space-y-2.5">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton
            key={i}
            className={cn("h-3", i === lines - 1 ? "w-2/3" : "w-full")}
          />
        ))}
      </div>
    </div>
  );
}

/* ─── Per-tab skeleton shells ───────────────────────────────────────── */

/** Pipeline kanban — 5 columns × 3 cards. Mirrors KanbanBoard.tsx. */
export function PipelineSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading pipeline" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
      {Array.from({ length: 5 }).map((_, col) => (
        <div
          key={col}
          className="bg-surface border border-border rounded-[14px] p-3 min-h-[260px]"
        >
          <div className="flex items-center justify-between mb-3">
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="h-3 w-6" />
          </div>
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="bg-surface-2 border border-border rounded-[10px] p-3"
              >
                <Skeleton className="h-3 w-3/4 mb-2" />
                <Skeleton className="h-2.5 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Calendar month grid — 5 weeks × 7 days. Mirrors MonthCalendar.tsx. */
export function CalendarSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading calendar" className="bg-surface border border-border rounded-[14px] overflow-hidden">
      <div className="grid grid-cols-7 border-b border-border">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="p-3 text-center">
            <Skeleton className="h-3 w-8 mx-auto" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {Array.from({ length: 35 }).map((_, i) => (
          <div
            key={i}
            className="border-b border-r border-border last:border-r-0 p-2 min-h-[88px]"
          >
            <Skeleton className="h-3 w-5 mb-2" />
            {i % 4 === 0 && <Skeleton className="h-2.5 w-3/4" />}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Metrics dashboard — KPI row + bar chart + top posts. */
export function MetricsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading metrics" className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-surface border border-border rounded-[14px] p-4">
            <Skeleton className="h-3 w-16 mb-3" />
            <Skeleton className="h-6 w-24 mb-2" />
            <Skeleton className="h-2.5 w-12" />
          </div>
        ))}
      </div>
      <div className="bg-surface border border-border rounded-[14px] p-5">
        <Skeleton className="h-4 w-32 mb-4" />
        <div className="space-y-2.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 flex-1" />
              <Skeleton className="h-3 w-12" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Assets grid — 3 columns × 2 rows of media tiles. */
export function AssetsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading assets" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="bg-surface border border-border rounded-[14px] overflow-hidden">
          <Skeleton className="aspect-video rounded-none" />
          <div className="p-3">
            <Skeleton className="h-3 w-2/3 mb-2" />
            <Skeleton className="h-2.5 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Long-form form — 6 labeled fields. Brand Build / Strategy / Settings. */
export function FormSkeleton({ fields = 6 }: { fields?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading form" className="bg-surface border border-border rounded-[14px] p-5 space-y-5">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i}>
          <Skeleton className="h-3 w-24 mb-2" />
          <Skeleton className="h-10 w-full rounded-[10px]" />
        </div>
      ))}
    </div>
  );
}

/** Generic list — N rows of "title + meta". For meetings / tasks / members. */
export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading list" className="bg-surface border border-border rounded-[14px] divide-y divide-border">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="p-4 flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-2.5 w-1/2" />
          </div>
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
}
