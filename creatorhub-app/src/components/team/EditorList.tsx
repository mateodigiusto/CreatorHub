"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Paperclip,
  MessageSquare,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useAppState } from "@/lib/store";
import {
  useDemoTeam,
  timeStatus,
  dueLabel,
  TIME_STATUS_LABEL,
  type Task,
  type TimeStatus,
} from "@/lib/demo/team";
import { StatusBadge, PriorityChip, FormatChip, ClientChip } from "./bits";

const SECTION_ORDER: TimeStatus[] = ["overdue", "due_today", "open", "done"];

/** Dot color per time-status. */
const TONE: Record<TimeStatus, string> = {
  overdue: "#DC2626",
  due_today: "#2563EB",
  open: "#94A3B8",
  done: "#16A34A",
};

const COUNTERS: { key: TimeStatus; label: string }[] = [
  { key: "overdue", label: "overdue" },
  { key: "due_today", label: "due today" },
  { key: "open", label: "open" },
];

export function EditorList() {
  const router = useRouter();
  const { myTasks, toggleDone } = useDemoTeam();
  const { showToast } = useAppState();
  const [filter, setFilter] = useState<TimeStatus | null>(null);
  const [doneOpen, setDoneOpen] = useState(false);

  const grouped = useMemo(() => {
    const map: Record<TimeStatus, Task[]> = {
      overdue: [],
      due_today: [],
      open: [],
      done: [],
    };
    for (const t of myTasks) map[timeStatus(t)].push(t);
    return map;
  }, [myTasks]);

  function open(id: string) {
    router.push(`/editor-portal/task/${id}`);
  }
  function toggle(task: Task) {
    toggleDone(task.id);
    showToast(task.status === "done" ? "Marked not done" : "Marked done");
  }

  const sections = filter ? [filter] : SECTION_ORDER;

  return (
    <>
      {/* Counters strip — click to filter */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {COUNTERS.map((c) => {
          const n = grouped[c.key].length;
          const active = filter === c.key;
          return (
            <button
              key={c.key}
              onClick={() => setFilter(active ? null : c.key)}
              className={cn(
                "inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[12.5px] border transition-colors cursor-pointer",
                active
                  ? "bg-accent-soft border-accent-border text-accent"
                  : "bg-surface border-border text-text-2 hover:text-text",
              )}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: TONE[c.key] }}
              />
              <span
                className="tabular-nums font-semibold"
                style={{ color: active ? undefined : TONE[c.key] }}
              >
                {n}
              </span>
              {c.label}
            </button>
          );
        })}
        {filter && (
          <button
            onClick={() => setFilter(null)}
            className="text-[12px] text-muted hover:text-text cursor-pointer"
          >
            Clear filter
          </button>
        )}
      </div>

      {/* Sections: Overdue -> Due Today -> Open -> Done */}
      <div className="flex flex-col gap-5">
        {sections.map((section) => {
          const items = grouped[section];
          const show =
            items.length > 0 || filter === section || section === "done";
          if (!show) return null;

          if (section === "done") {
            return (
              <section key="done">
                <button
                  onClick={() => setDoneOpen((v) => !v)}
                  className="flex items-center gap-2 mb-2 cursor-pointer"
                >
                  {doneOpen ? (
                    <ChevronDown className="w-4 h-4 text-muted" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted" />
                  )}
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: TONE.done }}
                  />
                  <h2 className="text-[13px] font-semibold text-text">Done</h2>
                  <span className="text-[12px] text-muted">· {items.length}</span>
                </button>
                {doneOpen && (
                  <RowGroup>
                    {items.length === 0 ? (
                      <EmptyRow />
                    ) : (
                      items.map((t) => (
                        <Row
                          key={t.id}
                          task={t}
                          onOpen={() => open(t.id)}
                          onToggle={() => toggle(t)}
                        />
                      ))
                    )}
                  </RowGroup>
                )}
              </section>
            );
          }

          return (
            <section key={section}>
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: TONE[section] }}
                />
                <h2 className="text-[13px] font-semibold text-text">
                  {TIME_STATUS_LABEL[section]}
                </h2>
                <span className="text-[12px] text-muted">· {items.length}</span>
              </div>
              <RowGroup>
                {items.length === 0 ? (
                  <EmptyRow />
                ) : (
                  items.map((t) => (
                    <Row
                      key={t.id}
                      task={t}
                      onOpen={() => open(t.id)}
                      onToggle={() => toggle(t)}
                    />
                  ))
                )}
              </RowGroup>
            </section>
          );
        })}
      </div>
    </>
  );
}

function RowGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[12px] border border-border overflow-hidden bg-surface">
      {children}
    </div>
  );
}

function EmptyRow() {
  return (
    <div className="px-3 py-4 text-center text-[12px] text-muted">
      Nothing here
    </div>
  );
}

function Row({
  task,
  onOpen,
  onToggle,
}: {
  task: Task;
  onOpen: () => void;
  onToggle: () => void;
}) {
  const ts = timeStatus(task);
  const due = dueLabel(task.dueDate);
  const isDone = task.status === "done";
  const rowTint =
    ts === "overdue"
      ? "rgba(220,38,38,0.04)"
      : ts === "due_today"
        ? "rgba(37,99,235,0.04)"
        : undefined;
  return (
    // Mouse affordance only — keyboard users navigate via the title button and
    // toggle via the checkbox (no nested role="button").
    <div
      onClick={onOpen}
      className="flex items-center gap-3 px-3 py-2.5 border-b border-border last:border-b-0 cursor-pointer transition-colors hover:bg-accent/[0.04]"
      style={rowTint ? { background: rowTint } : undefined}
    >
      {/* Mark done */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className="w-[18px] h-[18px] rounded-[5px] border grid place-items-center shrink-0 cursor-pointer transition-colors"
        style={
          isDone
            ? { background: "var(--success)", borderColor: "var(--success)" }
            : { borderColor: "var(--border)" }
        }
        aria-label={isDone ? "Mark not done" : "Mark done"}
        title={isDone ? "Mark not done" : "Mark done"}
      >
        {isDone && <Check className="w-3 h-3 text-white" />}
      </button>

      {/* Title + project */}
      <div className="min-w-0 flex-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
          className={cn(
            "block w-full text-left text-[13px] font-medium truncate cursor-pointer hover:underline focus-visible:outline-none focus-visible:underline rounded-[2px]",
            isDone ? "text-muted line-through" : "text-text",
          )}
        >
          {task.title}
        </button>
        <div className="flex items-center gap-1.5 mt-1">
          <ClientChip client={task.client} />
          <FormatChip format={task.format} />
        </div>
      </div>

      {/* Workflow status */}
      <div className="hidden md:block shrink-0">
        <StatusBadge status={task.status} />
      </div>

      {/* Priority */}
      <div className="hidden sm:block shrink-0 w-[70px]">
        <PriorityChip priority={task.priority} />
      </div>

      {/* Due date */}
      <div
        className={cn(
          "shrink-0 w-[96px] text-right text-[12px]",
          ts === "overdue" || ts === "due_today" ? "font-medium" : "text-muted",
        )}
        style={
          ts === "overdue"
            ? { color: "var(--error)" }
            : ts === "due_today"
              ? { color: "var(--accent)" }
              : undefined
        }
      >
        {due.text}
      </div>

      {/* Links / activity */}
      <div className="hidden sm:flex items-center gap-2 text-muted shrink-0 w-[46px] justify-end">
        {task.comments.length > 0 && (
          <span className="inline-flex items-center gap-0.5 text-[11px]">
            <MessageSquare className="w-3.5 h-3.5" />
            {task.comments.length}
          </span>
        )}
        {task.deliverableUrl && <Paperclip className="w-3.5 h-3.5" />}
      </div>
    </div>
  );
}
