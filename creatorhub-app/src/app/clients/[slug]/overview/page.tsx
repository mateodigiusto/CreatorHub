/**
 * Client Overview — the homepage for a single client.
 *
 * Pulls aggregated data from content_items + content_metrics + brand_profiles
 * + client_memberships and lays it out as an at-a-glance dashboard:
 * KPI strip → pipeline distribution + upcoming + top-performing →
 * brand-build progress + team + quick nav.
 *
 * Server component. All queries go through the SSR Supabase client so RLS
 * isolates rows to the caller's org automatically.
 */

import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  Sparkles,
  Compass,
  KanbanSquare,
  CalendarRange,
  BarChart3,
  Folder,
  ArrowUpRight,
  Eye,
  Heart,
  Send,
  Clock,
  TrendingUp,
  Users,
  AtSign,
  type LucideIcon,
} from "lucide-react";
import { requireClientAccess } from "@/lib/auth/require-client-access";
import { getSupabaseServer } from "@/lib/supabase/server";
import type { Client } from "@/lib/agency/types";
import {
  CONTENT_STATUSES,
  CONTENT_STATUS_LABEL,
  CONTENT_TYPE_LABEL,
  type ContentStatus,
  type ContentType,
} from "@/lib/agency/content";
import { BRAND_BUILD_FIELDS, STRATEGY_FIELDS } from "@/lib/agency/workspace-types";

// ─── Data shapes ─────────────────────────────────────────────────────

type ContentRow = {
  id: string;
  title: string;
  status: ContentStatus;
  content_type: ContentType;
  planned_post_date: string | null;
  published_at: string | null;
  metrics:
    | {
        views: number;
        likes: number;
        comments_count: number;
        shares: number;
        saves: number;
      }
    | { views: number; likes: number; comments_count: number; shares: number; saves: number }[]
    | null;
};

type BrandRow = {
  bio: string | null;
  mission: string | null;
  vision: string | null;
  values_text: string | null;
  voice: string | null;
  visual_style: string | null;
  audience_persona: string | null;
  audience_pain_points: string | null;
  unique_value_prop: string | null;
  positioning_statement: string | null;
  content_pillars: string[] | null;
  flagship_offer: string | null;
  signature_format: string | null;
  do_not_post: string | null;
  next_steps_goal: string | null;
  next_steps_focus: string | null;
  next_steps_metrics: string | null;
  next_steps_blockers: string | null;
};

type MembershipRow = {
  id: string;
  profile_id: string;
  access_role: "client_owner" | "team_assigned";
};

type ProfileRow = {
  user_id: string;
  display_name: string | null;
  handle: string | null;
  avatar_url: string | null;
};

type Member = {
  id: string;
  displayName: string;
  handle: string | null;
  avatarUrl: string | null;
  accessRole: "client_owner" | "team_assigned";
};

// ─── Helpers ─────────────────────────────────────────────────────────

function flattenMetrics(m: ContentRow["metrics"]) {
  if (!m) return { views: 0, likes: 0, comments_count: 0, shares: 0, saves: 0 };
  if (Array.isArray(m))
    return m[0] ?? { views: 0, likes: 0, comments_count: 0, shares: 0, saves: 0 };
  return m;
}

function compactNumber(n: number): string {
  if (n < 1000) return String(n);
  if (n < 10000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  if (n < 1_000_000) return Math.round(n / 1000) + "k";
  return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function fullDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("");
}

// ─── Page ────────────────────────────────────────────────────────────

export default async function ClientOverviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { client } = await requireClientAccess(slug);
  const supabase = await getSupabaseServer();

  const [contentRes, brandRes, membershipsRes] = await Promise.all([
    supabase
      .from("content_items")
      .select(
        `id, title, status, content_type, planned_post_date, published_at,
         metrics:content_metrics ( views, likes, comments_count, shares, saves )`,
      )
      .eq("client_id", client.id),
    supabase.from("brand_profiles").select("*").eq("client_id", client.id).maybeSingle(),
    supabase
      .from("client_memberships")
      .select("id, profile_id, access_role")
      .eq("client_id", client.id)
      .order("created_at", { ascending: true }),
  ]);

  const items = ((contentRes.data ?? []) as unknown as ContentRow[]).map((r) => ({
    ...r,
    metrics: flattenMetrics(r.metrics),
  }));
  const brand = (brandRes.data ?? null) as BrandRow | null;
  const memberships = (membershipsRes.data ?? []) as unknown as MembershipRow[];

  let members: Member[] = [];
  if (memberships.length > 0) {
    const ids = memberships.map((m) => m.profile_id);
    const profilesRes = await supabase
      .from("profiles")
      .select("user_id, display_name, handle, avatar_url")
      .in("user_id", ids);
    const profiles = ((profilesRes.data ?? []) as unknown as ProfileRow[]).reduce(
      (acc, p) => {
        acc[p.user_id] = p;
        return acc;
      },
      {} as Record<string, ProfileRow>,
    );
    members = memberships.map((m) => {
      const p = profiles[m.profile_id];
      return {
        id: m.id,
        displayName: p?.display_name || p?.handle || "Unknown",
        handle: p?.handle ?? null,
        avatarUrl: p?.avatar_url ?? null,
        accessRole: m.access_role,
      };
    });
  }

  // ─── Derived aggregates ──────────────────────────────────────────
  const totals = items.reduce(
    (acc, it) => {
      const m = it.metrics as {
        views: number;
        likes: number;
        comments_count: number;
        shares: number;
        saves: number;
      };
      acc.views += m.views;
      acc.engagement += m.likes + m.comments_count + m.shares + m.saves;
      return acc;
    },
    { views: 0, engagement: 0 },
  );
  const engagementRate = totals.views > 0 ? (totals.engagement / totals.views) * 100 : 0;
  const publishedCount = items.filter((i) => i.published_at).length;
  const inPipelineCount = items.length - publishedCount;

  const statusCounts = CONTENT_STATUSES.reduce(
    (acc, s) => {
      acc[s] = items.filter((i) => i.status === s).length;
      return acc;
    },
    {} as Record<ContentStatus, number>,
  );
  const maxStatusCount = Math.max(1, ...Object.values(statusCounts));

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming = items
    .filter((i) => i.planned_post_date && !i.published_at)
    .filter((i) => {
      const d = new Date(i.planned_post_date as string);
      return !isNaN(d.getTime()) && d >= today;
    })
    .sort(
      (a, b) =>
        new Date(a.planned_post_date as string).getTime() -
        new Date(b.planned_post_date as string).getTime(),
    )
    .slice(0, 4);

  const topPerforming = [...items]
    .filter((i) => i.published_at && (i.metrics as { views: number }).views > 0)
    .sort(
      (a, b) =>
        (b.metrics as { views: number }).views - (a.metrics as { views: number }).views,
    )
    .slice(0, 3);

  const recentlyPublished = [...items]
    .filter((i) => i.published_at)
    .sort(
      (a, b) =>
        new Date(b.published_at as string).getTime() -
        new Date(a.published_at as string).getTime(),
    )
    .slice(0, 3);

  // Brand completeness — count non-empty fields out of 18.
  const brandTotal = BRAND_BUILD_FIELDS.length + 1 + STRATEGY_FIELDS.length; // 13 + 1 pillars + 4 = 18
  let brandFieldsFilled = 0;
  if (brand) {
    const longFormCols: Array<keyof BrandRow> = [
      "bio",
      "mission",
      "vision",
      "values_text",
      "voice",
      "visual_style",
      "audience_persona",
      "audience_pain_points",
      "unique_value_prop",
      "positioning_statement",
      "flagship_offer",
      "signature_format",
      "do_not_post",
      "next_steps_goal",
      "next_steps_focus",
      "next_steps_metrics",
      "next_steps_blockers",
    ];
    for (const col of longFormCols) {
      if (brand[col]) brandFieldsFilled += 1;
    }
    if ((brand.content_pillars ?? []).length > 0) brandFieldsFilled += 1;
  }
  const brandPct = Math.round((brandFieldsFilled / brandTotal) * 100);

  return (
    <div className="grid gap-6">
      <KpiStrip
        views={totals.views}
        engagementRate={engagementRate}
        published={publishedCount}
        inPipeline={inPipelineCount}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 grid gap-6">
          <PipelinePanel
            slug={client.slug}
            counts={statusCounts}
            max={maxStatusCount}
            total={items.length}
          />
          <TopPerformingPanel slug={client.slug} items={topPerforming} />
          {brand && (brand.bio || brand.unique_value_prop || brand.audience_persona) && (
            <BrandSnapshotPanel slug={client.slug} brand={brand} />
          )}
        </div>

        <div className="grid gap-6 content-start">
          <UpcomingPanel slug={client.slug} items={upcoming} />
          <BrandProgressPanel
            slug={client.slug}
            filled={brandFieldsFilled}
            total={brandTotal}
            pct={brandPct}
            nextStepsGoal={brand?.next_steps_goal ?? null}
          />
          <RecentlyPublishedPanel slug={client.slug} items={recentlyPublished} />
          <TeamPanel slug={client.slug} members={members} />
          <ClientFactsPanel client={client} />
        </div>
      </div>

      <QuickNav slug={client.slug} />
    </div>
  );
}

// ─── KPI strip ───────────────────────────────────────────────────────

function KpiStrip({
  views,
  engagementRate,
  published,
  inPipeline,
}: {
  views: number;
  engagementRate: number;
  published: number;
  inPipeline: number;
}) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <KpiCard
        icon={Eye}
        label="Total reach"
        value={compactNumber(views)}
        sublabel={views === 0 ? "No published views yet" : "Across all posts"}
      />
      <KpiCard
        icon={Heart}
        label="Engagement rate"
        value={engagementRate > 0 ? engagementRate.toFixed(1) + "%" : "—"}
        sublabel={engagementRate > 0 ? "Likes + comments + shares + saves" : "Awaiting data"}
      />
      <KpiCard
        icon={Send}
        label="Published"
        value={String(published)}
        sublabel={published === 1 ? "post live" : "posts live"}
      />
      <KpiCard
        icon={Clock}
        label="In pipeline"
        value={String(inPipeline)}
        sublabel={inPipeline === 1 ? "piece in flight" : "pieces in flight"}
      />
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  sublabel,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sublabel: string;
}) {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <span className="text-[12px] text-muted">{label}</span>
        <div className="w-7 h-7 rounded-[8px] bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
          <Icon className="w-3.5 h-3.5" />
        </div>
      </div>
      <div
        className="text-[28px] font-semibold tracking-[-0.02em] text-text mt-3"
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {value}
      </div>
      <div className="text-[11.5px] text-muted mt-1">{sublabel}</div>
    </Card>
  );
}

// ─── Pipeline distribution ───────────────────────────────────────────

function PipelinePanel({
  slug,
  counts,
  max,
  total,
}: {
  slug: string;
  counts: Record<ContentStatus, number>;
  max: number;
  total: number;
}) {
  return (
    <Card>
      <CardHeader
        title="Pipeline at a glance"
        description={
          total === 0
            ? "No content yet — add the first idea to get started."
            : `${total} ${total === 1 ? "piece" : "pieces"} of content across 5 stages.`
        }
        action={
          <Link
            href={`/clients/${slug}/pipeline`}
            className="text-[12px] text-accent hover:underline inline-flex items-center gap-1"
          >
            Open pipeline
            <ArrowUpRight className="w-3 h-3" />
          </Link>
        }
      />
      <div className="grid gap-2.5">
        {CONTENT_STATUSES.map((s) => {
          const n = counts[s];
          const width = max > 0 ? (n / max) * 100 : 0;
          return (
            <div key={s} className="flex items-center gap-3">
              <span className="text-[12.5px] text-text w-16 shrink-0">
                {CONTENT_STATUS_LABEL[s]}
              </span>
              <div className="flex-1 h-2 rounded-full bg-surface-2 overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full transition-[width]"
                  style={{ width: `${width}%` }}
                />
              </div>
              <span
                className="text-[12.5px] text-text w-8 text-right"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {n}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ─── Top performing ──────────────────────────────────────────────────

function TopPerformingPanel({
  slug,
  items,
}: {
  slug: string;
  items: Array<{ id: string; title: string; content_type: ContentType; metrics: unknown }>;
}) {
  return (
    <Card>
      <CardHeader
        title="Top performing"
        description="Highest-view posts so far."
        action={
          <Link
            href={`/clients/${slug}/metrics`}
            className="text-[12px] text-accent hover:underline inline-flex items-center gap-1"
          >
            All metrics
            <ArrowUpRight className="w-3 h-3" />
          </Link>
        }
      />
      {items.length === 0 ? (
        <p className="text-[12.5px] text-muted py-4">
          No metrics yet. Publish a post and add views in the pipeline card to see it here.
        </p>
      ) : (
        <div className="grid gap-2">
          {items.map((it, idx) => {
            const m = it.metrics as {
              views: number;
              likes: number;
              comments_count: number;
              shares: number;
              saves: number;
            };
            return (
              <div
                key={it.id}
                className="flex items-center gap-3 py-2 px-3 rounded-[10px] hover:bg-accent/[0.04] transition-colors"
              >
                <span
                  className="w-6 text-[12px] text-muted text-center"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] text-text truncate">{it.title}</div>
                  <div className="text-[11.5px] text-muted">
                    {CONTENT_TYPE_LABEL[it.content_type]}
                  </div>
                </div>
                <div
                  className="text-[13px] text-text text-right shrink-0"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  <span className="inline-flex items-center gap-1 text-accent">
                    <TrendingUp className="w-3 h-3" />
                    {compactNumber(m.views)}
                  </span>
                  <div className="text-[11px] text-muted">
                    {compactNumber(m.likes + m.comments_count + m.shares + m.saves)} engagements
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

// ─── Brand snapshot ──────────────────────────────────────────────────

function BrandSnapshotPanel({ slug, brand }: { slug: string; brand: BrandRow }) {
  const rows: Array<{ label: string; value: string | null }> = [
    { label: "Bio", value: brand.bio },
    { label: "Unique value prop", value: brand.unique_value_prop },
    { label: "Audience", value: brand.audience_persona },
    { label: "Voice", value: brand.voice },
  ].filter((r) => Boolean(r.value));

  if (rows.length === 0) return null;

  return (
    <Card>
      <CardHeader
        title="Brand snapshot"
        description="The shorthand for who this creator is."
        action={
          <Link
            href={`/clients/${slug}/brand-build`}
            className="text-[12px] text-accent hover:underline inline-flex items-center gap-1"
          >
            Edit profile
            <ArrowUpRight className="w-3 h-3" />
          </Link>
        }
      />
      <div className="grid gap-3">
        {rows.map((r) => (
          <div key={r.label} className="grid grid-cols-[120px_1fr] gap-3">
            <span className="text-[12px] text-muted">{r.label}</span>
            <p className="text-[13px] text-text leading-relaxed line-clamp-3">{r.value}</p>
          </div>
        ))}
        {(brand.content_pillars ?? []).length > 0 && (
          <div className="grid grid-cols-[120px_1fr] gap-3">
            <span className="text-[12px] text-muted">Pillars</span>
            <div className="flex flex-wrap gap-1.5">
              {(brand.content_pillars ?? []).map((p) => (
                <Badge key={p} tone="accent">
                  {p}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

// ─── Upcoming ────────────────────────────────────────────────────────

function UpcomingPanel({
  slug,
  items,
}: {
  slug: string;
  items: Array<{
    id: string;
    title: string;
    content_type: ContentType;
    planned_post_date: string | null;
    status: ContentStatus;
  }>;
}) {
  return (
    <Card>
      <CardHeader
        title="Up next"
        description="Scheduled to post."
        action={
          <Link
            href={`/clients/${slug}/calendar`}
            className="text-[12px] text-accent hover:underline inline-flex items-center gap-1"
          >
            Calendar
            <ArrowUpRight className="w-3 h-3" />
          </Link>
        }
      />
      {items.length === 0 ? (
        <p className="text-[12.5px] text-muted py-2">
          Nothing scheduled. Plan posts from the pipeline.
        </p>
      ) : (
        <div className="grid gap-2.5">
          {items.map((it) => (
            <div key={it.id} className="flex items-start gap-3 py-1.5">
              <div className="w-9 shrink-0 text-center pt-0.5">
                <div
                  className="text-[11px] text-muted uppercase tracking-wide"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {new Date(it.planned_post_date as string).toLocaleDateString(undefined, {
                    month: "short",
                  })}
                </div>
                <div
                  className="text-[16px] font-semibold text-text leading-tight"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {new Date(it.planned_post_date as string).getDate()}
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] text-text truncate">{it.title}</div>
                <div className="text-[11.5px] text-muted">
                  {CONTENT_TYPE_LABEL[it.content_type]} ·{" "}
                  {CONTENT_STATUS_LABEL[it.status]}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ─── Brand progress ──────────────────────────────────────────────────

function BrandProgressPanel({
  slug,
  filled,
  total,
  pct,
  nextStepsGoal,
}: {
  slug: string;
  filled: number;
  total: number;
  pct: number;
  nextStepsGoal: string | null;
}) {
  return (
    <Card>
      <CardHeader title="Brand profile" description={`${filled} of ${total} fields filled.`} />
      <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
        <div
          className="h-full bg-accent rounded-full transition-[width]"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex items-center justify-between mt-2">
        <span
          className="text-[12px] text-muted"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {pct}% complete
        </span>
        <Link
          href={`/clients/${slug}/brand-build`}
          className="text-[12px] text-accent hover:underline inline-flex items-center gap-1"
        >
          {filled === 0 ? "Start" : filled === total ? "Review" : "Continue"}
          <ArrowUpRight className="w-3 h-3" />
        </Link>
      </div>
      {nextStepsGoal && (
        <div className="mt-4 pt-4 border-t border-border/60">
          <div className="text-[11.5px] text-muted uppercase tracking-wide mb-1">
            Current 30-day goal
          </div>
          <p className="text-[12.5px] text-text leading-relaxed line-clamp-3">
            {nextStepsGoal}
          </p>
        </div>
      )}
    </Card>
  );
}

// ─── Recently published ──────────────────────────────────────────────

function RecentlyPublishedPanel({
  slug,
  items,
}: {
  slug: string;
  items: Array<{
    id: string;
    title: string;
    content_type: ContentType;
    published_at: string | null;
    metrics: unknown;
  }>;
}) {
  return (
    <Card>
      <CardHeader
        title="Recently published"
        description={
          items.length === 0 ? "Nothing posted yet." : "The latest live posts."
        }
        action={
          items.length > 0 ? (
            <Link
              href={`/clients/${slug}/pipeline`}
              className="text-[12px] text-accent hover:underline inline-flex items-center gap-1"
            >
              History
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          ) : undefined
        }
      />
      {items.length === 0 ? (
        <p className="text-[12.5px] text-muted">
          Once a post is marked published, it shows up here.
        </p>
      ) : (
        <div className="grid gap-2">
          {items.map((it) => {
            const m = it.metrics as { views: number };
            return (
              <div key={it.id} className="flex items-baseline justify-between gap-3 py-1">
                <div className="min-w-0 flex-1">
                  <div className="text-[12.5px] text-text truncate">{it.title}</div>
                  <div className="text-[11.5px] text-muted">
                    {shortDate(it.published_at as string)} ·{" "}
                    {CONTENT_TYPE_LABEL[it.content_type]}
                  </div>
                </div>
                <span
                  className="text-[12px] text-muted shrink-0 inline-flex items-center gap-1"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  <Eye className="w-3 h-3" />
                  {compactNumber(m.views)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

// ─── Team ────────────────────────────────────────────────────────────

function TeamPanel({ slug, members }: { slug: string; members: Member[] }) {
  return (
    <Card>
      <CardHeader
        title="Team"
        description={
          members.length === 0
            ? "No team members assigned."
            : `${members.length} ${members.length === 1 ? "person" : "people"} on this client.`
        }
        action={
          <Link
            href={`/clients/${slug}/settings`}
            className="text-[12px] text-accent hover:underline inline-flex items-center gap-1"
          >
            Manage
            <ArrowUpRight className="w-3 h-3" />
          </Link>
        }
      />
      {members.length === 0 ? (
        <div className="flex items-center gap-2 text-[12.5px] text-muted">
          <Users className="w-4 h-4" />
          Invite teammates from Settings.
        </div>
      ) : (
        <div className="grid gap-2.5">
          {members.slice(0, 5).map((m) => (
            <div key={m.id} className="flex items-center gap-3">
              <Avatar member={m} />
              <div className="min-w-0 flex-1">
                <div className="text-[13px] text-text truncate">{m.displayName}</div>
                <div className="text-[11.5px] text-muted">
                  {m.accessRole === "client_owner" ? "Client owner" : "Team"}
                </div>
              </div>
            </div>
          ))}
          {members.length > 5 && (
            <div className="text-[11.5px] text-muted pt-1">
              +{members.length - 5} more
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function Avatar({ member }: { member: Member }) {
  if (member.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={member.avatarUrl}
        alt=""
        className="w-7 h-7 rounded-full object-cover border border-border"
      />
    );
  }
  return (
    <div className="w-7 h-7 rounded-full bg-accent/10 border border-accent/20 text-accent text-[11px] font-semibold flex items-center justify-center">
      {initials(member.displayName) || "?"}
    </div>
  );
}

// ─── Client facts ────────────────────────────────────────────────────

function ClientFactsPanel({ client }: { client: Client }) {
  return (
    <Card>
      <CardHeader title="Client" description="The basics." />
      <dl className="grid gap-2.5 text-[12.5px]">
        <FactRow label="Slug" value={<code className="font-mono text-[11.5px]">{client.slug}</code>} />
        <FactRow
          label="Instagram"
          value={
            client.instagramHandle ? (
              <span className="inline-flex items-center gap-1 text-accent">
                <AtSign className="w-3 h-3" />
                {client.instagramHandle.replace(/^@/, "")}
              </span>
            ) : (
              <span className="text-muted">—</span>
            )
          }
        />
        <FactRow label="Created" value={fullDate(client.createdAt)} />
        <FactRow label="Last updated" value={fullDate(client.updatedAt)} />
      </dl>
    </Card>
  );
}

function FactRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="text-text text-right truncate">{value}</dd>
    </div>
  );
}

// ─── Quick navigation ────────────────────────────────────────────────

type QuickLink = {
  key: string;
  title: string;
  description: string;
  icon: LucideIcon;
};

const QUICK_LINKS: QuickLink[] = [
  {
    key: "brand-build",
    title: "Brand Build",
    description: "Long-form brand profile + AI transcript analyzer.",
    icon: Sparkles,
  },
  {
    key: "strategy",
    title: "Strategy",
    description: "Next-quarter pillars, target audience, content goals.",
    icon: Compass,
  },
  {
    key: "pipeline",
    title: "Pipeline",
    description: "Kanban: idea → script → film → edit → post.",
    icon: KanbanSquare,
  },
  {
    key: "calendar",
    title: "Calendar",
    description: "Month view of scheduled and posted content.",
    icon: CalendarRange,
  },
  {
    key: "metrics",
    title: "Metrics",
    description: "Views, top posts, format breakdown.",
    icon: BarChart3,
  },
  {
    key: "assets",
    title: "Assets",
    description: "Folder tree, raw clips, published files, SOPs.",
    icon: Folder,
  },
];

function QuickNav({ slug }: { slug: string }) {
  return (
    <div>
      <h2 className="text-[14px] font-semibold tracking-[-0.005em] text-text mb-3">
        Jump in
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {QUICK_LINKS.map((q) => {
          const Icon = q.icon;
          return (
            <Link
              key={q.key}
              href={`/clients/${slug}/${q.key}`}
              className="block group"
            >
              <Card lift padded className="h-full">
                <div className="w-8 h-8 rounded-[8px] bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="text-[13px] font-semibold text-text mt-3">
                  {q.title}
                </div>
                <div className="text-[11.5px] text-muted mt-0.5 leading-snug line-clamp-2">
                  {q.description}
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

