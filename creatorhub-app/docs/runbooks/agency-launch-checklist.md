# Agency pivot — launch checklist

The state needed to flip `feat/agency-clients` to a paying-customer production deploy. Cloud DB is already at schema v36 and code is green; everything below is environment + external services.

Use this as the "ready-to-ship" gate. Items marked **REQUIRED** are blocking; **OPTIONAL** features run cleanly without them (the code already no-ops).

---

## 1. Vercel — env vars + deploy

Set the following in **Vercel → Project → Settings → Environment Variables**, scoped to **Production** (and **Preview** if you want previews to match):

### REQUIRED (Supabase + boot guard)

| Key | Value | Notes |
|---|---|---|
| `DATABASE_URL` | pooler URL, port 6543, `?pgbouncer=true` | from Supabase Dashboard → Project → Connection |
| `DIRECT_URL` | direct URL, port 5432 | non-pooled, for migrations + tests |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<ref>.supabase.co` | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | from Supabase API settings | |
| `SUPABASE_SERVICE_ROLE_KEY` | from Supabase API settings | gated to server-only routes |
| `EXPECTED_SCHEMA_VERSION` | `36` | **bump on every new migration** — `instrumentation.ts` refuses traffic on mismatch |
| `ENCRYPTION_KEY` | 32-byte base64 random | for integration-token envelope encryption |
| `NEXT_PUBLIC_APP_URL` | `https://<your-domain>` | used by Stripe redirects + Resend email links |
| `APP_URL` | same as `NEXT_PUBLIC_APP_URL` | server-side variant |

### OPTIONAL (per-feature, all run dormant without keys)

| Key | Enables | Without it |
|---|---|---|
| `STRIPE_SECRET_KEY` + `STRIPE_PUBLISHABLE_KEY` + `STRIPE_WEBHOOK_SECRET` + the 4 `STRIPE_PRICE_*` IDs | Billing checkout, portal, plan gates | Orgs stuck at `trial`; `assertPlanAllows` only enforces free-tier limits |
| `BUNNY_STREAM_LIBRARY_ID` + `BUNNY_STREAM_API_KEY` + `BUNNY_STREAM_CDN_HOSTNAME` + `BUNNY_STREAM_TOKEN_AUTH_KEY` | Video uploads + playback on the Assets tab | Asset video routes 503; link assets still work |
| `RESEND_API_KEY` + `EMAIL_FROM` | Transactional emails (member-added today; comment notifications when wired) | Email calls return `{ sent: false, reason: 'unconfigured' }` and the request succeeds |
| `ANTHROPIC_API_KEY` | Transcript analyzer on Strategy tab | Analyzer button errors with `analyze.fetch_failed`; rest of tab works |
| `SENTRY_DSN` + `SENTRY_AUTH_TOKEN` | Error monitoring | Errors only hit logs |

### Vercel project config

- **Root Directory:** `creatorhub-app` (subfolder layout)
- **Framework Preset:** Next.js
- **Build Command:** `npm run build` (default)
- **Node version:** 20.x or 22.x (verify `package.json` engines field if you pin)

After saving env vars, **trigger a redeploy** — env-var changes don't apply to the live deploy automatically.

---

## 2. Migration 0037 — finalize subscriptions (DESTRUCTIVE)

`supabase/migrations/0037_subscriptions_finalize.sql` is **shipped but not applied**. It drops `subscriptions.user_id` and `profiles.stripe_customer_id` — both have been migrated to org-level columns. **Do not apply until:**

1. `EXPECTED_SCHEMA_VERSION` in Vercel still says `36` (not 37).
2. You've run the backfill script with `--dry-run` against the production DB:
   ```
   cd creatorhub-app
   node --env-file=.env.production scripts/backfill-subscriptions-to-orgs.ts --dry-run
   ```
   Report should show every existing subscription cleanly mapped to a single org.
3. You've run it for real (no `--dry-run`). Confirm `select count(*) from subscriptions where organization_id is null` returns 0.
4. Apply 0037 via `npm run db:migrate` or the Supabase MCP.
5. Bump `EXPECTED_SCHEMA_VERSION=37` in Vercel **and** `tests/migration-roundtrip.spec.ts` **and** `.env.example`.
6. Redeploy.

Order matters — applying 0037 before backfill drops the columns that hold the data you need to migrate.

---

## 3. Stripe — webhook URL + customer-portal config

After setting Stripe env vars in Vercel:

1. **Webhook endpoint:** Stripe Dashboard → Developers → Webhooks → Add endpoint.
   - URL: `https://<your-domain>/api/webhooks/stripe`
   - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`, `invoice.payment_succeeded`
   - Copy the signing secret into `STRIPE_WEBHOOK_SECRET` and redeploy.

2. **Customer portal:** Stripe Dashboard → Settings → Billing → Customer Portal.
   - Enable plan switching between your 4 Stripe Products (starter monthly/annual + pro monthly/annual).
   - Enable cancellation. Choose "cancel at period end" semantics.
   - Save.

3. **Test mode first:** verify end-to-end on test-mode keys before swapping in live keys.

---

## 4. Bunny.net — library + token-auth key

1. Sign up at bunny.net, create a Stream Library.
2. Copy: **Library ID**, **API Key**, **CDN Hostname** (the `b-cdn.net` one), **Token Authentication Key**.
3. Set the four `BUNNY_STREAM_*` env vars in Vercel.
4. Redeploy.
5. Smoke test: open `/clients/<slug>/assets`, upload an MP4 via TUS. Status should go `uploading → processing → ready` within ~30s for a 30-second clip.

---

## 5. Resend — verified domain

1. Sign up at resend.com, add your sending domain.
2. Add the DNS records they generate (TXT for SPF, DKIM CNAMEs). DNS propagation = 5min–24h.
3. Verify the domain in the Resend dashboard.
4. Set `RESEND_API_KEY` + `EMAIL_FROM` (e.g. `notify@your-domain.com`) in Vercel.
5. Redeploy.
6. Smoke test: invite a teammate to a client, confirm they receive the "added to workspace" email.

See `docs/runbooks/resend-domain-setup.md` for DNS details.

---

## 6. Dev-only routes — confirm 404 in prod

`/api/dev/quick-login` is gated by `NODE_ENV === "production"` returning 404. On Vercel, `NODE_ENV` is automatically `production` — confirm with:

```
curl -i https://<your-domain>/api/dev/quick-login
```

Should return `404 disabled_in_prod`. If it doesn't, **delete the route before launch** — it signs in as the most recent `a-*@test.local` user without a password challenge.

---

## 7. RLS regression suite — run against prod DB

```
cd creatorhub-app
DIRECT_URL=<prod direct url> npm run test:rls
DIRECT_URL=<prod direct url> npm run test:migration
```

These tests insert fixture rows tagged `*@test.invalid` / `rls-test-*` and clean them up on exit. They are safe to run against a live DB (no real-user data touched), but **only do it from a session that has the service-role key** — they need to set role `anon` and `authenticated`.

Confirm:
- Anon role returns zero rows from `organizations`, `clients`, every agency table.
- Agency A's authenticated user returns zero rows from Agency B's clients.
- A `team_assigned` client member can't read `client_internal_notes`.

---

## 8. Post-launch monitoring

- **Sentry:** confirm errors land. Trigger a `throw new Error("launch smoke test")` from a temp endpoint to verify.
- **Schema-version guard:** on a fresh deploy, the boot log should print one line per request confirming the assertion passed. A mismatch produces `schema_version_mismatch` and the deploy refuses traffic.
- **Cost telemetry:** Supabase Pro tier auto-scales billing past 100GB storage / 250GB egress. Set up a Supabase usage alert at 80% of your monthly cap.

---

## Quick "am I ready?" gate

Run this checklist top to bottom. **All items must say yes:**

- [ ] Vercel `EXPECTED_SCHEMA_VERSION` matches `select max(version) from schema_migrations` in prod DB
- [ ] `npm run build` + `npm run lint` + `npx tsc --noEmit` all clean locally on the deployed commit
- [ ] Stripe webhook hits prod URL on a test-mode `checkout.session.completed`
- [ ] Bunny upload completes in `<60s` for a 30s clip
- [ ] Resend "added to workspace" email arrives within 10s of inviting a teammate
- [ ] `/api/dev/quick-login` 404s in prod
- [ ] RLS regression suite passes against prod DB
- [ ] Sentry has received one or more events from prod
