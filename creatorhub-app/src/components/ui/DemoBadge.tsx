"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";

/**
 * Small pill that reads `/api/integrations` and renders only when the user
 * has zero active integrations. Tells them the numbers below are sample
 * data and links to /integrations to connect a real platform.
 *
 * Self-fetching so any page can drop `<DemoBadge />` at the top without
 * needing to hoist integration state. The fetch is cheap (one row count),
 * cached by the browser within the navigation, and the render is a no-op
 * once we know the answer is "you have integrations."
 */
export function DemoBadge() {
  const [hasIntegrations, setHasIntegrations] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/integrations", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { activeCount: number } | null) => {
        if (cancelled || !data) return;
        setHasIntegrations(data.activeCount > 0);
      })
      .catch(() => {
        /* swallow — pill stays hidden on network errors rather than
           lying about state. */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /* Only render once we know there are no integrations. While loading
     (null) or when the user has integrations (true), hide. */
  if (hasIntegrations !== false) return null;

  return (
    <Link
      href="/integrations"
      className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-[12px] font-medium bg-accent-soft text-accent border border-accent-border hover:bg-accent-soft/80 transition-colors mb-4 cursor-pointer"
    >
      <Sparkles className="w-3.5 h-3.5" />
      <span>Showing sample data — connect a platform for live numbers</span>
    </Link>
  );
}
