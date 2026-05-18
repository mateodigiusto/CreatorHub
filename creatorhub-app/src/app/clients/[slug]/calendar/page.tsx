"use client";

import { use, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { TabEmptyState } from "@/components/agency/TabEmptyState";
import { CalendarSkeleton } from "@/components/agency/Skeleton";
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
        <CalendarSkeleton />
      ) : state.error ? (
        <p className="text-[13px] text-[var(--error)]">{state.error}</p>
      ) : scheduledItems.length === 0 ? (
        <TabEmptyState
          title="Nothing scheduled"
          description="Set a planned post date on a pipeline item to see it here."
          primaryAction={{
            label: "Open pipeline",
            href: `/clients/${slug}/pipeline`,
          }}
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
