"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { TabEmptyState } from "@/components/agency/TabEmptyState";
import { CalendarSkeleton } from "@/components/agency/Skeleton";
import { MonthCalendar } from "@/components/agency/calendar/MonthCalendar";
import { ContentCardDialog } from "@/components/agency/pipeline/ContentCardDialog";
import { usePipelineState } from "@/components/agency/pipeline/usePipelineState";

export function WorkspaceCalendarClient({ slug }: { slug: string }) {
  const state = usePipelineState(slug);
  const [openId, setOpenId] = useState<string | null>(null);

  const scheduled = state.items.filter((i) => i.planned_post_date);
  const openItem = openId
    ? state.items.find((i) => i.id === openId) ?? null
    : null;

  return (
    <div className="p-6">
      <PageHeader
        title="Calendar"
        description="Every scheduled piece of content for the month."
      />

      {state.loading ? (
        <CalendarSkeleton />
      ) : state.error ? (
        <p className="text-[13px] text-[var(--error)]">{state.error}</p>
      ) : scheduled.length === 0 ? (
        <TabEmptyState
          title="Nothing scheduled"
          description="Once content has a planned post date, it will show up here."
        />
      ) : (
        <MonthCalendar items={scheduled} onOpen={setOpenId} />
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
