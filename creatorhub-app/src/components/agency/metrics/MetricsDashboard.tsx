"use client";

import { useMemo } from "react";
import { Eye, Heart, MessageCircle, Bookmark, Share2 } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { BarRow } from "@/components/charts/BarRow";
import {
  CONTENT_STATUS_LABEL,
  CONTENT_TYPES,
  CONTENT_TYPE_LABEL,
  type ContentItemWithMetrics,
  type ContentType,
} from "@/lib/agency/content";

type Props = {
  items: ContentItemWithMetrics[];
  onOpen: (id: string) => void;
};

type Totals = {
  views: number;
  likes: number;
  comments_count: number;
  shares: number;
  saves: number;
};

const EMPTY_TOTALS: Totals = {
  views: 0,
  likes: 0,
  comments_count: 0,
  shares: 0,
  saves: 0,
};

export function MetricsDashboard({ items, onOpen }: Props) {
  const totals = useMemo<Totals>(() => {
    return items.reduce<Totals>((acc, i) => {
      const m = i.metrics;
      if (!m) return acc;
      return {
        views: acc.views + (m.views ?? 0),
        likes: acc.likes + (m.likes ?? 0),
        comments_count: acc.comments_count + (m.comments_count ?? 0),
        shares: acc.shares + (m.shares ?? 0),
        saves: acc.saves + (m.saves ?? 0),
      };
    }, EMPTY_TOTALS);
  }, [items]);

  const topPosts = useMemo(
    () =>
      [...items]
        .filter((i) => i.metrics && (i.metrics.views ?? 0) > 0)
        .sort((a, b) => (b.metrics?.views ?? 0) - (a.metrics?.views ?? 0))
        .slice(0, 5),
    [items],
  );

  const byType = useMemo(() => {
    const counts: Record<ContentType, { count: number; views: number }> =
      CONTENT_TYPES.reduce(
        (acc, t) => ({ ...acc, [t]: { count: 0, views: 0 } }),
        {} as Record<ContentType, { count: number; views: number }>,
      );
    for (const i of items) {
      counts[i.content_type].count += 1;
      counts[i.content_type].views += i.metrics?.views ?? 0;
    }
    return CONTENT_TYPES.map((t) => ({
      type: t,
      label: CONTENT_TYPE_LABEL[t],
      ...counts[t],
    })).filter((row) => row.count > 0);
  }, [items]);

  const maxTypeViews = Math.max(1, ...byType.map((r) => r.views));

  if (items.length === 0) {
    return (
      <EmptyState
        title="No content yet"
        description="Add items to the pipeline to start tracking metrics."
        showSampleDataCta={false}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatTile icon={<Eye />} label="Views" value={totals.views} />
        <StatTile icon={<Heart />} label="Likes" value={totals.likes} />
        <StatTile
          icon={<MessageCircle />}
          label="Comments"
          value={totals.comments_count}
        />
        <StatTile icon={<Share2 />} label="Shares" value={totals.shares} />
        <StatTile icon={<Bookmark />} label="Saves" value={totals.saves} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader
            title="Top posts"
            description="Highest-viewed content this client"
          />
          {topPosts.length === 0 ? (
            <p className="text-[13px] text-muted">
              No views recorded yet. Add metrics from a content card.
            </p>
          ) : (
            <ul className="divide-y divide-border -mx-5">
              {topPosts.map((item) => (
                <li
                  key={item.id}
                  onClick={() => onOpen(item.id)}
                  className="flex items-center justify-between gap-3 px-5 py-3 cursor-pointer hover:bg-accent/[0.04] transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-text truncate">
                      {item.title || "Untitled"}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge tone="accent">
                        {CONTENT_STATUS_LABEL[item.status]}
                      </Badge>
                      <span className="text-[11.5px] text-muted">
                        {CONTENT_TYPE_LABEL[item.content_type]}
                      </span>
                    </div>
                  </div>
                  <span className="text-[13px] font-semibold tabular-nums text-text">
                    {(item.metrics?.views ?? 0).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Format breakdown"
            description="Views by content type"
          />
          {byType.length === 0 ? (
            <p className="text-[13px] text-muted">
              Set a content type on items to see the breakdown.
            </p>
          ) : (
            <div className="space-y-2.5">
              {byType.map((row) => (
                <BarRow
                  key={row.type}
                  label={row.label}
                  value={row.views}
                  max={maxTypeViews}
                />
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <Card padded={false} className="px-4 py-3">
      <div className="flex items-center gap-1.5 text-muted text-[11.5px] uppercase tracking-[0.06em] font-semibold mb-1">
        <span className="[&_svg]:w-3.5 [&_svg]:h-3.5">{icon}</span>
        {label}
      </div>
      <p className="text-[22px] font-semibold tracking-[-0.02em] text-text tabular-nums">
        {value.toLocaleString()}
      </p>
    </Card>
  );
}
