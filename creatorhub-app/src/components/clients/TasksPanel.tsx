"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  Trash2,
  Repeat,
  CheckCircle2,
  Circle,
  Clock,
  CalendarClock,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAppState } from "@/lib/store";
import { cn } from "@/lib/cn";
import type { RelationshipTaskRow } from "@/lib/clients/types";

type Props = {
  relationshipId: string;
  perspective: "manager" | "creator";
};

export function TasksPanel({ relationshipId, perspective }: Props) {
  const { showToast } = useAppState();
  const [tasks, setTasks] = useState<RelationshipTaskRow[] | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [newRecurrence, setNewRecurrence] = useState<"none" | "daily">("none");
  const [newDeadline, setNewDeadline] = useState("");

  const isManager = perspective === "manager";
  /* Captured once at mount — stable across renders for overdue checks. */
  const [now] = useState<number>(() => Date.now());

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/clients/${relationshipId}/tasks`, {
        credentials: "include",
      });
      if (!r.ok) {
        setTasks([]);
        return;
      }
      const json = (await r.json()) as { tasks: RelationshipTaskRow[] };
      setTasks(json.tasks);
    } catch {
      setTasks([]);
    }
  }, [relationshipId]);

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --- one-shot bootstrap */
    void load();
  }, [load]);

  const grouped = useMemo(() => {
    if (!tasks) return null;
    const daily = tasks.filter((t) => t.recurrence === "daily");
    const oneOff = tasks.filter((t) => t.recurrence === "none");
    return { daily, oneOff };
  }, [tasks]);

  async function createTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setSubmitting(true);
    try {
      const r = await fetch(`/api/clients/${relationshipId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: newTitle.trim(),
          notes: newNotes.trim() || undefined,
          recurrence: newRecurrence,
          deadline:
            newRecurrence === "none" && newDeadline
              ? new Date(newDeadline).toISOString()
              : undefined,
        }),
      });
      if (!r.ok) {
        showToast("Couldn't add task. Try again.");
        setSubmitting(false);
        return;
      }
      setNewTitle("");
      setNewNotes("");
      setNewRecurrence("none");
      setNewDeadline("");
      setShowNew(false);
      await load();
      showToast("Task added");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleDailyComplete(task: RelationshipTaskRow) {
    const next = !task.completedToday;
    /* Optimistic update */
    setTasks((prev) =>
      prev
        ? prev.map((t) => (t.id === task.id ? { ...t, completedToday: next } : t))
        : prev,
    );
    try {
      const r = await fetch(
        `/api/clients/${relationshipId}/tasks/${task.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ completedToday: next }),
        },
      );
      if (!r.ok) {
        showToast("Couldn't update. Reverting.");
        await load();
      } else if (next) {
        showToast("✓ Marked done for today");
      }
    } catch {
      await load();
    }
  }

  async function toggleOneOffStatus(
    task: RelationshipTaskRow,
    next: "pending" | "in_progress" | "done",
  ) {
    setTasks((prev) =>
      prev
        ? prev.map((t) => (t.id === task.id ? { ...t, status: next } : t))
        : prev,
    );
    try {
      const r = await fetch(
        `/api/clients/${relationshipId}/tasks/${task.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ status: next }),
        },
      );
      if (!r.ok) {
        showToast("Couldn't update.");
        await load();
      }
    } catch {
      await load();
    }
  }

  async function deleteTask(task: RelationshipTaskRow) {
    if (!window.confirm(`Delete "${task.title}"?`)) return;
    try {
      const r = await fetch(
        `/api/clients/${relationshipId}/tasks/${task.id}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );
      if (!r.ok) {
        showToast("Couldn't delete.");
        return;
      }
      await load();
      showToast("Task removed");
    } catch {
      showToast("Network error.");
    }
  }

  if (tasks === null) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-14 rounded-[10px] bg-surface-2 border border-border animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {isManager && (
        <div>
          {!showNew ? (
            <Button onClick={() => setShowNew(true)}>
              <Plus className="w-3.5 h-3.5" /> New task
            </Button>
          ) : (
            <form
              onSubmit={createTask}
              className="rounded-[12px] border border-border bg-surface p-4 space-y-3"
            >
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Task title (e.g. Record 2 long-form videos)"
                disabled={submitting}
                autoFocus
                required
                className="w-full px-3 py-2 rounded-[8px] border border-border bg-surface-2 text-[14px] text-text placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
              />
              <textarea
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="Optional notes"
                disabled={submitting}
                rows={2}
                className="w-full px-3 py-2 rounded-[8px] border border-border bg-surface-2 text-[13px] text-text placeholder:text-muted focus:outline-none focus:border-accent transition-colors resize-none"
              />
              <div className="flex items-center gap-3 flex-wrap">
                <div className="inline-flex rounded-[8px] border border-border bg-surface-2 p-0.5">
                  <button
                    type="button"
                    onClick={() => setNewRecurrence("none")}
                    className={cn(
                      "px-3 py-1 text-[12px] font-medium rounded-[6px] transition-colors cursor-pointer",
                      newRecurrence === "none"
                        ? "bg-surface text-text shadow-sm"
                        : "text-muted hover:text-text",
                    )}
                  >
                    One-off
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewRecurrence("daily")}
                    className={cn(
                      "px-3 py-1 text-[12px] font-medium rounded-[6px] transition-colors cursor-pointer",
                      newRecurrence === "daily"
                        ? "bg-surface text-text shadow-sm"
                        : "text-muted hover:text-text",
                    )}
                  >
                    <Repeat className="w-3 h-3 inline mr-1" />
                    Daily
                  </button>
                </div>
                {newRecurrence === "none" && (
                  <input
                    type="datetime-local"
                    value={newDeadline}
                    onChange={(e) => setNewDeadline(e.target.value)}
                    disabled={submitting}
                    className="px-2 py-1 text-[12px] rounded-[6px] border border-border bg-surface-2 text-text focus:outline-none focus:border-accent"
                    style={{ colorScheme: "light dark" }}
                  />
                )}
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={submitting}
                  onClick={() => {
                    setShowNew(false);
                    setNewTitle("");
                    setNewNotes("");
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={submitting || !newTitle.trim()}>
                  {submitting ? "Adding…" : "Add task"}
                </Button>
              </div>
            </form>
          )}
        </div>
      )}

      {grouped && grouped.daily.length > 0 && (
        <div>
          <h4 className="text-[12px] font-semibold text-muted uppercase tracking-wider mb-2 inline-flex items-center gap-1.5">
            <Repeat className="w-3 h-3" /> Daily
          </h4>
          <div className="space-y-1.5">
            {grouped.daily.map((t) => (
              <DailyTaskRow
                key={t.id}
                task={t}
                isManager={isManager}
                onToggle={() => toggleDailyComplete(t)}
                onDelete={() => deleteTask(t)}
              />
            ))}
          </div>
        </div>
      )}

      {grouped && grouped.oneOff.length > 0 && (
        <div>
          <h4 className="text-[12px] font-semibold text-muted uppercase tracking-wider mb-2 inline-flex items-center gap-1.5">
            <CalendarClock className="w-3 h-3" /> One-off
          </h4>
          <div className="space-y-1.5">
            {grouped.oneOff.map((t) => (
              <OneOffTaskRow
                key={t.id}
                task={t}
                isManager={isManager}
                now={now}
                onStatus={(next) => toggleOneOffStatus(t, next)}
                onDelete={() => deleteTask(t)}
              />
            ))}
          </div>
        </div>
      )}

      {grouped && grouped.daily.length === 0 && grouped.oneOff.length === 0 && (
        <div className="text-center py-8 text-[13px] text-muted">
          {isManager
            ? "No tasks yet. Add the first one to get this creator started."
            : "No tasks assigned yet."}
        </div>
      )}
    </div>
  );
}

function DailyTaskRow({
  task,
  isManager,
  onToggle,
  onDelete,
}: {
  task: RelationshipTaskRow;
  isManager: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const completed = !!task.completedToday;
  return (
    <div
      className={cn(
        "group flex items-center gap-3 px-3 py-2.5 rounded-[10px] border transition-colors",
        completed
          ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900"
          : "bg-surface border-border",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className="shrink-0 cursor-pointer"
        aria-label={completed ? "Mark incomplete" : "Mark complete"}
      >
        {completed ? (
          <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
        ) : (
          <Circle className="w-5 h-5 text-muted hover:text-accent transition-colors" />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <div
          className={cn(
            "text-[13.5px] font-medium truncate",
            completed ? "text-muted line-through" : "text-text",
          )}
        >
          {task.title}
        </div>
        {task.notes && (
          <div className="text-[11.5px] text-muted truncate mt-0.5">
            {task.notes}
          </div>
        )}
      </div>
      {isManager && (
        <button
          type="button"
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted hover:text-red-600 cursor-pointer"
          aria-label="Delete task"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

function OneOffTaskRow({
  task,
  isManager,
  now,
  onStatus,
  onDelete,
}: {
  task: RelationshipTaskRow;
  isManager: boolean;
  now: number;
  onStatus: (next: "pending" | "in_progress" | "done") => void;
  onDelete: () => void;
}) {
  const isDone = task.status === "done";
  const next = isDone ? "pending" : "done";
  const due = task.deadline ? new Date(task.deadline) : null;
  const overdue = due && !isDone && due.getTime() < now;

  return (
    <div
      className={cn(
        "group flex items-center gap-3 px-3 py-2.5 rounded-[10px] border transition-colors",
        isDone
          ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900"
          : "bg-surface border-border",
      )}
    >
      <button
        type="button"
        onClick={() => onStatus(next)}
        className="shrink-0 cursor-pointer"
        aria-label={isDone ? "Mark pending" : "Mark done"}
      >
        {isDone ? (
          <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
        ) : (
          <Circle className="w-5 h-5 text-muted hover:text-accent transition-colors" />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <div
          className={cn(
            "text-[13.5px] font-medium truncate",
            isDone ? "text-muted line-through" : "text-text",
          )}
        >
          {task.title}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {task.notes && (
            <span className="text-[11.5px] text-muted truncate">
              {task.notes}
            </span>
          )}
          {due && (
            <span
              className={cn(
                "inline-flex items-center gap-1 text-[11px] font-medium",
                overdue ? "text-red-600 dark:text-red-400" : "text-muted",
              )}
            >
              <Clock className="w-3 h-3" />
              {due.toLocaleDateString()}{" "}
              {due.toLocaleTimeString([], {
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          )}
        </div>
      </div>
      {!isDone && task.status !== "in_progress" && (
        <button
          type="button"
          onClick={() => onStatus("in_progress")}
          className="text-[11px] font-medium text-muted hover:text-accent transition-colors cursor-pointer"
        >
          Start
        </button>
      )}
      {task.status === "in_progress" && (
        <span className="text-[11px] font-medium text-accent">In progress</span>
      )}
      {isManager && (
        <button
          type="button"
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted hover:text-red-600 cursor-pointer"
          aria-label="Delete task"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
