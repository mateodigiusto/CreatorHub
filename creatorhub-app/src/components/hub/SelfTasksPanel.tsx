"use client";

import { useState } from "react";
import { Plus, Check, X, MessageSquare } from "lucide-react";
import { useClients } from "@/lib/demo/clients";
import { dueLabel } from "@/lib/demo/team";

export function SelfTasksPanel() {
  const { self, addSelfTask, addCheckIn, toggleSelfItem, removeSelfItem } =
    useClients();
  const [tab, setTab] = useState<"tasks" | "checkin">("tasks");
  const [draft, setDraft] = useState("");

  const tasks = self.filter((i) => i.kind === "task");
  const checkins = self.filter((i) => i.kind === "checkin");
  const openCount = tasks.filter((t) => !t.done).length;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    if (tab === "tasks") addSelfTask(draft);
    else addCheckIn(draft);
    setDraft("");
  }

  return (
    <div className="bg-surface border border-border rounded-[14px] card-base p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[14px] font-semibold text-text">My focus</h3>
        {tab === "tasks" && openCount > 0 && (
          <span className="text-[11.5px] text-muted">{openCount} open</span>
        )}
      </div>

      <div className="inline-flex rounded-[9px] border border-border bg-surface-2 p-0.5 mb-3">
        {(["tasks", "checkin"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={
              "px-3 h-7 rounded-[7px] text-[12px] font-medium cursor-pointer transition-colors " +
              (tab === k
                ? "bg-surface text-text shadow-sm"
                : "text-muted hover:text-text")
            }
          >
            {k === "tasks" ? "Tasks" : "Check-ins"}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="flex items-center gap-2 mb-3">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={
            tab === "tasks" ? "Add a task for yourself…" : "Log a quick check-in…"
          }
          className="flex-1 h-9 rounded-[10px] border border-border bg-surface px-3 text-[13px] text-text placeholder:text-muted focus:outline-none focus:border-accent/50"
        />
        <button
          type="submit"
          className="h-9 w-9 shrink-0 grid place-items-center rounded-[10px] btn-primary text-white cursor-pointer"
          aria-label="Add"
        >
          <Plus className="w-4 h-4" />
        </button>
      </form>

      {tab === "tasks" ? (
        <ul className="flex flex-col gap-1 list-none m-0 p-0">
          {tasks.length === 0 && (
            <li className="text-[12.5px] text-muted py-2">
              Nothing on your list — nice.
            </li>
          )}
          {tasks.map((t) => {
            const due = t.due ? dueLabel(t.due) : null;
            return (
              <li
                key={t.id}
                className="group flex items-center gap-2.5 py-1.5 px-1.5 rounded-[8px] hover:bg-surface-2"
              >
                <button
                  onClick={() => toggleSelfItem(t.id)}
                  className={
                    "w-4 h-4 shrink-0 rounded-[5px] border grid place-items-center cursor-pointer transition-colors " +
                    (t.done
                      ? "bg-accent border-accent text-white"
                      : "border-border hover:border-accent")
                  }
                  aria-label={t.done ? "Mark not done" : "Mark done"}
                >
                  {t.done && <Check className="w-3 h-3" />}
                </button>
                <span
                  className={
                    "flex-1 text-[13px] " +
                    (t.done ? "text-muted line-through" : "text-text")
                  }
                >
                  {t.title}
                </span>
                {due && !t.done && (
                  <span
                    className={
                      "text-[11px] " +
                      (due.overdue ? "text-error" : "text-muted")
                    }
                  >
                    {due.text}
                  </span>
                )}
                <button
                  onClick={() => removeSelfItem(t.id)}
                  className="opacity-70 sm:opacity-0 sm:group-hover:opacity-100 text-muted hover:text-error cursor-pointer transition-opacity"
                  aria-label="Remove"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <ul className="flex flex-col gap-2 list-none m-0 p-0">
          {checkins.length === 0 && (
            <li className="text-[12.5px] text-muted py-2">
              No check-ins yet.
            </li>
          )}
          {checkins.map((c) => (
            <li
              key={c.id}
              className="group flex items-start gap-2.5 py-1.5 px-1.5 rounded-[8px] hover:bg-surface-2"
            >
              <MessageSquare className="w-3.5 h-3.5 text-accent mt-0.5 shrink-0" />
              <span className="flex-1 text-[12.5px] text-text-2 leading-snug">
                {c.title}
              </span>
              <button
                onClick={() => removeSelfItem(c.id)}
                className="opacity-0 group-hover:opacity-100 text-muted hover:text-error cursor-pointer transition-opacity"
                aria-label="Remove"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
