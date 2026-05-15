"use client";

import { use, useMemo, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { KanbanBoard } from "@/components/agency/pipeline/KanbanBoard";
import { ContentCardDialog } from "@/components/agency/pipeline/ContentCardDialog";
import { usePipelineState } from "@/components/agency/pipeline/usePipelineState";
import {
  CONTENT_STATUSES,
  type ContentItemWithMetrics,
  type ContentStatus,
} from "@/lib/agency/content";

/**
 * Pipeline tab — kanban of all content items for a client, grouped by the
 * 5 statuses (idea/script/film/edit/post). Drag rearranges with optimistic
 * UI; the route handler persists status + position.
 *
 * Phase 2 owns the [slug]/layout.tsx that wraps this in AppShell + SubNav.
 * Until Phase 2 lands, the page renders standalone.
 */
export default function PipelinePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const state = usePipelineState(slug);
  const [openId, setOpenId] = useState<string | null>(null);

  const itemsByStatus = useMemo(() => {
    const map = {} as Record<ContentStatus, ContentItemWithMetrics[]>;
    for (const s of CONTENT_STATUSES) map[s] = [];
    for (const item of state.items) map[item.status].push(item);
    for (const s of CONTENT_STATUSES) {
      map[s].sort((a, b) => a.position - b.position);
    }
    return map;
  }, [state.items]);

  const openItem = openId
    ? state.items.find((i) => i.id === openId) ?? null
    : null;

  return (
    <div className="p-6">
      <PageHeader
        title="Pipeline"
        description="Plan, write, film, edit, post — one card per piece of content."
        actions={
          <Button onClick={() => state.createInColumn("idea")}>
            <Plus className="w-4 h-4" />
            Add idea
          </Button>
        }
      />

      {state.loading ? (
        <div className="flex items-center justify-center py-20 text-muted">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : state.error ? (
        <p className="text-[13px] text-[var(--error)]">{state.error}</p>
      ) : state.items.length === 0 ? (
        <EmptyState
          title="Pipeline is empty"
          description="Add your first content idea to start the workflow."
          primaryAction={{
            label: "Add idea",
            onClick: () => state.createInColumn("idea"),
          }}
        />
      ) : (
        <KanbanBoard
          statuses={CONTENT_STATUSES}
          itemsByStatus={itemsByStatus}
          onCreate={state.createInColumn}
          onOpen={setOpenId}
          onMove={state.moveCard}
        />
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
