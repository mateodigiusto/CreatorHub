"use client";

import { use, useState } from "react";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { MonthCalendar } from "@/components/agency/calendar/MonthCalendar";
import { ContentCardDialog } from "@/components/agency/pipeline/ContentCardDialog";
import { usePipelineState } from "@/components/agency/pipeline/usePipelineState";

export default function CalendarPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const state = usePipelineState(slug);
  const [openId, setOpenId] = useState<string | null>(null);

  const scheduledItems = state.items.filter((i) => i.planned_post_date);
  const openItem = openId
    ? state.items.find((i) => i.id === openId) ?? null
    : null;

  return (
    <div className="p-6">
      <PageHeader
        title="Calendar"
        description="Month view of every scheduled piece of content."
      />

      {state.loading ? (
        <div className="flex items-center justify-center py-20 text-muted">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : state.error ? (
        <p className="text-[13px] text-[var(--error)]">{state.error}</p>
      ) : scheduledItems.length === 0 ? (
        <EmptyState
          title="No scheduled content"
          description="Set a planned post date on a pipeline item to see it here."
          showSampleDataCta={false}
        />
      ) : (
        <MonthCalendar items={scheduledItems} onOpen={setOpenId} />
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
