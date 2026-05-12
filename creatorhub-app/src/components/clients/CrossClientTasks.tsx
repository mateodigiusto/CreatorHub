"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Clock, AlertCircle, CheckCircle2, ArrowUpRight } from "lucide-react";
import { Tabs } from "@/components/ui/Tabs";
import { cn } from "@/lib/cn";

type TaskFilter = "open" | "pending" | "in_progress" | "done" | "all";

type Task = {
  id: string;
  relationshipId: string;
  title: string;
  notes: string | null;
  status: "pending" | "in_progress" | "done";
  recurrence: string;
  deadline: string | null;
  assignedTo: string;
  createdBy: string;
  createdAt: string;
  completedAt: string | null;
  clientId: string | null;
  clientName: string;
};

const STATUS_COPY: Record<Task["status"], { label: string; tone: "neutral" | "accent" | "green" }> = {
  pending: { label: "Pending", tone: "neutral" },
  in_progress: { label: "In progress", tone: "accent" },
  done: { label: "Done", tone: "green" },
};

export function CrossClientTasks() {
  const [tab, setTab] = useState<TaskFilter>("open");
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const r = await fetch(`/api/clients/tasks?status=${tab}`, {
        credentials: "include",
      });
      if (!r.ok) {
        setError(`Failed (${r.status})`);
        setTasks([]);
        return;
      }
      const json = (await r.json()) as { tasks: Task[] };
      setTasks(json.tasks);
    } catch {
      setError("network_error");
      setTasks([]);
    }
  }, [tab]);

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --- reload on tab change */
    void load();
  }, [load]);

  return (
    <div>
      <div className="mb-4">
        <Tabs<TaskFilter>
          value={tab}
          onChange={setTab}
          options={[
            { value: "open", label: "Open" },
            { value: "pending", label: "Pending" },
            { value: "in_progress", label: "In progress" },
            { value: "done", label: "Done" },
            { value: "all", label: "All" },
          ]}
        />
      </div>

      {tasks === null ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-[60px] rounded-[12px] bg-surface-2 border border-border animate-pulse"
            />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-[10px] border border-red-500/30 bg-red-500/5 px-3 py-2 text-[12.5px] text-red-700 dark:text-red-300">
          Couldn&apos;t load tasks: {error}
        </div>
      ) : tasks.length === 0 ? (
        <div className="rounded-[12px] border border-border bg-surface card-base p-8 text-center">
          <div className="text-[13.5px] font-medium text-text">
            No tasks in this view.
          </div>
          <div className="text-[12px] text-muted mt-1">
            Switch tabs to see other statuses.
          </div>
        </div>
      ) : (
        <div className="rounded-[12px] border border-border bg-surface card-base overflow-hidden divide-y divide-border">
          {tasks.map((t) => {
            const status = STATUS_COPY[t.status];
            /* eslint-disable-next-line react-hooks/purity --- visual "overdue" tag based on wall-clock time */
            const nowMs = Date.now();
            const overdue =
              t.deadline !== null &&
              t.status !== "done" &&
              new Date(t.deadline).getTime() < nowMs;
            return (
              <Link
                key={t.id}
                href={`/clients/${t.relationshipId}`}
                className="block px-4 py-3 hover:bg-accent/[0.04] cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "mt-0.5 w-4 h-4 rounded grid place-items-center shrink-0",
                      t.status === "done"
                        ? "bg-green-500/15 text-green-600"
                        : overdue
                          ? "bg-red-500/15 text-red-600"
                          : "bg-surface-3 text-muted",
                    )}
                  >
                    {t.status === "done" ? (
                      <CheckCircle2 className="w-3 h-3" />
                    ) : overdue ? (
                      <AlertCircle className="w-3 h-3" />
                    ) : (
                      <Clock className="w-3 h-3" />
                    )}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13.5px] font-medium text-text truncate">
                      {t.title}
                    </div>
                    <div className="text-[11.5px] text-muted mt-0.5 flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                        {t.clientName}
                      </span>
                      <span>·</span>
                      <span>{status.label}</span>
                      {t.deadline && (
                        <>
                          <span>·</span>
                          <span className={overdue ? "text-red-600 dark:text-red-400 font-medium" : ""}>
                            {overdue ? "Overdue · " : "Due "}
                            {new Date(t.deadline).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 text-muted shrink-0 mt-0.5" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
