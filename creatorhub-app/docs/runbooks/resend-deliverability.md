# Resend deliverability runbook

CreatorHub uses Resend for: org invites, client invites, content-comment notifications, plan-limit / bandwidth alerts. If SPF / DKIM / DMARC aren't configured before Phase 1 invite emails go live, those messages land in Gmail spam, Outlook junk, or get bounced. Resend ships with sane defaults; the failure mode is forgetting to ship the DNS records.

This runbook is the one-time setup. After this, Resend's dashboard shows green status indicators and `RESEND_FROM` is safe to wire.

---

## 1. Pick the sending domain

Two options:

| Domain | Pros | Cons |
|---|---|---|
| `creatorhub.app` (root) | Cleanest, recognizable | Touches MX / Google Workspace if used |
| `mail.creatorhub.app` (subdomain) | Isolates email reputation | Slightly less recognizable to recipients |

**Recommendation: `mail.creatorhub.app`.** Reputational accidents (a customer marks an invite as spam) stay scoped to the subdomain — they don't poison your transactional / corporate email. Resend's docs lean this way too.

`RESEND_FROM` for the rest of this runbook is assumed to be `noreply@mail.creatorhub.app`.

---

## 2. Resend domain registration

1. Sign in to **resend.com → Domains → + Add Domain**.
2. Enter `mail.creatorhub.app`.
3. Region: pick the one closest to most of your users (likely `us-east-1`).
4. Resend renders four DNS records:
   - MX (Resend MX, priority 10)
   - TXT (SPF: `v=spf1 include:_spf.resend.com ~all`)
   - TXT (DKIM, `resend._domainkey`, a long public key)
   - TXT (DMARC, `_dmarc`, `v=DMARC1; p=none; rua=mailto:dmarc@…`)

Leave the page open — you'll come back to verify.

---

## 3. DNS configuration

Wherever the apex domain is managed (Cloudflare / Namecheap / Vercel DNS), add the four records above **under the `mail.` subdomain**. The DKIM record name is the trickiest — Resend gives it as `resend._domainkey.mail.creatorhub.app`; some providers want you to enter just `resend._domainkey.mail` because they auto-append the apex.

**TTL:** 300 seconds (5 min) during setup. Bump to 3600 once verified.

**Cloudflare-specific gotcha:** turn the "proxy" toggle **off** on all four records (orange-cloud → grey-cloud). Cloudflare's proxy strips MX / TXT semantics.

### DMARC starter policy

Start with `p=none`, not `p=quarantine` or `p=reject`. `p=none` collects reports without affecting delivery. Tighten to `p=quarantine` after two weeks of clean reports.

```
v=DMARC1; p=none; pct=100; rua=mailto:dmarc-reports@creatorhub.app; aspf=s; adkim=s
```

The `rua=` mailbox should exist. If you don't have a real inbox for it, point it at a dummy Google Group with no members — Google still receives and silently drops, but you can flip a forwarder on later.

---

## 4. Verify in Resend

Back in the Resend dashboard, click **Verify DNS**. Records propagate in 5–30 minutes. All four indicators turn green.

If one stays red after 30 minutes:

```bash
# Verify each record type from the command line
dig +short mx mail.creatorhub.app
dig +short txt mail.creatorhub.app
dig +short txt resend._domainkey.mail.creatorhub.app
dig +short txt _dmarc.mail.creatorhub.app
```

Compare exactly with the Resend dashboard values. Common mistakes: missing trailing dot, wrong subdomain depth, smart-quotes pasted from a doc.

---

## 5. Wire env vars

After all four turn green:

```
# .env.local and Vercel project envs (prod + preview)
RESEND_API_KEY=re_…                           # from Resend → API Keys
RESEND_FROM="CreatorHub <noreply@mail.creatorhub.app>"
```

Sanity-check by sending a test email from the local app:

```bash
cd creatorhub-app
npx tsx <(cat <<'EOF'
import { sendEmail } from "./src/lib/email/send";
await sendEmail({
  to: "your.real.address@gmail.com",
  subject: "Resend test from CreatorHub",
  text: "If you can read this, deliverability is wired."
});
EOF
)
```

Confirm: lands in **Inbox**, not Spam. Check Gmail "Show original" — both `SPF: PASS` and `DKIM: PASS` and `DMARC: PASS` should appear.

---

## 6. Warm-up

If you go from 0 → 10k invites in a week, you'll trip Gmail's volume heuristics even with perfect DNS. Recommended ramp for the first two weeks:

| Day 1–3 | < 50 emails / day |
| Day 4–7 | < 500 / day |
| Day 8–14 | < 5,000 / day |
| Day 15+ | unrestricted |

Resend automatically warms up the IP pool for you — you mostly just need to not blast 50k invites on Day 1.

---

## 7. Reputation monitoring

After Phase 1 invites go live:

- **Resend dashboard → Logs**: filter on `bounced` and `complained`. >1% complaint rate = something is wrong (template, list hygiene, missing unsubscribe). Investigate within 24h.
- **Postmaster Tools**: enable `postmaster.google.com` (TXT verification) so you can see Gmail's view of your domain reputation.
- **DMARC reports**: weekly check of `dmarc-reports@…` for forging attempts.

When all of the above are green for two weeks, tighten DMARC to `p=quarantine; pct=10` and ramp `pct` to 100 over a month. Don't jump to `p=reject` until DMARC reports are clean for at least one month at `p=quarantine`.

---

## 8. Failure recovery

If deliverability tanks (sudden spike of `bounced` in Resend logs):

1. **Stop high-volume sends immediately.** Pause the org-invite cron, if any.
2. Check Resend's domain status — sometimes Resend rotates IPs and the new one is on a blocklist.
3. `dig +short txt _dmarc.mail.creatorhub.app` — confirm DNS hasn't been clobbered by another team member.
4. https://mxtoolbox.com/blacklists.aspx — paste `mail.creatorhub.app` and Resend's mailserver IP. If listed, file removal requests with each blocklist.
5. If Gmail Postmaster shows "Bad domain reputation": pause sends for 48h, then resume at Day-1 warmup levels.

---

## Sign-off checklist

- [ ] Domain registered in Resend; all four DNS records green.
- [ ] `RESEND_API_KEY` + `RESEND_FROM` in Vercel (prod + preview) + `.env.local`.
- [ ] Test email from `npx tsx` lands in Gmail inbox with SPF/DKIM/DMARC = PASS.
- [ ] Gmail Postmaster Tools verification submitted.
- [ ] `dmarc-reports@creatorhub.app` mailbox or group exists and is receiving.
- [ ] DMARC `p=quarantine` scheduled for two weeks from go-live (calendar reminder).
