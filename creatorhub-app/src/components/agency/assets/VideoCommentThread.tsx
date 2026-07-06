"use client";

/**
 * Timestamp-anchored, threaded comment list. Used under an asset_video card
 * and (with `kind="content"`) under a content_item dialog tab.
 *
 * Anchoring snapshots the player's `currentTime` via `getCurrentTime()`.
 * Clicking a timecode seeks via `onSeek`.
 */

import { useEffect, useState } from "react";
import { Check, Clock, CornerDownRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  formatTimecode,
  nestComments,
  type CommentNode,
  type ContentComment,
} from "@/lib/agency/assets-types";

type Kind = "video" | "content";

type Props = {
  slug: string;
  videoId?: string;
  contentId?: string;
  kind?: Kind;
  onSeek?: (seconds: number) => void;
  getCurrentTime?: () => number | null;
};

export function VideoCommentThread({
  slug,
  videoId,
  contentId,
  kind = "video",
  onSeek,
  getCurrentTime,
}: Props) {
  const [comments, setComments] = useState<ContentComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [anchored, setAnchored] = useState(true);
  const [internal, setInternal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);

  const basePath =
    kind === "video"
      ? `/api/clients/${slug}/assets/videos/${videoId}/comments`
      : `/api/clients/${slug}/content/${contentId}/comments`;

  const load = async () => {
    const res = await fetch(basePath, { cache: "no-store" });
    if (res.ok) {
      const body = (await res.json()) as { comments: ContentComment[] };
      setComments(body.comments);
    }
    setLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basePath]);

  const post = async () => {
    if (!text.trim()) return;
    setBusy(true);
    const timestampSeconds =
      kind === "video" && anchored && getCurrentTime ? getCurrentTime() : null;
    const res = await fetch(basePath, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        body: text.trim(),
        parentId: replyTo,
        isInternal: internal,
        timestampSeconds,
      }),
    });
    setBusy(false);
    if (res.ok) {
      setText("");
      setReplyTo(null);
      setAnchored(true);
      setInternal(false);
      void load();
    }
  };

  const tree = nestComments(comments);

  return (
    <div className="rounded-md bg-surface border border-border p-3 space-y-3">
      <div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          placeholder={replyTo ? "Write a reply…" : "Leave feedback…"}
          className="w-full bg-surface-2 border border-border rounded px-2 py-1.5 text-[13px] outline-none focus:border-accent/40 resize-y"
        />
        <div className="flex items-center gap-3 flex-wrap mt-2">
          {kind === "video" && (
            <label className="inline-flex items-center gap-1.5 text-[11.5px] text-muted cursor-pointer">
              <input
                type="checkbox"
                checked={anchored}
                onChange={(e) => setAnchored(e.target.checked)}
              />
              Anchor at current time
            </label>
          )}
          <label className="inline-flex items-center gap-1.5 text-[11.5px] text-muted cursor-pointer">
            <input
              type="checkbox"
              checked={internal}
              onChange={(e) => setInternal(e.target.checked)}
            />
            Internal only
          </label>
          {replyTo && (
            <button
              type="button"
              onClick={() => setReplyTo(null)}
              className="text-[11.5px] text-muted hover:text-accent"
            >
              Cancel reply
            </button>
          )}
          <div className="ml-auto">
            <Button size="sm" onClick={post} disabled={busy || !text.trim()}>
              {busy ? "Posting…" : "Post"}
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <p className="text-[12.5px] text-muted">Loading…</p>
      ) : tree.length === 0 ? (
        <p className="text-[12.5px] text-muted">No comments yet.</p>
      ) : (
        <ul className="space-y-2">
          {tree.map((c) => (
            <CommentItem
              key={c.id}
              node={c}
              depth={0}
              basePath={basePath}
              onChanged={load}
              onSeek={onSeek}
              onReply={(id) => setReplyTo(id)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function CommentItem({
  node,
  depth,
  basePath,
  onChanged,
  onSeek,
  onReply,
}: {
  node: CommentNode;
  depth: number;
  basePath: string;
  onChanged: () => void;
  onSeek?: (seconds: number) => void;
  onReply: (id: string) => void;
}) {
  const isResolved = !!node.resolvedAt;
  return (
    <li>
      <div
        className="rounded-md p-2 bg-surface-2 border border-border group"
        style={{ marginLeft: depth * 14 }}
      >
        <div className="flex items-center gap-2 mb-1">
          {node.timestampSeconds !== null && (
            <button
              type="button"
              onClick={() => onSeek?.(node.timestampSeconds!)}
              className="inline-flex items-center gap-1 text-[11px] text-accent hover:underline tabular-nums"
            >
              <Clock className="w-3 h-3" />
              {formatTimecode(node.timestampSeconds)}
            </button>
          )}
          {node.isInternal && (
            <span className="text-[10.5px] uppercase tracking-wide text-[var(--warning)]">
              Internal
            </span>
          )}
          {isResolved && (
            <span className="inline-flex items-center gap-0.5 text-[10.5px] text-[var(--success)]">
              <Check className="w-3 h-3" />
              Resolved
            </span>
          )}
          <span className="ml-auto text-[10.5px] text-muted tabular-nums">
            {new Date(node.createdAt).toLocaleString()}
          </span>
        </div>
        <p
          className={
            "text-[12.5px] text-text whitespace-pre-wrap " +
            (isResolved ? "opacity-60" : "")
          }
        >
          {node.body}
        </p>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-1 flex items-center gap-3 text-[11px] text-muted">
          <button
            type="button"
            onClick={() => onReply(node.id)}
            className="inline-flex items-center gap-0.5 hover:text-accent"
          >
            <CornerDownRight className="w-3 h-3" />
            Reply
          </button>
          <button
            type="button"
            onClick={async () => {
              await fetch(`${basePath}/${node.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ resolved: !isResolved }),
              });
              onChanged();
            }}
            className="hover:text-accent"
          >
            {isResolved ? "Reopen" : "Resolve"}
          </button>
          <button
            type="button"
            onClick={async () => {
              if (!window.confirm("Delete this comment?")) return;
              await fetch(`${basePath}/${node.id}`, { method: "DELETE" });
              onChanged();
            }}
            className="ml-auto hover:text-[var(--error)]"
            aria-label="Delete"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
      {node.replies.length > 0 && (
        <ul className="mt-2 space-y-2">
          {node.replies.map((r) => (
            <CommentItem
              key={r.id}
              node={r}
              depth={depth + 1}
              basePath={basePath}
              onChanged={onChanged}
              onSeek={onSeek}
              onReply={onReply}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
