"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  X,
  ArrowRight,
  Check,
  AlertTriangle,
  Trash2,
  Mic,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAppState } from "@/lib/store";
import {
  useClients,
  formatMoney,
  type Client,
} from "@/lib/demo/clients";
import { useDemoTeam } from "@/lib/demo/team";
import { parseCommand, type AiAction } from "@/lib/demo/ai-command";
import { useSpeechRecognition } from "@/lib/useSpeechRecognition";

const EXAMPLES = [
  "Assign Lena to cut the intro for FitForge",
  "Onboard Nord Coffee at $1,500/mo starting July 8",
  "Log a $1,200 payment for June Launch",
  "Pause FitForge",
];

function todayISO() {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
}

export function AiAssistant({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const { theme, showToast } = useAppState();
  const {
    clients,
    addClient,
    removeClient,
    setClientStatus,
    logPayment,
  } = useClients();
  const { members, addTask, addComment } = useDemoTeam();

  const [text, setText] = useState("");
  const [action, setAction] = useState<AiAction | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const assignable = members.filter((m) => m.id !== "m_owner" && m.role !== "pending");

  const speech = useSpeechRecognition({
    onFinal: (t) => {
      setText(t);
      interpret(t);
    },
  });

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  function close() {
    setText("");
    setAction(null);
    setDone(null);
    onClose();
  }

  function findClient(name?: string): Client | undefined {
    if (!name) return undefined;
    const n = name.toLowerCase();
    return (
      clients.find((c) => c.name.toLowerCase() === n) ||
      clients.find(
        (c) =>
          c.name.toLowerCase().includes(n) || n.includes(c.name.toLowerCase()),
      )
    );
  }

  function interpret(value?: string) {
    const src = value ?? text;
    const parsed = parseCommand(
      src,
      clients.map((c) => c.name),
      assignable.map((m) => m.name),
    );
    setDone(null);
    setAction(parsed);
  }

  function apply() {
    if (!action) return;
    switch (action.kind) {
      case "add_client": {
        const id = addClient({
          name: action.name,
          retainer: action.retainer ?? 0,
          cadence: "monthly",
          startDate: action.startDate ?? todayISO(),
          status: action.status,
        });
        showToast(`${action.name} added`);
        setAction(null);
        setText("");
        onClose();
        router.push(`/hub/${id}`);
        return;
      }
      case "remove_client": {
        const c = findClient(action.name);
        if (!c) {
          setAction({ kind: "unknown", reason: `I couldn't find a client called “${action.name}”.` });
          return;
        }
        removeClient(c.id);
        showToast(`${c.name} removed`);
        setDone(`Removed ${c.name} and their payment history.`);
        setAction(null);
        setText("");
        return;
      }
      case "pause_client": {
        const c = findClient(action.name);
        if (!c) {
          setAction({ kind: "unknown", reason: `I couldn't find a client called “${action.name}”.` });
          return;
        }
        setClientStatus(c.id, "paused");
        showToast(`${c.name} paused`);
        setDone(`Paused ${c.name}.`);
        setAction(null);
        setText("");
        return;
      }
      case "log_payment": {
        const c = findClient(action.name);
        if (!c) {
          setAction({ kind: "unknown", reason: "Which client is this payment for? Add their name." });
          return;
        }
        logPayment({
          clientId: c.id,
          amount: action.amount,
          date: todayISO(),
          note: action.note,
        });
        showToast(`Logged ${formatMoney(action.amount)}`);
        setDone(`Logged ${formatMoney(action.amount)} for ${c.name}.`);
        setAction(null);
        setText("");
        return;
      }
      case "add_task": {
        const named = action.assignee
          ? assignable.find((m) => {
              const n = action.assignee!.toLowerCase();
              return (
                m.name.toLowerCase() === n ||
                m.name.toLowerCase().startsWith(n.split(" ")[0])
              );
            })
          : undefined;
        const assignee =
          named ??
          assignable.find((m) => m.role === "editor") ??
          assignable.find((m) => m.role === "manager") ??
          members[0];
        const due = new Date();
        due.setDate(due.getDate() + 3);
        const id = addTask({
          title: action.title,
          client: action.client ?? "Untitled project",
          assigneeId: assignee?.id ?? "",
          dueDate: due.toISOString(),
          priority: "medium",
          format: "Reel",
          brief: "Added by the assistant.",
          inspirationUrls: [],
          resourceUrls: [],
        });
        if (assignee) {
          // Simulated notification: the assignee sees it in their portal, and
          // a note is dropped on the task recording that they were pinged.
          addComment(
            id,
            `Assigned to ${assignee.name} — they've been notified in CreatorHub.`,
          );
        }
        showToast(
          assignee
            ? `Task assigned to ${assignee.name} — notified`
            : "Task created",
        );
        setDone(
          assignee
            ? `Created “${action.title}” and assigned it to ${assignee.name}. They've been notified.`
            : `Created task “${action.title}”.`,
        );
        setAction(null);
        setText("");
        return;
      }
      default:
        return;
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={close}
      onClick={(e) => {
        if (e.target === dialogRef.current) close();
      }}
      className="bg-transparent p-0 backdrop:bg-text/40 backdrop:backdrop-blur-sm"
    >
      <div
        style={{ colorScheme: theme }}
        className="bg-surface border border-border rounded-[16px] w-[min(560px,92vw)] shadow-[0_24px_60px_rgba(11,18,32,0.22)] overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border">
          <h2 className="text-[15px] font-semibold text-text flex items-center gap-2">
            <span className="w-6 h-6 rounded-[7px] bg-accent-soft grid place-items-center">
              <Sparkles className="w-3.5 h-3.5 text-accent" />
            </span>
            Assistant
          </h2>
          <button
            type="button"
            onClick={close}
            className="w-8 h-8 grid place-items-center rounded-md text-muted hover:text-text hover:bg-surface-2 cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              interpret();
            }}
          >
            <div className="relative">
              <textarea
                autoFocus
                value={speech.listening ? speech.transcript : text}
                readOnly={speech.listening}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    interpret();
                  }
                }}
                rows={2}
                placeholder={
                  speech.listening
                    ? "Listening…"
                    : "Tell me what to do — or tap the mic and just say it"
                }
                className="w-full rounded-[10px] border border-border bg-surface pl-3 pr-11 py-2.5 text-[13.5px] text-text placeholder:text-muted focus:outline-none focus:border-accent/50 resize-none"
              />
              {speech.supported && (
                <button
                  type="button"
                  aria-label={speech.listening ? "Stop listening" : "Speak"}
                  onClick={() => (speech.listening ? speech.stop() : speech.start())}
                  className={
                    "absolute top-2 right-2 w-8 h-8 grid place-items-center rounded-full cursor-pointer transition-colors " +
                    (speech.listening
                      ? "bg-error text-white animate-pulse"
                      : "bg-accent-soft text-accent hover:bg-accent hover:text-white")
                  }
                >
                  <Mic className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-[11px] text-muted">
                {speech.supported
                  ? "Type or speak — it turns words into real changes."
                  : "Turns plain English into real changes."}
              </span>
              <Button type="submit" size="sm" disabled={!text.trim() || speech.listening}>
                Interpret <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </form>

          {/* Interpretation / result */}
          {action && <Interpretation action={action} onApply={apply} onCancel={() => setAction(null)} />}

          {done && (
            <div className="mt-3 flex items-center gap-2 rounded-[10px] border border-success/30 bg-success/[0.07] px-3 py-2.5">
              <Check className="w-4 h-4 text-success shrink-0" />
              <span className="text-[13px] text-text">{done}</span>
            </div>
          )}

          {!action && !done && (
            <div className="mt-4">
              <div className="text-[11px] uppercase tracking-wide text-muted mb-2">
                Try
              </div>
              <div className="flex flex-col gap-1.5">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    onClick={() => {
                      setText(ex);
                      interpret(ex);
                    }}
                    className="text-left text-[12.5px] text-text-2 hover:text-accent px-2.5 py-1.5 rounded-[8px] hover:bg-surface-2 cursor-pointer transition-colors"
                  >
                    “{ex}”
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </dialog>
  );
}

function Interpretation({
  action,
  onApply,
  onCancel,
}: {
  action: AiAction;
  onApply: () => void;
  onCancel: () => void;
}) {
  if (action.kind === "unknown") {
    return (
      <div className="mt-3 flex items-start gap-2 rounded-[10px] border border-warning/30 bg-warning/[0.07] px-3 py-2.5">
        <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
        <span className="text-[12.5px] text-text-2">{action.reason}</span>
      </div>
    );
  }

  const destructive = action.kind === "remove_client";

  let summary: React.ReactNode = null;
  if (action.kind === "add_client") {
    summary = (
      <>
        Onboard <b className="text-text">{action.name}</b>
        {action.retainer ? ` — ${formatMoney(action.retainer)}/mo` : " (no retainer set)"}
        {action.startDate
          ? `, starting ${new Date(action.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
          : ""}
        {`, status ${action.status}`}.
      </>
    );
  } else if (action.kind === "remove_client") {
    summary = (
      <>
        Remove <b className="text-text">{action.name}</b> and delete their payment
        history. This can&apos;t be undone.
      </>
    );
  } else if (action.kind === "pause_client") {
    summary = (
      <>
        Pause <b className="text-text">{action.name}</b>.
      </>
    );
  } else if (action.kind === "log_payment") {
    summary = (
      <>
        Log a <b className="text-text">{formatMoney(action.amount)}</b> payment
        {action.name ? (
          <>
            {" "}for <b className="text-text">{action.name}</b>
          </>
        ) : null}
        {action.note ? ` (${action.note})` : ""}, dated today.
      </>
    );
  } else if (action.kind === "add_task") {
    summary = (
      <>
        Add a task <b className="text-text">“{action.title}”</b>
        {action.client ? (
          <>
            {" "}for <b className="text-text">{action.client}</b>
          </>
        ) : null}
        {action.assignee ? (
          <>
            , assigned to <b className="text-text">{action.assignee}</b> (they&apos;ll
            be notified)
          </>
        ) : null}
        .
      </>
    );
  }

  return (
    <div className="mt-3 rounded-[12px] border border-accent-border bg-accent-soft px-3.5 py-3">
      <div className="flex items-start gap-2">
        <Sparkles className="w-4 h-4 text-accent shrink-0 mt-0.5" />
        <p className="text-[13px] text-text-2 leading-relaxed">{summary}</p>
      </div>
      <div className="flex items-center justify-end gap-2 mt-3">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={onApply}
          className={destructive ? "!bg-error !text-white" : ""}
        >
          {destructive ? (
            <>
              <Trash2 className="w-3.5 h-3.5" /> Remove
            </>
          ) : (
            <>
              <Check className="w-3.5 h-3.5" /> Apply
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
