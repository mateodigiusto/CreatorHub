# Stripe activation runbook

Stripe Checkout + webhooks + Customer Portal are wired in code (commit `3742ba3`) but every route is gated on `STRIPE_SECRET_KEY` being set. While it's unset, onboarding step 8 falls back to its UI-only mock (writes `profile.trial` to localStorage + DB but takes no money). Settings → Manage subscription toasts "Billing not set up yet."

To flip the whole system live, do this once. After that, every new sign-up that completes onboarding lands on Stripe Checkout.

---

## 1. Stripe Dashboard setup

1. Sign in to **dashboard.stripe.com**. Make sure you're in **Test mode** for the first run (toggle top-right). Activate live mode only after you've verified the test flow end-to-end.

2. **Products → + Create product**:
   - Name: `CreatorHub Standard` · Description: "1 user · all Sequence Studio features."
     - Add price: **$67.00 USD · Recurring · Monthly** → save the price ID (starts with `price_…`)
     - Add price: **$26.80 USD · Recurring · Yearly** (or however you want to express the 60% annual discount) → save price ID
   - Name: `CreatorHub Pro` · Description: "Unlimited users · multi-client agencies."
     - Add price: **$149.00 USD · Recurring · Monthly** → save price ID
     - Add price: **$59.60 USD · Recurring · Yearly** → save price ID

3. **Developers → API keys**:
   - Copy the **Secret key** (starts with `sk_test_…`).
   - Copy the **Publishable key** (starts with `pk_test_…`).

4. **Developers → Webhooks → + Add endpoint**:
   - Endpoint URL: `https://creatorhub.app/api/webhooks/stripe` (use your real prod domain). For staging/preview, register a separate endpoint pointing at the staging URL.
   - Events to send (3): `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`. (Optionally also `customer.subscription.created`.)
   - After creating, click into the endpoint → **Signing secret** → reveal → copy (starts with `whsec_…`).

5. **Settings → Billing → Customer portal**: enable it, configure what customers can change (cancel, switch plans, update payment method). Defaults are fine.

---

## 2. Set env vars

Set these in **Vercel → Project Settings → Environment Variables** (Production + Preview separately) **and** in your local `creatorhub-app/.env.local`:

```
STRIPE_SECRET_KEY=sk_test_…
STRIPE_PUBLISHABLE_KEY=pk_test_…
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_…    # same value, exposed to the browser
STRIPE_WEBHOOK_SECRET=whsec_…
STRIPE_PRICE_STANDARD_MONTHLY=price_…
STRIPE_PRICE_STANDARD_ANNUAL=price_…
STRIPE_PRICE_PRO_MONTHLY=price_…
STRIPE_PRICE_PRO_ANNUAL=price_…
APP_URL=https://creatorhub.app                  # canonical URL for return links
```

After saving in Vercel, **redeploy** — Vercel doesn't auto-rebuild on env var changes.

---

## 3. Verify (test mode)

1. Sign in to a fresh test account on the deployed URL.
2. Walk through onboarding to step 8, pick a plan, click **Start 7-day free trial**.
3. You should land on Stripe-hosted checkout. Use test card `4242 4242 4242 4242`, any future expiry, any 3-digit CVC, any postcode.
4. Submit → you're redirected to `/onboarding?stripe=success` → step 9 success screen.
5. **Verify the webhook fired**:
   ```sql
   select status, plan, cycle, current_period_end, cancel_at_period_end
   from subscriptions
   where user_id = '<your-test-user-id>';
   ```
   You should see `status='trialing'`, the picked plan/cycle, `current_period_end` ~7 days out.
6. **Verify Settings reflects it**: Settings page → Plan card shows the right price + "billed yearly · 60% off" badge if annual.
7. **Verify Manage subscription works**: click → opens the Customer Portal → cancel from there → webhook fires `customer.subscription.deleted` → DB row flips to `status='canceled'`.

---

## 4. Go live

1. Stripe Dashboard → toggle to **Live mode**.
2. Recreate the products + prices in live mode (test-mode IDs don't carry over). Note the new live `price_…` IDs.
3. Get the live secret/publishable keys from **Developers → API keys** in live mode.
4. Register the webhook endpoint again in live mode (separate from test-mode endpoint).
5. Update Vercel envs with the live keys + price IDs. Redeploy.
6. Run the test flow once with a **real card you'll cancel within the trial** to confirm production behavior.

---

## 5. Common issues

| Symptom | Likely cause |
|---|---|
| Step 8 button does nothing, no redirect | `STRIPE_SECRET_KEY` unset. Falls back to mock — check browser network tab for 503 from `/api/stripe/checkout-session`. |
| Webhook returns 400 `invalid_signature` | `STRIPE_WEBHOOK_SECRET` doesn't match the dashboard's signing secret. They are *per-endpoint* — staging and prod have different secrets. |
| `subscriptions` row not written after checkout | Webhook URL wrong / not registered. Check Stripe Dashboard → Webhooks → endpoint → recent events. |
| Settings "Manage subscription" 404 `no_customer` | User completed mock checkout (Stripe wasn't configured at the time) — they have `trial_*` columns set but no `stripe_customer_id`. Fix: have them re-onboard or run a backfill checkout. |

---

## 6. What's still out of scope (for next time)

- `stripe_events` idempotency table — currently relying on row-level `UNIQUE(stripe_subscription_id)` upsert. Fine until volume picks up; revisit at first sign of duplicate-event bugs.
- Pro-rated upgrades from Standard → Pro mid-cycle. Stripe handles this if the user does it via the Customer Portal; our webhook picks up the new price on `customer.subscription.updated`.
- Tax handling (Stripe Tax) — enable at first paying customer in a tax-relevant jurisdiction.
- Annual-discount UX polish — currently the "60% off" copy is hardcoded in the StepPlan component. If pricing changes, update both `PRICING` in [src/components/onboarding/steps.tsx](../../src/components/onboarding/steps.tsx) and the actual Stripe price.
