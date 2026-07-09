"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  Copy,
  Send,
  Paperclip,
  CheckCircle2,
  Captions,
  Ratio,
  Clock,
  FileVideo,
  AlertTriangle,
  Link2,
} from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useAppState } from "@/lib/store";
import {
  useDemoTeam,
  dueLabel,
  timeAgo,
  STATUS_LABEL,
  STATUS_ORDER,
  type Task,
  type TaskStatus,
} from "@/lib/demo/team";
import {
  StatusBadge,
  PriorityChip,
  FormatChip,
  ClientChip,
  MemberAvatar,
  RESOURCE_ICON,
  INSPO_ICON,
} from "./bits";
import { buildShareUrl } from "@/lib/demo/shareTask";

export function TaskDetail({
  taskId,
  lens,
  backHref,
  backLabel,
}: {
  taskId: string;
  lens: "editor" | "manager";
  backHref: string;
  backLabel: string;
}) {
  const { tasks, memberById, ready } = useDemoTeam();
  const task = tasks.find((t) => t.id === taskId);

  if (!ready) {
    return (
      <div className="h-[320px] rounded-[14px] bg-surface-2 border border-border animate-pulse" />
    );
  }

  if (!task) {
    return (
      <Card className="text-center py-12">
        <div className="text-[15px] font-semibold text-text">Task not found</div>
        <p className="text-[13px] text-muted mt-1">
          It may have been removed.
        </p>
        <div className="mt-4">
          <Link href={backHref}>
            <Button variant="outline">{backLabel}</Button>
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <TaskDetailBody
      task={task}
      lens={lens}
      backHref={backHref}
      backLabel={backLabel}
      assigneeName={memberById(task.assigneeId)?.name ?? "Unassigned"}
    />
  );
}

function TaskDetailBody({
  task,
  lens,
  backHref,
  backLabel,
  assigneeName,
}: {
  task: Task;
  lens: "editor" | "manager";
  backHref: string;
  backLabel: string;
  assigneeName: string;
}) {
  const { showToast } = useAppState();
  const {
    memberById,
    setTaskStatus,
    setBlocked,
    addComment,
    attachDeliverable,
    sendToContent,
  } = useDemoTeam();
  const [draft, setDraft] = useState("");
  const [linkInput, setLinkInput] = useState(task.deliverableUrl ?? "");
  const [showLinkField, setShowLinkField] = useState(false);
  const [editingBlocker, setEditingBlocker] = useState(false);
  const [blockerDraft, setBlockerDraft] = useState(task.blockerReason ?? "");
  const [needDraft, setNeedDraft] = useState(task.blockerNeed ?? "");

  const due = dueLabel(task.dueDate);
  const assignee = memberById(task.assigneeId);

  function copy(url: string) {
    navigator.clipboard?.writeText(url).then(
      () => showToast("Link copied"),
      () => showToast("Couldn't copy"),
    );
  }

  function changeStatus(s: TaskStatus) {
    if (s === "blocked") {
      setTaskStatus(task.id, "blocked");
      setBlockerDraft(task.blockerReason ?? "");
      setNeedDraft(task.blockerNeed ?? "");
      setEditingBlocker(true);
      showToast("Moved to Blocked");
      return;
    }
    setTaskStatus(task.id, s);
    showToast(`Moved to ${STATUS_LABEL[s]}`);
  }

  function saveBlocker() {
    if (!blockerDraft.trim()) return;
    setBlocked(task.id, blockerDraft.trim(), needDraft.trim() || undefined);
    setEditingBlocker(false);
    showToast("Blocker updated");
  }

  function postComment() {
    if (!draft.trim()) return;
    addComment(task.id, draft.trim());
    setDraft("");
  }

  function submitForReview() {
    setTaskStatus(task.id, "in_review");
    showToast("Submitted for review");
  }

  function approve() {
    setTaskStatus(task.id, "done");
    showToast("Approved — marked Done");
  }

  function saveLink() {
    if (!linkInput.trim()) return;
    attachDeliverable(task.id, linkInput.trim());
    setShowLinkField(false);
    showToast("Deliverable link attached");
  }

  function handoff() {
    sendToContent(task.id);
    showToast("Added to Content");
  }

  return (
    <div className="max-w-[920px] mx-auto">
      <div className="flex items-center justify-between gap-3 mb-4">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-text transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {backLabel}
        </Link>
        <Button
          size="sm"
          variant="outline"
          onClick={() => copy(buildShareUrl(task, assigneeName))}
        >
          <Link2 className="w-3.5 h-3.5" /> Share link
        </Button>
      </div>

      {/* Header */}
      <Card className="mb-4">
        <div className="flex items-center gap-1.5 flex-wrap mb-3">
          <ClientChip client={task.client} />
          <FormatChip format={task.format} />
          <StatusBadge status={task.status} />
          {task.sentToContent && (
            <Badge tone="green">
              <CheckCircle2 className="w-3 h-3" /> Sent to Content
            </Badge>
          )}
        </div>
        <h1 className="text-[20px] font-semibold tracking-[-0.01em] text-text leading-snug">
          {task.title}
        </h1>

        <div className="flex items-center gap-x-5 gap-y-2 flex-wrap mt-4 pt-4 border-t border-border">
          <DetailMeta label="Assignee">
            <span className="inline-flex items-center gap-1.5">
              <MemberAvatar member={assignee} size={20} />
              <span className="text-[13px] text-text">{assigneeName}</span>
            </span>
          </DetailMeta>
          <DetailMeta label="Due">
            <span
              className={
                due.overdue
                  ? "text-[13px] font-medium text-error"
                  : "text-[13px] text-text"
              }
            >
              {due.text}
            </span>
          </DetailMeta>
          <DetailMeta label="Priority">
            <PriorityChip priority={task.priority} />
          </DetailMeta>
          <DetailMeta label="Status">
            <select
              value={task.status}
              onChange={(e) => changeStatus(e.target.value as TaskStatus)}
              className="h-7 rounded-[8px] border border-border bg-surface text-[12.5px] text-text px-2 cursor-pointer focus:outline-none focus:border-accent/50"
            >
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </DetailMeta>
        </div>
      </Card>

      {/* Blocker */}
      {task.status === "blocked" && (
        <Card
          className="mb-4"
          style={{
            background: "rgba(217,119,6,0.06)",
            borderColor: "rgba(217,119,6,0.22)",
          }}
        >
          <div className="flex items-center gap-2 mb-2.5">
            <AlertTriangle
              className="w-4 h-4"
              style={{ color: "var(--warning)" }}
            />
            <h3
              className="text-[14px] font-semibold"
              style={{ color: "var(--warning)" }}
            >
              Blocked
            </h3>
          </div>

          {editingBlocker || !task.blockerReason ? (
            <div className="flex flex-col gap-2.5">
              <textarea
                autoFocus
                value={blockerDraft}
                onChange={(e) => setBlockerDraft(e.target.value)}
                rows={2}
                placeholder="What's blocking you? e.g. Waiting on raw footage from Friday's shoot"
                className="w-full rounded-[10px] border border-border bg-surface px-3 py-2 text-[13px] text-text placeholder:text-muted focus:outline-none focus:border-accent/50 resize-none"
              />
              <input
                value={needDraft}
                onChange={(e) => setNeedDraft(e.target.value)}
                placeholder="What do you need? (optional)"
                className="w-full h-9 rounded-[10px] border border-border bg-surface px-3 text-[13px] text-text placeholder:text-muted focus:outline-none focus:border-accent/50"
              />
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={saveBlocker}>
                  Save blocker
                </Button>
                {task.blockerReason && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingBlocker(false)}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div>
              <p className="text-[13.5px] text-text-2 leading-relaxed">
                {task.blockerReason}
              </p>
              {task.blockerNeed && (
                <p className="text-[12.5px] text-muted mt-1.5">
                  <span className="font-medium text-text-2">Needs: </span>
                  {task.blockerNeed}
                </p>
              )}
              <button
                onClick={() => {
                  setBlockerDraft(task.blockerReason ?? "");
                  setNeedDraft(task.blockerNeed ?? "");
                  setEditingBlocker(true);
                }}
                className="text-[12px] text-accent mt-2.5 cursor-pointer hover:underline"
              >
                Edit blocker
              </button>
            </div>
          )}
        </Card>
      )}

      {/* Brief */}
      <Card className="mb-4">
        <CardHeader title="Brief & notes" />
        <p className="text-[13.5px] text-text-2 leading-relaxed whitespace-pre-wrap">
          {task.brief}
        </p>
      </Card>

      {/* Inspiration */}
      {task.inspiration.length > 0 && (
        <Card className="mb-4">
          <CardHeader
            title="Inspiration"
            description="What we're going for"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {task.inspiration.map((ins) => {
              const Icon = INSPO_ICON[ins.platform];
              return (
                <a
                  key={ins.id}
                  href={ins.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 rounded-[10px] border border-border bg-surface-2 px-3 py-2.5 hover:border-accent/40 transition-colors group"
                >
                  <span className="w-8 h-8 rounded-lg bg-surface grid place-items-center text-accent shrink-0">
                    <Icon className="w-4 h-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-medium text-text truncate">
                      {ins.title}
                    </span>
                    <span className="block text-[11.5px] text-muted truncate">
                      {ins.url}
                    </span>
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-muted group-hover:text-accent shrink-0" />
                </a>
              );
            })}
          </div>
        </Card>
      )}

      {/* Links & files */}
      {task.resources.length > 0 && (
        <Card className="mb-4">
          <CardHeader title="Links & files" />
          <div className="flex flex-col divide-y divide-border">
            {task.resources.map((r) => {
              const Icon = RESOURCE_ICON[r.kind];
              return (
                <div key={r.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <span className="w-8 h-8 rounded-lg bg-surface-2 grid place-items-center text-text-2 shrink-0">
                    <Icon className="w-4 h-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-medium text-text">
                      {r.label}
                    </span>
                    <span className="block text-[11.5px] text-muted truncate">
                      {r.url}
                    </span>
                  </span>
                  <button
                    onClick={() => copy(r.url)}
                    className="w-7 h-7 grid place-items-center rounded-md text-muted hover:text-text hover:bg-surface-2 cursor-pointer shrink-0"
                    aria-label={`Copy ${r.label}`}
                    title="Copy link"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-7 h-7 grid place-items-center rounded-md text-muted hover:text-accent hover:bg-surface-2 cursor-pointer shrink-0"
                    aria-label={`Open ${r.label}`}
                    title="Open in new tab"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Specs */}
      <Card className="mb-4">
        <CardHeader title="Deliverable specs" />
        <div className="flex items-center gap-2 flex-wrap">
          <SpecChip icon={<Ratio className="w-3.5 h-3.5" />} text={task.specs.aspectRatio} />
          <SpecChip icon={<Clock className="w-3.5 h-3.5" />} text={task.specs.targetLength} />
          <SpecChip
            icon={<Captions className="w-3.5 h-3.5" />}
            text={task.specs.captions ? "Captions on" : "No captions"}
          />
          <SpecChip icon={<FileVideo className="w-3.5 h-3.5" />} text={task.specs.exportFormat} />
        </div>
      </Card>

      {/* Activity */}
      <Card className="mb-4">
        <CardHeader title="Activity" />
        <div className="flex flex-col gap-3">
          {task.comments.length === 0 && (
            <p className="text-[12.5px] text-muted">No comments yet.</p>
          )}
          {task.comments.map((c) => (
            <div key={c.id} className="flex gap-2.5">
              <MemberAvatar member={memberById(c.authorId)} size={26} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[12.5px] font-semibold text-text">
                    {c.authorName}
                  </span>
                  <span className="text-[11px] text-muted">{timeAgo(c.at)}</span>
                </div>
                <p className="text-[13px] text-text-2 mt-0.5 leading-relaxed">
                  {c.body}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") postComment();
            }}
            placeholder={
              lens === "manager" ? "Leave feedback…" : "Add an update…"
            }
            className="flex-1 h-9 rounded-[10px] border border-border bg-surface px-3 text-[13px] text-text placeholder:text-muted focus:outline-none focus:border-accent/50"
          />
          <Button size="sm" variant="outline" onClick={postComment}>
            Post
          </Button>
        </div>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader
          title="Actions"
          description={
            lens === "manager"
              ? "Review and move this task forward."
              : "Update your work and hand it off."
          }
        />

        {showLinkField && (
          <div className="flex items-center gap-2 mb-3">
            <input
              value={linkInput}
              onChange={(e) => setLinkInput(e.target.value)}
              placeholder="https://app.frame.io/reviews/…"
              className="flex-1 h-9 rounded-[10px] border border-border bg-surface px-3 text-[13px] text-text placeholder:text-muted focus:outline-none focus:border-accent/50"
            />
            <Button size="sm" onClick={saveLink}>
              Save
            </Button>
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          {lens === "editor" && task.status !== "in_review" && task.status !== "done" && (
            <Button size="sm" onClick={submitForReview}>
              <Send className="w-3.5 h-3.5" /> Submit for review
            </Button>
          )}
          {lens === "manager" && task.status === "in_review" && (
            <Button size="sm" onClick={approve}>
              <CheckCircle2 className="w-3.5 h-3.5" /> Approve
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowLinkField((v) => !v)}
          >
            <Paperclip className="w-3.5 h-3.5" />
            {task.deliverableUrl ? "Update deliverable link" : "Attach deliverable link"}
          </Button>
          {task.deliverableUrl && (
            <a href={task.deliverableUrl} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="ghost">
                <ExternalLink className="w-3.5 h-3.5" /> Open deliverable
              </Button>
            </a>
          )}
          {task.status === "done" && !task.sentToContent && (
            <Button size="sm" onClick={handoff}>
              <CheckCircle2 className="w-3.5 h-3.5" /> Send to Content
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}

function DetailMeta({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-[10.5px] uppercase tracking-wider font-semibold text-muted mb-1">
        {label}
      </div>
      {children}
    </div>
  );
}

function SpecChip({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-[8px] bg-surface-2 border border-border px-2.5 py-1.5 text-[12px] text-text-2">
      <span className="text-muted">{icon}</span>
      {text}
    </span>
  );
}
