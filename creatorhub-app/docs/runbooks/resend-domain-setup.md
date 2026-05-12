# Resend domain setup runbook

Resolves agency-clients-module §11 open question #1 ("Resend domain — DEFERRED").

Email-sending code is already wired in [`src/lib/email/send.ts`](../../src/lib/email/send.ts); Phase 8 added three transactional templates (org invite, client workspace invite, content comment) in [`src/lib/email/agency-templates.ts`](../../src/lib/email/agency-templates.ts) and notifiers in [`src/lib/email/agency-notify.ts`](../../src/lib/email/agency-notify.ts). The code no-ops with `{ sent: false, reason: 'unconfigured' }` when env vars are absent, so the app deploys safely while the domain is still being verified.

This runbook is the checklist to make those emails actually deliver.

---

## 1. Decide the sending domain

Recommended: `noreply@creatorhub.app` or `team@creatorhub.app`.

`EMAIL_FROM` must be a verified domain on the Resend account. Sending from `@gmail.com` / `@outlook.com` / any free-mail provider is blocked — DMARC reject policies on those domains will bounce your messages.

If `creatorhub.app` is not the production domain yet, use a subdomain you control (`mail.creatorhub.app`) so the apex isn't tied up while the rest of the brand is still being decided.

## 2. Add the Resend domain

1. Sign in at [resend.com](https://resend.com/) → **Domains** → **Add Domain**.
2. Enter the sending domain (e.g. `creatorhub.app` or `mail.creatorhub.app`).
3. Resend shows three DNS records to add:
   - **SPF** — `TXT` record at the apex/subdomain with `v=spf1 include:_spf.resend.com ~all`.
   - **DKIM** — `TXT` record at `resend._domainkey.<your-domain>` with the long `p=` public key Resend generates.
   - **MX** — optional, only required if you want Resend to handle inbound. Skip for transactional-only.

## 3. Add the DNS records

Apply each record verbatim at the DNS host. Cloudflare / Vercel DNS / Route 53 all accept the same payload — just paste.

| Type | Name | Value | TTL |
|---|---|---|---|
| `TXT` | `@` (or subdomain) | `v=spf1 include:_spf.resend.com ~all` | 3600 |
| `TXT` | `resend._domainkey` | (copy from Resend dashboard) | 3600 |
| `TXT` | `_dmarc` | `v=DMARC1; p=none; rua=mailto:postmaster@<your-domain>` | 3600 |

The DMARC record is **not** in Resend's wizard but is required for sustainable deliverability. Start with `p=none` (monitor mode) so you can see failure reports before tightening. Move to `p=quarantine` after two clean weeks.

## 4. Verify in Resend

Back in the dashboard → click **Verify**. Verification typically completes within five minutes; some providers take up to 24h to propagate.

If verification stalls:
- Run `dig +short TXT resend._domainkey.<your-domain>` and confirm the value matches Resend's value.
- Cloudflare adds the subdomain after a comma sometimes; ensure the record name is `resend._domainkey` not `resend._domainkey.creatorhub.app.creatorhub.app`.

## 5. Set env vars

Local dev (`creatorhub-app/.env.local`):

```
RESEND_API_KEY=re_…
EMAIL_FROM=team@creatorhub.app
```

Production (Vercel project → Settings → Environment Variables, set in Production + Preview):

```
RESEND_API_KEY=re_…              (Production API key from resend.com → API Keys)
EMAIL_FROM=team@creatorhub.app
```

Both env vars are already declared in [`.env.example`](../../.env.example).

## 6. Send a test email

From `creatorhub-app/`:

```bash
npm run dev
# trigger any of:
#   • org invite (POST /api/organizations/:id/members)  — Phase 1 route
#   • client workspace invite (POST /api/clients/:slug/members)  — Phase 2 route
#   • content comment (POST /api/clients/:slug/content/:id/comments)  — Phase 5 route
```

Confirm the receiver's inbox shows the message. Open the message source and verify:
- `Authentication-Results` header shows `spf=pass` and `dkim=pass`.
- The reply-to / from address matches `EMAIL_FROM`.

## 7. Done-when

- [ ] Resend dashboard shows the domain as `Verified`.
- [ ] A test send from `sendEmail()` lands in inbox (not spam).
- [ ] Headers show `spf=pass` and `dkim=pass`.
- [ ] DMARC report email starts arriving at `postmaster@<domain>` within a few days.
- [ ] `EMAIL_FROM` set in Vercel production + preview environments.

## Risks

| Risk | Mitigation |
|---|---|
| First test sends land in spam | New sending domains have no reputation. Warm up with low volume (10s of emails) before broadcasting. |
| DKIM `p=` value too long for one DNS TXT record | DNS allows multiple quoted strings per TXT — concatenate at lookup. Most modern panels handle this automatically. |
| Cloudflare DNS prefixes the record name automatically | If your record name shows as `resend._domainkey.creatorhub.app` in the panel, that's the apex; do not append the domain again. |
| `EMAIL_FROM` set, `RESEND_API_KEY` missing | `sendEmail` returns `{ sent: false, reason: 'unconfigured' }` — the request still succeeds but no email is delivered. Watch for this silent failure mode in staging. |
| Domain swapped after Phase 1 invites started landing | Resend keeps history per-domain; switching mid-flight orphans deliverability stats. Decide on a final domain before user 2. |
