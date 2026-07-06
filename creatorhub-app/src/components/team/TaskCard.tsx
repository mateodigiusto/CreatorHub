"use client";

import Link from "next/link";
import { MessageSquare, Paperclip } from "lucide-react";
import { Card } from "@/components/ui/Card";
import {
  dueLabel,
  useDemoTeam,
  type Task,
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
}: {
  task: Task;
  href: string;
  showAssignee?: boolean;
}) {
  const { memberById } = useDemoTeam();
  const due = dueLabel(task.dueDate);
  const assignee = memberById(task.assigneeId);

  return (
    <Link href={href} className="block">
      <Card lift className="h-full">
        <div className="flex items-center gap-1.5 flex-wrap mb-2.5">
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
      </Card>
    </Link>
  );
}
