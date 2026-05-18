"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

type Tab = { key: string; label: string };

const ALL_TABS: Tab[] = [
  { key: "overview", label: "Overview" },
  { key: "brand-build", label: "Brand Build" },
  { key: "strategy", label: "Strategy" },
  { key: "pipeline", label: "Pipeline" },
  { key: "calendar", label: "Calendar" },
  { key: "metrics", label: "Metrics" },
  { key: "assets", label: "Assets" },
  { key: "meetings", label: "Meetings" },
  { key: "internal", label: "Internal" },
  { key: "settings", label: "Settings" },
];

export function ClientSubNav({
  slug,
  liveTabs = [
    "overview",
    "brand-build",
    "strategy",
    "pipeline",
    "calendar",
    "metrics",
    "assets",
    "meetings",
    "internal",
    "settings",
  ],
}: {
  slug: string;
  /** Tabs that have a built page. Others are rendered as disabled placeholders. */
  liveTabs?: string[];
}) {
  const pathname = usePathname();
  const activeKey = pathname?.split("/")[3] ?? "overview";

  return (
    <nav className="border-b border-border -mx-6 px-6 mb-6 overflow-x-auto no-scrollbar">
      <ul className="flex items-center gap-1 min-w-max">
        {ALL_TABS.map((tab) => {
          const isActive = activeKey === tab.key;
          const isLive = liveTabs.includes(tab.key);
          const href = `/clients/${slug}/${tab.key}`;
          const className = cn(
            "inline-flex items-center h-10 px-3 text-[13px] font-medium rounded-t-[8px] -mb-px border-b-2 transition-colors",
            isActive
              ? "border-accent text-text"
              : "border-transparent text-muted hover:text-text",
            !isLive && "opacity-50",
          );
          if (!isLive) {
            return (
              <li key={tab.key}>
                <span className={cn(className, "cursor-not-allowed")} title="Coming in a later phase">
                  {tab.label}
                </span>
              </li>
            );
          }
          return (
            <li key={tab.key}>
              <Link href={href} className={className}>
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
