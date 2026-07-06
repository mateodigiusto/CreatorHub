/**
 * Sentry edge-runtime init.
 *
 * Loaded by Next.js for edge functions (middleware, route handlers
 * marked `runtime: 'edge'`). Same redaction pattern as server.
 */

import * as Sentry from "@sentry/nextjs";
import { redact } from "@/lib/log/redact";

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
    tracesSampleRate: 0.1,
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
