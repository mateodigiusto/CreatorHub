"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import {
  CONTENT_STATUS_LABEL,
  type ContentItemWithMetrics,
  type ContentStatus,
} from "@/lib/agency/content";
import { ContentCard } from "./ContentCard";

type Props = {
  statuses: readonly ContentStatus[];
  itemsByStatus: Record<ContentStatus, ContentItemWithMetrics[]>;
  onCreate: (status: ContentStatus) => void;
  onOpen: (id: string) => void;
  onMove: (id: string, toStatus: ContentStatus, toIndex: number) => void;
};

function Column({
  status,
  items,
  onCreate,
  onOpen,
}: {
  status: ContentStatus;
  items: ContentItemWithMetrics[];
  onCreate: (status: ContentStatus) => void;
  onOpen: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `col-${status}`,
    data: { status, isColumn: true },
  });
  return (
    <div className="flex flex-col min-w-[260px] flex-1">
      <div className="flex items-center justify-between mb-2 px-1">
        <h3 className="text-[12px] font-semibold uppercase tracking-[0.06em] text-muted">
          {CONTENT_STATUS_LABEL[status]}
          <span className="ml-1.5 text-text-2 tabular-nums">{items.length}</span>
        </h3>
        <button
          onClick={() => onCreate(status)}
          className="text-muted hover:text-accent transition-colors"
          aria-label={`Add ${CONTENT_STATUS_LABEL[status]}`}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 bg-surface-2 rounded-[12px] p-2 space-y-2 min-h-[120px] transition-colors ${
          isOver ? "ring-2 ring-accent/40" : ""
        }`}
      >
        <SortableContext
          items={items.map((i) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          {items.map((item) => (
            <ContentCard key={item.id} item={item} onOpen={onOpen} />
          ))}
        </SortableContext>
        {items.length === 0 && (
          <div className="text-[12px] text-muted text-center py-6 select-none">
            Drop items here
          </div>
        )}
      </div>
    </div>
  );
}

export function KanbanBoard({
  statuses,
  itemsByStatus,
  onCreate,
  onOpen,
  onMove,
}: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const allItems = useMemo(
    () => statuses.flatMap((s) => itemsByStatus[s] ?? []),
    [statuses, itemsByStatus],
  );
  const activeItem = activeId
    ? allItems.find((i) => i.id === activeId) ?? null
    : null;

  function findStatus(id: string): ContentStatus | null {
    if (id.startsWith("col-")) return id.slice(4) as ContentStatus;
    const found = allItems.find((i) => i.id === id);
    return found ? found.status : null;
  }

  function handleStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function handleEnd(e: DragEndEvent) {
    const activeIdStr = String(e.active.id);
    setActiveId(null);
    if (!e.over) return;
    const overId = String(e.over.id);
    const toStatus = findStatus(overId);
    if (!toStatus) return;

    const destItems = itemsByStatus[toStatus] ?? [];
    let insertIndex: number;
    if (overId.startsWith("col-")) {
      insertIndex = destItems.length;
    } else {
      const overIndex = destItems.findIndex((i) => i.id === overId);
      insertIndex = overIndex === -1 ? destItems.length : overIndex;
    }

    const current = allItems.find((i) => i.id === activeIdStr);
    if (current && current.status === toStatus) {
      const currentIndex = destItems.findIndex((i) => i.id === activeIdStr);
      if (currentIndex === insertIndex) return;
      if (currentIndex < insertIndex) insertIndex -= 1;
    }

    onMove(activeIdStr, toStatus, insertIndex);
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleStart} onDragEnd={handleEnd}>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {statuses.map((status) => (
          <Column
            key={status}
            status={status}
            items={itemsByStatus[status] ?? []}
            onCreate={onCreate}
            onOpen={onOpen}
          />
        ))}
      </div>
      <DragOverlay>
        {activeItem ? (
          <div className="rotate-1">
            <ContentCard item={activeItem} onOpen={() => {}} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
