"use client";

/**
 * Mounted at the root layout — fires a $pageview event on every route
 * change. No-op when NEXT_PUBLIC_POSTHOG_KEY is unset, so dev/preview
 * runs don't send analytics anywhere.
 *
 * The identify-on-login wiring is in `lib/store.tsx` after the profile
 * fetch lands; this component handles anonymous + post-login pageviews
 * uniformly.
 */

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAppState } from "@/lib/store";
import { trackPageview } from "@/lib/analytics/track";

export function PageviewTracker() {
  const pathname = usePathname();
  const { profile } = useAppState();
  /* The Profile type doesn't carry user_id — auth.uid() lives server-side.
     We use a stable anonymous id (cookie/localStorage) until login. */
  const distinctId = profile?.handle ?? profile?.displayName ?? undefined;

  useEffect(() => {
    if (!pathname) return;
    trackPageview(distinctId, { path: pathname });
  }, [pathname, distinctId]);

  return null;
}
