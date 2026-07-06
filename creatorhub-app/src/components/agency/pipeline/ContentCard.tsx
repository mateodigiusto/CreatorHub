"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CalendarDays, Eye, Hash } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import {
  CONTENT_TYPE_LABEL,
  emptyHooks,
  type ContentItemWithMetrics,
} from "@/lib/agency/content";

export function ContentCard({
  item,
  onOpen,
}: {
  item: ContentItemWithMetrics;
  onOpen: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, data: { status: item.status } });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const dateLabel = item.planned_post_date
    ? new Date(item.planned_post_date).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
    : null;
  const views = item.metrics?.views ?? 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-surface border border-border rounded-[12px] p-3 cursor-grab active:cursor-grabbing hover:border-accent/40 transition-colors"
      onDoubleClick={(e) => {
        e.stopPropagation();
        onOpen(item.id);
      }}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <p className="text-[13px] font-medium text-text leading-snug line-clamp-2">
          {item.title || "Untitled"}
        </p>
        <Badge tone="neutral">{CONTENT_TYPE_LABEL[item.content_type]}</Badge>
      </div>
      {!emptyHooks(item) && (
        <p className="text-[12px] text-muted line-clamp-2 mb-2">
          <Hash className="inline w-3 h-3 mr-1 -mt-0.5" />
          {item.hook_a || item.hook_b || item.hook_c}
        </p>
      )}
      <div className="flex items-center justify-between gap-2 mt-2">
        <div className="flex items-center gap-2 text-[11.5px] text-muted">
          {dateLabel && (
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="w-3 h-3" />
              {dateLabel}
            </span>
          )}
          {views > 0 && (
            <span className="inline-flex items-center gap-1 tabular-nums">
              <Eye className="w-3 h-3" />
              {views.toLocaleString()}
            </span>
          )}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpen(item.id);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="text-[11.5px] text-accent hover:underline"
        >
          Open
        </button>
      </div>
    </div>
  );
}
