"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/cn";

type Card = {
  id: string;
  title: string;
  status: "draft" | "scheduled" | "published" | "other";
  scheduledAt: string | null;
  publishedAt: string | null;
  updatedAt: string;
  clientUserId: string;
  clientName: string;
  relationshipId: string;
};

type Response = { cards: Card[]; clients: Array<{ id: string; name: string; relationshipId: string }> };

const COLUMNS: Array<{ key: Card["status"]; label: string }> = [
  { key: "draft", label: "Draft" },
  { key: "scheduled", label: "Scheduled" },
  { key: "published", label: "Published" },
];

export function CrossClientPipeline() {
  const [data, setData] = useState<Response | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [clientFilter, setClientFilter] = useState<string>("all");

  const load = useCallback(async () => {
    setError(null);
    try {
      const r = await fetch("/api/clients/pipeline", { credentials: "include" });
      if (!r.ok) {
        setError(`Failed (${r.status})`);
        setData({ cards: [], clients: [] });
        return;
      }
      const json = (await r.json()) as Response;
      setData(json);
    } catch {
      setError("network_error");
      setData({ cards: [], clients: [] });
    }
  }, []);

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --- one-shot bootstrap */
    void load();
  }, [load]);

  if (data === null) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-[260px] rounded-[12px] bg-surface-2 border border-border animate-pulse"
          />
        ))}
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-[10px] border border-red-500/30 bg-red-500/5 px-3 py-2 text-[12.5px] text-red-700 dark:text-red-300">
        Couldn&apos;t load pipeline: {error}
      </div>
    );
  }

  const filtered = data.cards.filter((c) => {
    if (clientFilter === "all") return true;
    return c.clientUserId === clientFilter;
  });

  if (data.clients.length === 0) {
    return (
      <div className="rounded-[12px] border border-border bg-surface card-base p-6 text-center">
        <div className="text-[14px] font-semibold text-text">
          No active client relationships.
        </div>
        <div className="text-[12px] text-muted mt-1.5 max-w-[420px] mx-auto">
          Once a creator accepts your invite, their sequences show up here grouped
          by status across all your clients.
        </div>
      </div>
    );
  }

  return (
    <div>
      {data.clients.length > 1 && (
        <div className="flex flex-wrap items-center gap-1.5 mb-4">
          <FilterChip
            label={`All clients · ${data.cards.length}`}
            active={clientFilter === "all"}
            onClick={() => setClientFilter("all")}
          />
          {data.clients.map((c) => {
            const count = data.cards.filter((card) => card.clientUserId === c.id).length;
            return (
              <FilterChip
                key={c.id}
                label={count > 0 ? `${c.name} · ${count}` : c.name}
                active={clientFilter === c.id}
                onClick={() => setClientFilter(c.id)}
              />
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {COLUMNS.map((col) => {
          const cardsInCol = filtered.filter((c) => c.status === col.key);
          return (
            <div
              key={col.key}
              className="rounded-[12px] border border-border bg-surface card-base p-3"
            >
              <div className="flex items-center justify-between mb-2.5 px-1">
                <div className="text-[11.5px] font-semibold uppercase text-muted tracking-wide">
                  {col.label}
                </div>
                <div className="text-[11.5px] font-semibold text-text tabular-nums">
                  {cardsInCol.length}
                </div>
              </div>
              {cardsInCol.length === 0 ? (
                <div className="text-[11.5px] text-muted text-center py-6">
                  Nothing here yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {cardsInCol.slice(0, 30).map((card) => (
                    <PipelineCard key={card.id} card={card} />
                  ))}
                  {cardsInCol.length > 30 && (
                    <div className="text-[11px] text-muted text-center pt-1">
                      +{cardsInCol.length - 30} more
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PipelineCard({ card }: { card: Card }) {
  const dateLabel =
    card.status === "scheduled" && card.scheduledAt
      ? new Date(card.scheduledAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
      : card.status === "published" && card.publishedAt
        ? new Date(card.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
        : null;

  return (
    <Link
      href={card.relationshipId ? `/clients/${card.relationshipId}` : "#"}
      className="lift block rounded-[10px] border border-border bg-surface-2 p-2.5 cursor-pointer"
    >
      <div className="text-[13px] font-medium text-text leading-snug line-clamp-2">
        {card.title}
      </div>
      <div className="flex items-center justify-between mt-2 text-[11px] text-muted">
        <span className="truncate flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-accent" />
          {card.clientName}
        </span>
        {dateLabel && (
          <span className="inline-flex items-center gap-1 shrink-0">
            <Calendar className="w-3 h-3" /> {dateLabel}
          </span>
        )}
      </div>
    </Link>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-2.5 py-1 rounded-full border text-[12px] cursor-pointer transition-colors",
        active
          ? "border-accent/40 bg-accent-soft text-accent font-medium"
          : "border-border bg-surface text-muted hover:border-accent/30 hover:text-text",
      )}
    >
      {label}
    </button>
  );
}

void ArrowUpRight;
