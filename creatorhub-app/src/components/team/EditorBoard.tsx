"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MessageSquare,
  Paperclip,
  AlertTriangle,
  X,
  Send,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { useAppState } from "@/lib/store";
import {
  useDemoTeam,
  dueLabel,
  daysUntilDue,
  EDITOR_COLUMN_LABEL,
  STATUS_ORDER,
  type Task,
  type TaskStatus,
} from "@/lib/demo/team";
import { PriorityChip, FormatChip, ClientChip } from "./bits";

/* ------------------------------------------------------------------ config */

type Filter = "all" | "due_soon" | "blocked";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "due_soon", label: "Due soon" },
  { value: "blocked", label: "Blocked" },
];

/** Soft per-column accent — dot + faint body tint. Not loud. */
const COLUMN_STYLE: Record<TaskStatus, { dot: string; tint: string }> = {
  todo: { dot: "#94A3B8", tint: "rgba(148,163,184,0.07)" },
  in_progress: { dot: "#2563EB", tint: "rgba(37,99,235,0.06)" },
  blocked: { dot: "#D97706", tint: "rgba(217,119,6,0.08)" },
  in_review: { dot: "#7C3AED", tint: "rgba(124,58,237,0.07)" },
  done: { dot: "#16A34A", tint: "rgba(22,163,74,0.07)" },
};

const inputCls =
  "w-full rounded-[10px] border border-border bg-surface px-3 py-2 text-[13px] text-text placeholder:text-muted focus:outline-none focus:border-accent/50";

/* ------------------------------------------------------------------- board */

type Pending = { task: Task; kind: "blocked" | "review" | "complete" } | null;

export function EditorBoard() {
  const router = useRouter();
  const { myTasks, setTaskStatus, setBlocked, attachDeliverable, deleteTask } =
    useDemoTeam();
  const { showToast } = useAppState();

  const [filter, setFilter] = useState<Filter>("all");
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<TaskStatus | null>(null);
  const [pending, setPending] = useState<Pending>(null);

  const blockedCount = useMemo(
    () => myTasks.filter((t) => t.status === "blocked").length,
    [myTasks],
  );

  const filtered = useMemo(() => {
    if (filter === "blocked")
      return myTasks.filter((t) => t.status === "blocked");
    if (filter === "due_soon")
      return myTasks.filter((t) => {
        if (t.status === "done") return false;
        return dueLabel(t.dueDate).overdue || daysUntilDue(t.dueDate) <= 3;
      });
    return myTasks;
  }, [myTasks, filter]);

  const grouped = useMemo(() => {
    const map = {} as Record<TaskStatus, Task[]>;
    for (const s of STATUS_ORDER) map[s] = [];
    for (const t of filtered) map[t.status].push(t);
    return map;
  }, [filtered]);

  /** Route a status change through any confirm/prompt the target needs. */
  function move(task: Task, target: TaskStatus) {
    if (task.status === target) return;
    if (target === "blocked" || target === "in_review" || target === "done") {
      setPending({
        task,
        kind:
          target === "blocked"
            ? "blocked"
            : target === "in_review"
              ? "review"
              : "complete",
      });
      return;
    }
    setTaskStatus(task.id, target);
    showToast(`Moved to ${EDITOR_COLUMN_LABEL[target]}`);
  }

  function onDrop(e: React.DragEvent, status: TaskStatus) {
    e.preventDefault();
    const id = dragId ?? e.dataTransfer.getData("text/plain");
    setOverCol(null);
    setDragId(null);
    const task = myTasks.find((t) => t.id === id);
    if (task) move(task, status);
  }

  /* dialog confirmations */
  function confirmBlocked(reason: string, need: string) {
    if (!pending) return;
    setBlocked(pending.task.id, reason, need);
    showToast("Moved to Blocked");
    setPending(null);
  }
  function confirmReview(link: string) {
    if (!pending) return;
    if (link.trim()) attachDeliverable(pending.task.id, link.trim());
    setTaskStatus(pending.task.id, "in_review");
    showToast("Submitted for review");
    setPending(null);
  }
  function confirmComplete() {
    if (!pending) return;
    setTaskStatus(pending.task.id, "done");
    showToast("Marked complete");
    setPending(null);
  }

  return (
    <>
      {/* Filters */}
      <div className="flex items-center gap-1.5 mb-4 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              "h-8 px-3 rounded-full text-[12.5px] font-medium border transition-colors cursor-pointer inline-flex items-center gap-1.5",
              filter === f.value
                ? "bg-accent-soft border-accent-border text-accent"
                : "bg-surface border-border text-muted hover:text-text",
            )}
          >
            {f.label}
            {f.value === "blocked" && blockedCount > 0 && (
              <span
                className="inline-grid place-items-center min-w-[16px] h-[16px] px-1 rounded-full text-[10.5px] font-semibold text-white"
                style={{ background: COLUMN_STYLE.blocked.dot }}
              >
                {blockedCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Board */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
        {STATUS_ORDER.map((status) => {
          const items = grouped[status];
          const cs = COLUMN_STYLE[status];
          const isOver = Boolean(dragId) && overCol === status;
          return (
            <div
              key={status}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              }}
              onDragEnter={() => setOverCol(status)}
              onDrop={(e) => onDrop(e, status)}
              className={cn(
                "min-w-0 rounded-[14px] border p-2.5 transition-colors",
                isOver ? "border-dashed" : "border-transparent",
              )}
              style={{
                background: cs.tint,
                borderColor: isOver ? cs.dot : "transparent",
              }}
            >
              <div className="flex items-center gap-2 mb-2.5 px-1">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: cs.dot }}
                />
                <h2 className="text-[12.5px] font-semibold text-text">
                  {EDITOR_COLUMN_LABEL[status]}
                </h2>
                <span className="text-[11.5px] text-muted">· {items.length}</span>
              </div>

              <div className="flex flex-col gap-2.5 min-h-[120px]">
                {items.length === 0 ? (
                  <div className="rounded-[10px] border border-dashed border-border py-8 text-center text-[11.5px] text-muted">
                    {isOver ? "Drop to move here" : "Nothing here"}
                  </div>
                ) : (
                  items.map((t) => (
                    <EditorCard
                      key={t.id}
                      task={t}
                      dragging={dragId === t.id}
                      onOpen={() => router.push(`/editor-portal/task/${t.id}`)}
                      onDragStart={(e) => {
                        if (
                          (e.target as HTMLElement).closest("[data-nodrag]")
                        ) {
                          e.preventDefault();
                          return;
                        }
                        setDragId(t.id);
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData("text/plain", t.id);
                      }}
                      onDragEnd={() => {
                        setDragId(null);
                        setOverCol(null);
                      }}
                      onMove={(target) => move(t, target)}
                      onDelete={() => {
                        deleteTask(t.id);
                        showToast("Task deleted");
                      }}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {pending && (
        <MoveDialog
          key={pending.kind + pending.task.id}
          pending={pending}
          onClose={() => setPending(null)}
          onBlocked={confirmBlocked}
          onReview={confirmReview}
          onComplete={confirmComplete}
        />
      )}
    </>
  );
}

/* -------------------------------------------------------------------- card */

function EditorCard({
  task,
  dragging,
  onOpen,
  onDragStart,
  onDragEnd,
  onMove,
  onDelete,
}: {
  task: Task;
  dragging: boolean;
  onOpen: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onMove: (target: TaskStatus) => void;
  onDelete: () => void;
}) {
  const due = dueLabel(task.dueDate);
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      role="button"
      tabIndex={0}
      className={cn(
        "group relative bg-surface border border-border rounded-[12px] p-3 card-base cursor-grab active:cursor-grabbing transition-[box-shadow,border-color,opacity] hover:border-accent-border hover:shadow-[var(--shadow-lift)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
        dragging && "opacity-50",
      )}
    >
      <button
        type="button"
        data-nodrag
        aria-label="Delete task"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="absolute top-2 right-2 z-10 w-7 h-7 grid place-items-center rounded-[8px] text-muted opacity-70 sm:opacity-0 sm:group-hover:opacity-100 hover:text-error hover:bg-error/10 transition-[opacity,color,background-color] cursor-pointer"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
      <div className="flex items-center gap-1.5 flex-wrap mb-2 pr-7">
        <ClientChip client={task.client} />
        <FormatChip format={task.format} />
      </div>

      <div className="text-[13.5px] font-semibold text-text leading-snug">
        {task.title}
      </div>

      {task.status === "blocked" && task.blockerReason && (
        <div
          className="mt-2 flex items-start gap-1.5 rounded-[8px] px-2 py-1.5"
          style={{
            background: "rgba(217,119,6,0.08)",
            border: "1px solid rgba(217,119,6,0.22)",
          }}
        >
          <AlertTriangle
            className="w-3.5 h-3.5 shrink-0 mt-[1px]"
            style={{ color: "var(--warning)" }}
          />
          <span
            className="text-[11.5px] leading-snug"
            style={{ color: "var(--warning)" }}
          >
            {task.blockerReason}
          </span>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-border">
        <div className="flex items-center gap-2.5">
          <span
            className={
              due.overdue
                ? "text-[11px] font-medium text-error"
                : "text-[11px] text-muted"
            }
          >
            {due.text}
          </span>
          <PriorityChip priority={task.priority} />
        </div>
        <div className="flex items-center gap-2 text-muted">
          {task.comments.length > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px]">
              <MessageSquare className="w-3.5 h-3.5" />
              {task.comments.length}
            </span>
          )}
          {task.deliverableUrl && <Paperclip className="w-3.5 h-3.5" />}
        </div>
      </div>

      {/* Accessible / mobile status control (drag fallback) */}
      <div data-nodrag onClick={(e) => e.stopPropagation()} className="mt-2.5">
        <label htmlFor={`status-${task.id}`} className="sr-only">
          Move this task
        </label>
        <select
          id={`status-${task.id}`}
          value={task.status}
          draggable={false}
          onChange={(e) => onMove(e.target.value as TaskStatus)}
          className="w-full h-7 rounded-[8px] border border-border bg-surface-2 text-[11.5px] text-text-2 px-2 cursor-pointer focus:outline-none focus:border-accent/50"
        >
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {EDITOR_COLUMN_LABEL[s]}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ dialog */

function MoveDialog({
  pending,
  onClose,
  onBlocked,
  onReview,
  onComplete,
}: {
  pending: NonNullable<Pending>;
  onClose: () => void;
  onBlocked: (reason: string, need: string) => void;
  onReview: (link: string) => void;
  onComplete: () => void;
}) {
  const { theme } = useAppState();
  const ref = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState("");
  const [need, setNeed] = useState("");
  const [link, setLink] = useState(pending.task.deliverableUrl ?? "");

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  const { kind, task } = pending;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (kind === "blocked") {
      if (!reason.trim()) return;
      onBlocked(reason.trim(), need.trim());
    } else if (kind === "review") {
      onReview(link);
    } else {
      onComplete();
    }
  }

  const meta = {
    blocked: {
      title: "What's blocking you?",
      cta: "Mark as blocked",
      icon: <AlertTriangle className="w-3.5 h-3.5" />,
    },
    review: {
      title: "Submit for review",
      cta: "Submit for review",
      icon: <Send className="w-3.5 h-3.5" />,
    },
    complete: {
      title: "Mark as complete?",
      cta: "Mark complete",
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    },
  }[kind];

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className="bg-transparent p-0 backdrop:bg-text/40 backdrop:backdrop-blur-sm"
    >
      <form
        onSubmit={submit}
        style={{ colorScheme: theme }}
        className="bg-surface border border-border rounded-[16px] w-[min(440px,92vw)] shadow-[0_24px_60px_rgba(11,18,32,0.22)]"
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border">
          <h2 className="text-[15px] font-semibold text-text">{meta.title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 grid place-items-center rounded-md text-muted hover:text-text hover:bg-surface-2 cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-3">
          <p className="text-[12.5px] text-muted leading-relaxed">{task.title}</p>

          {kind === "blocked" && (
            <>
              <textarea
                autoFocus
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                placeholder="Waiting on raw footage from Friday's shoot…"
                className={inputCls + " resize-none"}
              />
              <input
                value={need}
                onChange={(e) => setNeed(e.target.value)}
                placeholder="What do you need? (optional)"
                className={inputCls + " h-9 py-0"}
              />
            </>
          )}

          {kind === "review" && (
            <>
              <p className="text-[13px] text-text-2 leading-relaxed">
                This sends your edit to the team for approval. Add a deliverable
                link if you have one.
              </p>
              <input
                autoFocus
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://app.frame.io/reviews/… (optional)"
                className={inputCls + " h-9 py-0"}
              />
            </>
          )}

          {kind === "complete" && (
            <p className="text-[13px] text-text-2 leading-relaxed">
              This hasn&apos;t been reviewed yet. Mark it complete without review?
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-border">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={kind === "blocked" && !reason.trim()}
          >
            {meta.icon} {meta.cta}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
