# Sentry verification runbook

Confirms the production deploy is reporting errors to Sentry with redacted PII / secrets. Run after the first prod deploy and any time you suspect monitoring has gone silent.

## Prereqs

- `SENTRY_DSN` is set in Vercel for the target environment (production or preview).
- `CRON_SECRET` is set in the same environment (used to gate the debug endpoint).
- You can read the Sentry project's Issues feed at sentry.io.

If `SENTRY_DSN` is unset, [sentry.server.config.ts](../../sentry.server.config.ts) is a no-op — the SDK never initializes, so events never fire. Set it before running this check.

## Running the check

```bash
# Replace with prod URL + the actual CRON_SECRET value.
curl -s "https://creatorhub.app/api/debug/throw?secret=$CRON_SECRET"
```

Expected response: HTTP 500 with a generic error body. The route deliberately throws.

Within ~60 seconds, two events should appear in Sentry's Issues feed:

1. **`Sentry verification (log path)`** — fired by `log.error()` → `bindSentry()` in [src/lib/log/index.ts](../../src/lib/log/index.ts). Verifies the logger-bound capture path used by 100% of in-app errors.
2. **`Sentry verification (throw path) — please ignore`** — fired by the unhandled throw, captured by `@sentry/nextjs`'s route-handler instrumentation. Verifies Next's automatic capture path.

Both events should have:
- `environment` = `production` (or `preview`)
- `extra.source` = `manual_test` (on event 1)
- Stack trace with deminified frames (source maps uploaded via `withSentryConfig` at build time)
- **No** `access_token`, `refresh_token`, `email`, `cookie`, or other secret values in the payload — `beforeSend` runs `redact()` on every event

## What to do if no events arrive

1. **Check the Vercel build log** for `withSentryConfig` warnings about a missing `SENTRY_AUTH_TOKEN` (source maps won't upload but events still fire).
2. **Check the runtime log** in Vercel for `sentry.server.config.ts` — it logs nothing in normal operation, but if you see Sentry SDK warnings they'll show here.
3. **Hit the endpoint without the secret** (`curl /api/debug/throw`) — should 401. Confirms the route is at least deployed.
4. **Verify the DSN** is the actual one from sentry.io project settings, not a stale or wrong-project DSN.
5. **Sample rate** — `tracesSampleRate` is 0.1 in the config but `captureException` ignores it. If only traces are missing, that's expected. Errors should always fire.

## Removing or keeping the endpoint

The debug route is intentionally cheap (one throw, no DB read). Options:

- **Keep it** — useful as a "is monitoring still alive?" canary. Hit it weekly from a cron or external uptime check, alert if no event lands in Sentry within 5 min.
- **Remove it** — delete `src/app/api/debug/throw/route.ts` and rerun build. The route gating already makes it safe to ship; removal is purely a "less surface area" call.

## See also

- [sentry.server.config.ts](../../sentry.server.config.ts) — server runtime init + redaction
- [sentry.edge.config.ts](../../sentry.edge.config.ts) — edge runtime init
- [src/lib/log/redact.ts](../../src/lib/log/redact.ts) — single source of truth for redacted keys
- [instrumentation.ts](../../instrumentation.ts) — boot-time `bindSentry` + schema-version assertion
