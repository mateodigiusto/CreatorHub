"use client";

import { useMemo, useState } from "react";
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
import type { ClientAccessRole } from "@/lib/agency/_phase2_deps";
import {
  canCreatePipelineCards,
  canMovePipelineCards,
} from "@/lib/agency/viewer";

/**
 * Mirrors `src/app/clients/[slug]/pipeline/page.tsx` (Phase 4) but
 * gates the create + move actions on viewer role.
 */
export function WorkspacePipelineClient({
  slug,
  viewerRole,
}: {
  slug: string;
  viewerRole: ClientAccessRole;
}) {
  const state = usePipelineState(slug);
  const [openId, setOpenId] = useState<string | null>(null);

  const canCreate = canCreatePipelineCards(viewerRole);
  const canMove = canMovePipelineCards(viewerRole);

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
        description="Every piece of content, from idea to posted."
        actions={
          canCreate ? (
            <Button onClick={() => state.createInColumn("idea")}>
              <Plus className="h-4 w-4" />
              Add idea
            </Button>
          ) : null
        }
      />

      {state.loading ? (
        <div className="flex items-center justify-center py-20 text-muted">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : state.error ? (
        <p className="text-[13px] text-[var(--error)]">{state.error}</p>
      ) : state.items.length === 0 ? (
        <EmptyState
          title="No content yet"
          description={
            canCreate
              ? "Add your first idea to start the workflow."
              : "Your team is still planning. Check back soon."
          }
          primaryAction={
            canCreate
              ? {
                  label: "Add idea",
                  onClick: () => state.createInColumn("idea"),
                }
              : undefined
          }
          showSampleDataCta={false}
        />
      ) : (
        <KanbanBoard
          statuses={CONTENT_STATUSES}
          itemsByStatus={itemsByStatus}
          onCreate={canCreate ? state.createInColumn : noopColumn}
          onOpen={setOpenId}
          onMove={canMove ? state.moveCard : noopMove}
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

function noopColumn(_status: ContentStatus): void {
  /* read-only viewer */
}

function noopMove(_id: string, _to: ContentStatus, _idx: number): void {
  /* read-only viewer */
}
