"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, LayoutGrid, Rows3 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { TaskCard } from "@/components/team/TaskCard";
import { NewTaskModal } from "@/components/team/NewTaskModal";
import {
  StatusBadge,
  PriorityChip,
  FormatChip,
  ClientChip,
  MemberAvatar,
} from "@/components/team/bits";
import {
  useDemoTeam,
  dueLabel,
  STATUS_LABEL,
  STATUS_ORDER,
  type Task,
} from "@/lib/demo/team";

type View = "board" | "table";

export default function ProductionPage() {
  const router = useRouter();
  const { tasks, memberById, ready } = useDemoTeam();
  const [view, setView] = useState<View>("board");
  const [modalOpen, setModalOpen] = useState(false);

  const stats = useMemo(() => {
    const active = tasks.filter((t) => t.status !== "done").length;
    const review = tasks.filter((t) => t.status === "in_review").length;
    const overdue = tasks.filter(
      (t) => t.status !== "done" && dueLabel(t.dueDate).overdue,
    ).length;
    const done = tasks.filter((t) => t.status === "done").length;
    return { active, review, overdue, done };
  }, [tasks]);

  const grouped = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const s of STATUS_ORDER) map[s] = [];
    for (const t of tasks) map[t.status].push(t);
    return map;
  }, [tasks]);

  if (!ready) {
    return (
      <div className="h-[400px] rounded-[14px] bg-surface-2 border border-border animate-pulse" />
    );
  }

  return (
    <>
      <PageHeader
        title="Production"
        description="Every edit across your team — briefed, tracked, and delivered."
        actions={
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="w-4 h-4" /> New task
          </Button>
        }
      />

      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatTile label="Active" value={stats.active} />
        <StatTile label="In review" value={stats.review} tone="amber" />
        <StatTile label="Overdue" value={stats.overdue} tone="red" />
        <StatTile label="Done" value={stats.done} tone="green" />
      </div>

      <div className="flex items-center justify-between gap-3 mb-4">
        <Tabs<View>
          value={view}
          onChange={setView}
          options={[
            { value: "board", label: "Board" },
            { value: "table", label: "Table" },
          ]}
        />
        <div className="text-[12px] text-muted hidden sm:flex items-center gap-1.5">
          {view === "board" ? (
            <LayoutGrid className="w-3.5 h-3.5" />
          ) : (
            <Rows3 className="w-3.5 h-3.5" />
          )}
          {tasks.length} tasks
        </div>
      </div>

      {view === "board" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          {STATUS_ORDER.map((status) => (
            <div key={status} className="min-w-0">
              <div className="flex items-center gap-2 mb-3 px-1">
                <h2 className="text-[12.5px] font-semibold text-text">
                  {STATUS_LABEL[status]}
                </h2>
                <span className="text-[11.5px] text-muted">
                  {grouped[status].length}
                </span>
              </div>
              <div className="flex flex-col gap-3">
                {grouped[status].length === 0 ? (
                  <div className="rounded-[12px] border border-dashed border-border py-6 text-center text-[12px] text-muted">
                    Nothing here
                  </div>
                ) : (
                  grouped[status].map((t) => (
                    <TaskCard
                      key={t.id}
                      task={t}
                      href={`/production/${t.id}`}
                      showAssignee
                    />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card padded={false} className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-muted">
                  <th className="font-medium px-4 py-2.5">Task</th>
                  <th className="font-medium px-4 py-2.5">Assignee</th>
                  <th className="font-medium px-4 py-2.5">Status</th>
                  <th className="font-medium px-4 py-2.5">Due</th>
                  <th className="font-medium px-4 py-2.5">Priority</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((t) => {
                  const due = dueLabel(t.dueDate);
                  return (
                    <tr
                      key={t.id}
                      onClick={() => router.push(`/production/${t.id}`)}
                      className="border-t border-border hover:bg-accent/[0.04] cursor-pointer"
                    >
                      <td className="px-4 py-3 max-w-[360px]">
                        <div className="text-[13px] font-medium text-text truncate">
                          {t.title}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <ClientChip client={t.client} />
                          <FormatChip format={t.format} />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5">
                          <MemberAvatar member={memberById(t.assigneeId)} size={22} />
                          <span className="text-[12.5px] text-text-2">
                            {memberById(t.assigneeId)?.name}
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={t.status} />
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            due.overdue
                              ? "text-[12.5px] font-medium text-error"
                              : "text-[12.5px] text-text-2"
                          }
                        >
                          {due.text}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <PriorityChip priority={t.priority} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <NewTaskModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}

function StatTile({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "amber" | "red" | "green";
}) {
  const color: Record<string, string> = {
    neutral: "var(--text)",
    amber: "var(--warning)",
    red: "var(--error)",
    green: "var(--success)",
  };
  return (
    <Card className="py-4">
      <div
        className="text-[26px] font-semibold tracking-[-0.02em]"
        style={{ color: color[tone], fontVariantNumeric: "tabular-nums" }}
      >
        {value}
      </div>
      <div className="text-[12px] text-muted mt-0.5">{label}</div>
    </Card>
  );
}
