"use client";

import { useEffect, useRef, useState } from "react";
import { X, Plus, Link2, Copy, ExternalLink, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAppState } from "@/lib/store";
import {
  useDemoTeam,
  dueLabel,
  type NewTaskInput,
  type TaskPriority,
  type TaskFormat,
} from "@/lib/demo/team";
import { buildShareUrl } from "@/lib/demo/shareTask";

const FORMATS: TaskFormat[] = ["Reel", "Carousel", "Short", "YouTube"];
const PRIORITIES: TaskPriority[] = ["low", "medium", "high"];

function defaultDue(): string {
  const d = new Date();
  d.setDate(d.getDate() + 3);
  return d.toISOString().slice(0, 10);
}

export function NewTaskModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { members, tasks, addTask, memberById } = useDemoTeam();
  const { showToast, theme } = useAppState();

  const [createdId, setCreatedId] = useState<string | null>(null);

  const editors = members.filter(
    (m) => m.role === "editor" || m.role === "manager",
  );

  const [title, setTitle] = useState("");
  const [client, setClient] = useState("");
  const [assigneeId, setAssigneeId] = useState(editors[0]?.id ?? "");
  const [dueDate, setDueDate] = useState(defaultDue());
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [format, setFormat] = useState<TaskFormat>("Reel");
  const [brief, setBrief] = useState("");
  const [inspiration, setInspiration] = useState("");
  const [footage, setFootage] = useState("");
  const [frameio, setFrameio] = useState("");

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  function reset() {
    setTitle("");
    setClient("");
    setAssigneeId(editors[0]?.id ?? "");
    setDueDate(defaultDue());
    setPriority("medium");
    setFormat("Reel");
    setBrief("");
    setInspiration("");
    setFootage("");
    setFrameio("");
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !assigneeId) return;
    const input: NewTaskInput = {
      title: title.trim(),
      client: client.trim() || "Untitled project",
      assigneeId,
      dueDate: new Date(dueDate + "T12:00:00").toISOString(),
      priority,
      format,
      brief: brief.trim() || "No brief added yet.",
      inspirationUrls: inspiration.trim() ? [inspiration.trim()] : [],
      resourceUrls: [
        ...(footage.trim()
          ? [{ label: "Raw footage (Drive)", url: footage.trim(), kind: "footage" as const }]
          : []),
        ...(frameio.trim()
          ? [{ label: "Frame.io review", url: frameio.trim(), kind: "frameio" as const }]
          : []),
      ],
    };
    const id = addTask(input);
    showToast("Task created");
    reset();
    setCreatedId(id);
  }

  function close() {
    setCreatedId(null);
    reset();
    onClose();
  }

  const duePreview = dueDate
    ? dueLabel(new Date(dueDate + "T12:00:00").toISOString()).text
    : "";

  const createdTask = createdId
    ? tasks.find((t) => t.id === createdId)
    : null;
  const shareUrl = createdTask
    ? buildShareUrl(
        createdTask,
        memberById(createdTask.assigneeId)?.name ?? "Unassigned",
      )
    : "";

  return (
    <dialog
      ref={dialogRef}
      onClose={close}
      onClick={(e) => {
        if (e.target === dialogRef.current) close();
      }}
      className="bg-transparent p-0 backdrop:bg-text/40 backdrop:backdrop-blur-sm"
    >
      {createdTask ? (
        <ShareStep
          shareUrl={shareUrl}
          theme={theme}
          onCopied={() => showToast("Share link copied")}
          onCreateAnother={() => setCreatedId(null)}
          onDone={close}
        />
      ) : (
      <form
        onSubmit={submit}
        style={{ colorScheme: theme }}
        className="bg-surface border border-border rounded-[16px] w-[min(560px,92vw)] max-h-[88vh] overflow-y-auto shadow-[0_24px_60px_rgba(11,18,32,0.22)]"
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-3 sticky top-0 bg-surface border-b border-border">
          <h2 className="text-[16px] font-semibold text-text">New task</h2>
          <button
            type="button"
            onClick={close}
            className="w-8 h-8 grid place-items-center rounded-md text-muted hover:text-text hover:bg-surface-2 cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-4">
          <Field label="Title">
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Cut 12s hook variant for June launch Reel"
              className={inputCls}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Client / project">
              <input
                value={client}
                onChange={(e) => setClient(e.target.value)}
                placeholder="June Launch"
                className={inputCls}
              />
            </Field>
            <Field label="Assignee">
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className={inputCls}
              >
                {editors.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Field label="Due" hint={duePreview}>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Priority">
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className={inputCls}
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p[0].toUpperCase() + p.slice(1)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Format">
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as TaskFormat)}
                className={inputCls}
              >
                {FORMATS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Brief">
            <textarea
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              rows={3}
              placeholder="What we're going for, the hook, the pacing, what to avoid…"
              className={inputCls + " resize-none py-2"}
            />
          </Field>

          <div className="grid grid-cols-1 gap-3">
            <Field label="Inspiration link (optional)">
              <input
                value={inspiration}
                onChange={(e) => setInspiration(e.target.value)}
                placeholder="https://instagram.com/reel/…"
                className={inputCls}
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Raw footage (optional)">
                <input
                  value={footage}
                  onChange={(e) => setFootage(e.target.value)}
                  placeholder="Drive link"
                  className={inputCls}
                />
              </Field>
              <Field label="Frame.io review (optional)">
                <input
                  value={frameio}
                  onChange={(e) => setFrameio(e.target.value)}
                  placeholder="Frame.io link"
                  className={inputCls}
                />
              </Field>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border sticky bottom-0 bg-surface">
          <Button type="button" variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button type="submit">
            <Plus className="w-3.5 h-3.5" /> Create task
          </Button>
        </div>
      </form>
      )}
    </dialog>
  );
}

function ShareStep({
  shareUrl,
  theme,
  onCopied,
  onCreateAnother,
  onDone,
}: {
  shareUrl: string;
  theme: string;
  onCopied: () => void;
  onCreateAnother: () => void;
  onDone: () => void;
}) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard?.writeText(shareUrl).catch(() => {});
    setCopied(true);
    onCopied();
    setTimeout(() => setCopied(false), 1600);
  }
  return (
    <div
      style={{ colorScheme: theme }}
      className="bg-surface border border-border rounded-[16px] w-[min(520px,92vw)] shadow-[0_24px_60px_rgba(11,18,32,0.22)] overflow-hidden"
    >
      <div className="px-6 pt-6 pb-3 text-center">
        <div className="w-12 h-12 rounded-[14px] bg-success/12 grid place-items-center mx-auto mb-3">
          <Check className="w-5 h-5 text-success" />
        </div>
        <h2 className="text-[17px] font-semibold text-text">Task created</h2>
        <p className="text-[13px] text-muted mt-1">
          Share this link — anyone can open it and see the full task, no login
          needed.
        </p>
      </div>

      <div className="px-6 py-4">
        <div className="flex items-center gap-2 mb-2 text-[12px] font-medium text-text-2">
          <Link2 className="w-3.5 h-3.5 text-accent" /> Shareable link
        </div>
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={shareUrl}
            onFocus={(e) => e.currentTarget.select()}
            className="flex-1 h-9 rounded-[10px] border border-border bg-surface-2 px-3 text-[12px] text-text-2 focus:outline-none"
          />
          <button
            onClick={copy}
            className="h-9 px-3 shrink-0 inline-flex items-center gap-1.5 rounded-[10px] btn-primary text-white text-[13px] cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <a
          href={shareUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 mt-3 text-[12.5px] text-accent hover:underline"
        >
          <ExternalLink className="w-3.5 h-3.5" /> Preview what they&apos;ll see
        </a>
      </div>

      <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border">
        <Button variant="ghost" onClick={onCreateAnother}>
          Create another
        </Button>
        <Button onClick={onDone}>Done</Button>
      </div>
    </div>
  );
}

const inputCls =
  "w-full h-9 rounded-[10px] border border-border bg-surface px-3 text-[13px] text-text placeholder:text-muted focus:outline-none focus:border-accent/50";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="flex items-center justify-between mb-1.5">
        <span className="text-[12px] font-medium text-text-2">{label}</span>
        {hint && <span className="text-[11px] text-muted">{hint}</span>}
      </span>
      {children}
    </label>
  );
}
