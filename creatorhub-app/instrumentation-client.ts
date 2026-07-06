/**
 * Sentry browser-runtime init (Next.js 15+ instrumentation-client pattern).
 *
 * Reads NEXT_PUBLIC_SENTRY_DSN — must be public-prefixed since this runs
 * in the user's browser. Same redaction pattern as the server config.
 */

import * as Sentry from "@sentry/nextjs";
import { redact } from "@/lib/log/redact";

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? "development",
    tracesSampleRate: 0.1,
    /* Replays are off by default — they're expensive and we don't need
       them for an MVP. Flip on once we have real users + budget. */
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    beforeSend(event) {
      if (event.extra) event.extra = redact(event.extra) as typeof event.extra;
      if (event.contexts) event.contexts = redact(event.contexts) as typeof event.contexts;
      return event;
    },
  });
}
