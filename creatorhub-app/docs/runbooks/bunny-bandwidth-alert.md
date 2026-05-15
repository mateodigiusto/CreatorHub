# Bunny.net bandwidth alert runbook

Bunny.net Stream bills on **bandwidth delivered**, not minutes of source video. A single autoplay-prone tile loop or an embed shared in a Slack channel can rack up far more than a Cloudflare per-minute model would. The `<VideoPlayer>` rules (poster-only, `preload="none"`, click-to-play) prevent the obvious self-inflicted spike — but a malicious or runaway client can still blow through plan limits.

Phase 8 ships a per-org monthly bandwidth alert. This runbook is the spec.

---

## Alert criteria

Fire a Sentry warning (with `tag: bandwidth_alert`) and append a row to `audit_log` (`action: 'bandwidth.alert'`) when **any** of the following is true for an org in the current billing period:

| Plan | Daily threshold | Monthly threshold |
|---|---|---|
| free / no plan | 1 GB | 5 GB |
| starter | 5 GB | 50 GB |
| pro | 50 GB | 500 GB |
| scale | 500 GB | 5 TB |

Bunny's `/library/{id}/statistics?dateFrom=…&dateTo=…` endpoint returns aggregate bandwidth for the library; we partition by `videoId` to attribute to clients. Per-client attribution lives in `asset_videos.bunny_video_id`.

---

## Data model (deferred migration `0038_bunny_bandwidth.sql`)

```sql
-- One row per (organization, ymd). Idempotent on (organization_id, captured_on).
create table public.bunny_bandwidth_daily (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  captured_on date not null,
  bytes_delivered bigint not null,
  requests bigint not null,
  created_at timestamptz default now(),
  unique (organization_id, captured_on)
);
create index bunny_bw_org_idx on public.bunny_bandwidth_daily(organization_id, captured_on desc);

revoke all on public.bunny_bandwidth_daily from anon, authenticated;
```

**Why not RLS-readable?** The dashboard surface is "you're at X% of monthly quota" — no need to expose per-day rows. Aggregate via a server-only read.

---

## Cron job (deferred to Phase 8)

A daily job (Vercel cron `0 6 * * *` UTC) extends `src/app/api/cron/run-jobs/route.ts` with a `bunny_bandwidth` kind. The handler:

```ts
import { fetchBunnyBandwidthByVideo } from "@/lib/bunny/bandwidth"; // new
import { PLANS } from "@/lib/billing/plans";

// For each organization with bunny videos in the last 24h:
//   1. fetchBunnyBandwidthByVideo(yesterday) → { videoId, bytes, requests }[]
//   2. join videoId → asset_videos → clients → organization_id
//   3. sum per org
//   4. upsert into bunny_bandwidth_daily
//   5. compute current period total (sum since billing period start)
//   6. compare to thresholds → if exceeded, addBreadcrumb + audit row + email org admins
```

The Bunny API is paginated by date range, not by video id, so the read is per-library, not per-org. Total per-org is a downstream aggregation.

---

## Email template (Resend, deferred to Phase 8)

`src/lib/email/agency-templates.ts → bandwidthAlertEmail({ org, plan, periodPct, monthlyUsageGB, monthlyLimitGB })`:

> Subject: `Heads up: ${org.name} is at ${periodPct}% of its monthly video bandwidth`
>
> Body (text, no inline images):
> ```
> Hi ${recipient.name},
>
> ${org.name} (plan: ${plan}) has delivered ${monthlyUsageGB.toFixed(1)} GB
> of video bandwidth this billing period. That's ${periodPct}% of the
> ${monthlyLimitGB} GB included in your plan.
>
> Where to look:
>   • Manage subscription → https://creatorhub.app/settings/billing
>   • Asset library      → https://creatorhub.app/clients
>
> Why this matters: video delivery is the largest variable cost on a
> creator agency plan. If a client embed is being hammered, you may want
> to pause or move it.
>
> — CreatorHub
> ```

Send only **once per (org, billing period, threshold-band)** — store the last threshold reached in `organizations.bandwidth_alert_band` (deferred column). Don't spam an admin every cron tick.

---

## Manual investigation queries

When an alert fires, run:

```sql
-- a) Per-client breakdown for the period
select c.slug, c.display_name, sum(bb.bytes_delivered) / 1e9 as gb_delivered
from public.bunny_bandwidth_daily bb
join public.asset_videos av on av.bunny_video_id is not null  -- TODO: join key
join public.clients c on c.id = av.client_id
where bb.organization_id = '<org_uuid>'
  and bb.captured_on >= date_trunc('month', now())::date
group by c.slug, c.display_name
order by gb_delivered desc;

-- b) Top video by bandwidth (needs per-video table — phase 8.5)
-- TODO: extend bunny_bandwidth_daily to per-video grain if attribution becomes critical
```

---

## Bunny dashboard cross-check

Open https://dash.bunny.net → Stream → Statistics. The "Total bandwidth" line should match (within 5%) the sum of `bunny_bandwidth_daily.bytes_delivered` for the same period. If it doesn't:

- API returns *per-region* bandwidth — confirm we sum across all regions in the fetch.
- Timezone — Bunny reports UTC. The cron also uses UTC. If `captured_on` looks shifted by a day, check the cron's date math.

---

## Hard mitigation: pull a video offline

If a single video is responsible:

```ts
// One-shot, service-role
import { deleteVideo } from "@/lib/bunny/client";
await deleteVideo("<guid>");
// Then mark the asset row so the UI shows "removed" instead of "playable"
await sb.from("asset_videos").update({ bunny_video_status: "failed", deleted_at: new Date() }).eq("bunny_video_id", "<guid>");
```

A 410 response from Bunny is acceptable here — the row is gone. The DB row stays so the audit trail survives.

---

## Sign-off checklist (Phase 8)

- [ ] Migration `0038_bunny_bandwidth.sql` applied.
- [ ] Cron `bunny_bandwidth` kind merged into `src/app/api/cron/run-jobs/route.ts`.
- [ ] One synthetic alert fired end-to-end (drop a row that exceeds threshold, verify Sentry + email).
- [ ] Bunny dashboard total reconciles within 5% for a 7-day window.
