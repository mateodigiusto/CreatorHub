/**
 * Lightweight product-analytics shim.
 *
 * Fires events to PostHog's public capture endpoint via plain `fetch` —
 * no SDK dependency, no client-bundle weight when unset. Same wire format
 * works for self-hosted PostHog or any Mixpanel-style ingestor that
 * accepts a `{api_key, event, distinct_id, properties}` payload.
 *
 * Configuration:
 *   NEXT_PUBLIC_POSTHOG_KEY   — your project's `phc_…` key (or equivalent).
 *   NEXT_PUBLIC_POSTHOG_HOST  — defaults to https://app.posthog.com.
 *
 * When the key is unset, every call is a no-op so dev/preview deploys
 * don't ping a phantom backend.
 *
 * Distinct ID: caller passes one per call (typically the auth user id).
 * For anonymous events, omit the third arg — we mint a stable per-browser
 * id from localStorage.
 */

const STORAGE_KEY = "creatorhub-anon-id";

function getEndpoint(): string | null {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return null;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://app.posthog.com";
  return `${host.replace(/\/$/, "")}/capture/`;
}

function anonymousId(): string {
  if (typeof window === "undefined") return "server";
  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing) return existing;
    const fresh = `anon_${Math.random().toString(36).slice(2, 12)}_${Date.now().toString(36)}`;
    localStorage.setItem(STORAGE_KEY, fresh);
    return fresh;
  } catch {
    return `anon_${Math.random().toString(36).slice(2, 12)}`;
  }
}

export type TrackProps = Record<string, string | number | boolean | null | undefined>;

export function track(
  event: string,
  properties: TrackProps = {},
  distinctId?: string,
): void {
  const endpoint = getEndpoint();
  if (!endpoint) return;

  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!apiKey) return;

  /* Fire-and-forget. Don't block the UI on analytics — and never throw
     into the calling component if the network is offline. */
  void fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    /* `keepalive` lets the request survive a same-tick navigation. */
    keepalive: true,
    body: JSON.stringify({
      api_key: apiKey,
      event,
      distinct_id: distinctId ?? anonymousId(),
      properties: {
        ...properties,
        $current_url: typeof location !== "undefined" ? location.href : undefined,
        app: "creatorhub",
        env: process.env.NEXT_PUBLIC_VERCEL_ENV ?? "development",
      },
      timestamp: new Date().toISOString(),
    }),
  }).catch(() => {
    /* swallow */
  });
}

export function identify(distinctId: string, traits: TrackProps = {}): void {
  /* PostHog identify is just a special-shaped event. The `$set` payload
     gets flattened into the user's profile in PostHog; we also include
     the traits at the event-properties level for ingestors that don't
     have a profile concept. */
  track("$identify", traits, distinctId);
}

/**
 * Send a $pageview. Call from a top-level client component on every
 * route change. Cheap and matches PostHog's autocapture event name.
 */
export function trackPageview(distinctId?: string, extra: TrackProps = {}): void {
  track(
    "$pageview",
    {
      ...extra,
      $pathname: typeof location !== "undefined" ? location.pathname : undefined,
    },
    distinctId,
  );
}
