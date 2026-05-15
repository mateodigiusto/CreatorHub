"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
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
        <div className="flex items-center justify-center py-20 text-muted">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : state.error ? (
        <p className="text-[13px] text-[var(--error)]">{state.error}</p>
      ) : scheduled.length === 0 ? (
        <EmptyState
          title="Nothing scheduled yet"
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
