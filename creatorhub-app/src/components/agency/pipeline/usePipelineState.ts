"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CONTENT_STATUSES,
  midpointPosition,
  type ContentItemWithMetrics,
  type ContentStatus,
  type MetricField,
} from "@/lib/agency/content";
import { useOptimisticErrorReporter } from "@/lib/agency/use-optimistic-toast";

/**
 * Owns the in-memory ordered map of content items for a client's pipeline.
 * Drag operations mutate state optimistically, then POST .../move with the
 * midpoint position. On error, the previous state is restored.
 */
export function usePipelineState(slug: string) {
  const [items, setItems] = useState<ContentItemWithMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reportError = useOptimisticErrorReporter();

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`/api/clients/${slug}/content`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = (await res.json()) as { items: ContentItemWithMetrics[] };
      setItems(body.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount
    void load();
  }, [load]);

  const createInColumn = useCallback(
    async (status: ContentStatus) => {
      try {
        const res = await fetch(`/api/clients/${slug}/content`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status, title: "Untitled" }),
        });
        if (!res.ok) {
          await reportError(res);
          return;
        }
        const { item } = (await res.json()) as { item: ContentItemWithMetrics };
        setItems((prev) => [...prev, { ...item, metrics: null }]);
      } catch (e) {
        await reportError(e);
      }
    },
    [slug, reportError],
  );

  const remove = useCallback(
    async (id: string) => {
      let before: ContentItemWithMetrics[] = [];
      setItems((prev) => {
        before = prev;
        return prev.filter((i) => i.id !== id);
      });
      try {
        const res = await fetch(`/api/clients/${slug}/content/${id}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          setItems(before);
          await reportError(res);
        }
      } catch (e) {
        setItems(before);
        await reportError(e);
      }
    },
    [slug, reportError],
  );

  const patch = useCallback(
    async (id: string, fields: Partial<ContentItemWithMetrics>) => {
      let before: ContentItemWithMetrics[] = [];
      setItems((prev) => {
        before = prev;
        return prev.map((i) => (i.id === id ? { ...i, ...fields } : i));
      });
      try {
        const res = await fetch(`/api/clients/${slug}/content/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(fields),
        });
        if (!res.ok) {
          setItems(before);
          await reportError(res);
        }
      } catch (e) {
        setItems(before);
        await reportError(e);
      }
    },
    [slug, reportError],
  );

  const moveCard = useCallback(
    async (id: string, toStatus: ContentStatus, toIndex: number) => {
      let before: ContentItemWithMetrics[] = [];
      let newPosition = 0;
      setItems((all) => {
        before = all;
        const dest = all
          .filter((i) => i.status === toStatus && i.id !== id)
          .sort((a, b) => a.position - b.position);
        const prev = toIndex > 0 ? dest[toIndex - 1]?.position ?? null : null;
        const next = dest[toIndex]?.position ?? null;
        newPosition = midpointPosition(prev, next);
        return all.map((i) =>
          i.id === id ? { ...i, status: toStatus, position: newPosition } : i,
        );
      });
      try {
        const res = await fetch(`/api/clients/${slug}/content/${id}/move`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: toStatus, position: newPosition }),
        });
        if (!res.ok) {
          setItems(before);
          await reportError(res);
        }
      } catch (e) {
        setItems(before);
        await reportError(e);
      }
    },
    [slug, reportError],
  );

  const saveMetrics = useCallback(
    async (id: string, patchMetrics: Partial<Record<MetricField, number>>) => {
      const res = await fetch(`/api/clients/${slug}/content/${id}/metrics`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patchMetrics),
      });
      if (!res.ok) return;
      const { metrics } = await res.json();
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, metrics } : i)),
      );
    },
    [slug],
  );

  return {
    items,
    loading,
    error,
    statuses: CONTENT_STATUSES,
    createInColumn,
    remove,
    patch,
    moveCard,
    saveMetrics,
    reload: load,
  };
}
