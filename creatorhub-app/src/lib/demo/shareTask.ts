/**
 * Shareable task links. Because tasks live only in localStorage (demo), a
 * link that relied on the recipient already having the task would break on
 * another device. So we encode a compact snapshot of the task INTO the link
 * (`?d=<base64url>`); the public view decodes and renders it standalone —
 * no login, no shared storage. Falls back to a local lookup by id when no
 * payload is present (e.g. your own device).
 */

import type { Task, TaskStatus, TaskPriority, TaskSpec } from "./team";

export type SharedTaskSnapshot = {
  id: string;
  title: string;
  client: string;
  format: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  brief: string;
  assigneeName: string;
  inspiration: { title: string; url: string; platform: string }[];
  resources: { label: string; url: string; kind: string }[];
  specs: TaskSpec;
  comments: { authorName: string; body: string; at: string }[];
  blockerReason?: string;
  deliverableUrl?: string;
};

export function taskToSnapshot(task: Task, assigneeName: string): SharedTaskSnapshot {
  return {
    id: task.id,
    title: task.title,
    client: task.client,
    format: task.format,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate,
    brief: task.brief,
    assigneeName,
    inspiration: task.inspiration.map((i) => ({
      title: i.title,
      url: i.url,
      platform: i.platform,
    })),
    resources: task.resources.map((r) => ({
      label: r.label,
      url: r.url,
      kind: r.kind,
    })),
    specs: task.specs,
    comments: task.comments.map((c) => ({
      authorName: c.authorName,
      body: c.body,
      at: c.at,
    })),
    blockerReason: task.blockerReason,
    deliverableUrl: task.deliverableUrl,
  };
}

/* URL-safe base64 of a UTF-8 JSON string. */
export function encodeSnapshot(snap: SharedTaskSnapshot): string {
  const json = JSON.stringify(snap);
  const b64 =
    typeof window === "undefined"
      ? Buffer.from(json, "utf-8").toString("base64")
      : btoa(unescape(encodeURIComponent(json)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeSnapshot(param: string): SharedTaskSnapshot | null {
  try {
    let b64 = param.replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    const json =
      typeof window === "undefined"
        ? Buffer.from(b64, "base64").toString("utf-8")
        : decodeURIComponent(escape(atob(b64)));
    const parsed = JSON.parse(json) as SharedTaskSnapshot;
    if (!parsed || typeof parsed.title !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function buildShareUrl(task: Task, assigneeName: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const d = encodeSnapshot(taskToSnapshot(task, assigneeName));
  return `${origin}/task/${task.id}?d=${d}`;
}
