/**
 * `log` — the only sanctioned logging API in the app.
 *
 * Wraps console.* with automatic redaction via `redact()`. The
 * `creatorhub/no-raw-console` ESLint rule blocks `console.log` /
 * `console.error` outside this file and tests.
 *
 * Errors flow to Sentry via `log.error()` once Sentry is wired in
 * sentry.{client,server,edge}.config.ts. For now `Sentry.captureException`
 * is a no-op fallback so we can ship the API before the SDK is configured.
 */

import { redact } from "./redact";

type Meta = Record<string, unknown> | undefined;

let sentryCapture: (err: unknown, ctx?: { extra?: unknown }) => void = () => {};
let sentryMessage: (
  msg: string,
  ctx?: { level?: "info" | "warning" | "error" | "fatal"; extra?: unknown },
) => void = () => {};

/**
 * Wire Sentry from instrumentation.ts so it's safe to import `log` in any
 * runtime (server / edge / client) without forcing the Sentry SDK at
 * module-eval time.
 */
export function bindSentry(captures: {
  captureException: typeof sentryCapture;
  captureMessage: typeof sentryMessage;
}) {
  sentryCapture = captures.captureException;
  sentryMessage = captures.captureMessage;
}

export const log = {
  info(message: string, meta?: Meta) {
    console.log(message, meta ? redact(meta) : "");
  },
  warn(message: string, meta?: Meta) {
    console.warn(message, meta ? redact(meta) : "");
    sentryMessage(message, { level: "warning", extra: meta ? redact(meta) : undefined });
  },
  error(message: string, error: unknown, meta?: Meta) {
    console.error(message, error, meta ? redact(meta) : "");
    sentryCapture(error, { extra: meta ? redact(meta) : undefined });
  },
  /** Debug logs are stripped in production builds via the
   *  no-debug-logs-in-prod CI check (TBD). For now they're plain. */
  debug(message: string, meta?: Meta) {
    if (process.env.NODE_ENV === "production") return;
    console.log(`[debug] ${message}`, meta ? redact(meta) : "");
  },
};

export { redact, REDACT_KEYS } from "./redact";
