"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { TabEmptyState } from "@/components/agency/TabEmptyState";
import { MetricsSkeleton } from "@/components/agency/Skeleton";
import { MetricsDashboard } from "@/components/agency/metrics/MetricsDashboard";
import { ContentCardDialog } from "@/components/agency/pipeline/ContentCardDialog";
import { usePipelineState } from "@/components/agency/pipeline/usePipelineState";

export function WorkspaceMetricsClient({ slug }: { slug: string }) {
  const state = usePipelineState(slug);
  const [openId, setOpenId] = useState<string | null>(null);

  const openItem = openId
    ? state.items.find((i) => i.id === openId) ?? null
    : null;

  return (
    <div className="p-6">
      <PageHeader
        title="Metrics"
        description="How everything published is performing."
      />

      {state.loading ? (
        <MetricsSkeleton />
      ) : state.error ? (
        <p className="text-[13px] text-[var(--error)]">{state.error}</p>
      ) : state.items.length === 0 ? (
        <TabEmptyState
          title="No metrics yet"
          description="Once your team publishes posts and adds performance numbers, this dashboard fills in."
        />
      ) : (
        <MetricsDashboard items={state.items} onOpen={setOpenId} />
      )}

      {openItem && (
        <ContentCardDialog
          item={openItem}
          onClose={() => setOpenId(null)}
          onPatch={state.patch}
          onPatchMetrics={state.saveMetrics}
          onDelete={state.remove}
        />
      )}
    </div>
  );
}
