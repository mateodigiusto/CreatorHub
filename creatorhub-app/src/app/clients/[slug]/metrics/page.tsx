"use client";

import { use, useState } from "react";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { MetricsDashboard } from "@/components/agency/metrics/MetricsDashboard";
import { ContentCardDialog } from "@/components/agency/pipeline/ContentCardDialog";
import { usePipelineState } from "@/components/agency/pipeline/usePipelineState";

export default function MetricsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const state = usePipelineState(slug);
  const [openId, setOpenId] = useState<string | null>(null);

  const openItem = openId
    ? state.items.find((i) => i.id === openId) ?? null
    : null;

  return (
    <div className="p-6">
      <PageHeader
        title="Metrics"
        description="Aggregated performance across the entire pipeline."
      />

      {state.loading ? (
        <div className="flex items-center justify-center py-20 text-muted">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : state.error ? (
        <p className="text-[13px] text-[var(--error)]">{state.error}</p>
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
