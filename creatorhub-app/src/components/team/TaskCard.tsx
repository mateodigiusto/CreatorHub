"use client";

import Link from "next/link";
import { MessageSquare, Paperclip, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import {
  dueLabel,
  useDemoTeam,
  STATUS_ORDER,
  STATUS_LABEL,
  type Task,
  type TaskStatus,
} from "@/lib/demo/team";
import {
  StatusBadge,
  PriorityChip,
  FormatChip,
  ClientChip,
  MemberAvatar,
} from "./bits";

export function TaskCard({
  task,
  href,
  showAssignee = false,
  draggable = false,
  dragging = false,
  onDragStart,
  onDragEnd,
  onDelete,
  onMove,
}: {
  task: Task;
  href: string;
  showAssignee?: boolean;
  draggable?: boolean;
  dragging?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  onDelete?: () => void;
  onMove?: (status: TaskStatus) => void;
}) {
  const { memberById } = useDemoTeam();
  const due = dueLabel(task.dueDate);
  const assignee = memberById(task.assigneeId);

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        draggable && "cursor-grab active:cursor-grabbing",
        dragging && "opacity-50",
      )}
    >
      <Link href={href} draggable={false} className="block relative group">
        <Card lift className="h-full">
          {onDelete && (
            <button
              type="button"
              data-nodrag
              aria-label="Delete task"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete();
              }}
              className="absolute top-2 right-2 z-10 w-7 h-7 grid place-items-center rounded-[8px] text-muted opacity-70 sm:opacity-0 sm:group-hover:opacity-100 hover:text-error hover:bg-error/10 transition-[opacity,color,background-color] cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <div className="flex items-center gap-1.5 flex-wrap mb-2.5 pr-7">
            <ClientChip client={task.client} />
            <FormatChip format={task.format} />
            <span className="flex-1" />
            <StatusBadge status={task.status} />
          </div>

          <div className="text-[14px] font-semibold text-text leading-snug">
            {task.title}
          </div>

          <div className="flex items-center justify-between gap-2 mt-3.5 pt-3 border-t border-border">
            <div className="flex items-center gap-3">
              <span
                className={
                  due.overdue
                    ? "text-[11.5px] font-medium text-error"
                    : "text-[11.5px] text-muted"
                }
              >
                {due.text}
              </span>
              <PriorityChip priority={task.priority} />
            </div>
            <div className="flex items-center gap-2.5 text-muted">
              {task.comments.length > 0 && (
                <span className="inline-flex items-center gap-1 text-[11.5px]">
                  <MessageSquare className="w-3.5 h-3.5" />
                  {task.comments.length}
                </span>
              )}
              {task.deliverableUrl && (
                <Paperclip className="w-3.5 h-3.5" />
              )}
              {showAssignee && <MemberAvatar member={assignee} size={22} />}
            </div>
          </div>

          {/* Mobile-only tap-to-move (drag is desktop-only) */}
          {onMove && (
            <div
              data-nodrag
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              className="sm:hidden mt-3"
            >
              <select
                aria-label="Move task"
                value={task.status}
                onChange={(e) => onMove(e.target.value as TaskStatus)}
                className="w-full h-8 rounded-[8px] border border-border bg-surface-2 text-[12px] text-text-2 px-2 cursor-pointer focus:outline-none focus:border-accent/50"
              >
                {STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>
                    Move to: {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </div>
          )}
        </Card>
      </Link>
    </div>
  );
}
