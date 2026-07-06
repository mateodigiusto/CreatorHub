/**
 * Sentry server-runtime init.
 *
 * Loaded by Next.js for the Node.js runtime (server components, route
 * handlers without `runtime: 'edge'`). Init is a no-op when SENTRY_DSN
 * is unset, so dev environments without Sentry stay quiet.
 *
 * `beforeSend` runs every event through the shared `redact()` so secrets
 * (tokens, cookies, PII keys) never leave the process. Same REDACT_KEYS
 * set used by `log.{info,warn,error}` — adding a key updates both consumers.
 */

import * as Sentry from "@sentry/nextjs";
import { redact } from "@/lib/log/redact";

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
    /* Capture 100% of errors but only 10% of perf traces — tracing is the
       expensive part of the Sentry bill. Bump for noisy production. */
    tracesSampleRate: 0.1,
    /* Source-map upload happens at build time via withSentryConfig. */
    beforeSend(event) {
      if (event.extra) event.extra = redact(event.extra) as typeof event.extra;
      if (event.contexts) event.contexts = redact(event.contexts) as typeof event.contexts;
      if (event.request?.headers) {
        event.request.headers = redact(event.request.headers) as typeof event.request.headers;
      }
      return event;
    },
  });
}
