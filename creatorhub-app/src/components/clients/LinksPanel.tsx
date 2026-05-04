"use client";

import { useCallback, useEffect, useState } from "react";
import { Link2, Plus, Trash2, ExternalLink, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAppState } from "@/lib/store";

type LinkItem = {
  id: string;
  addedBy: string;
  url: string;
  title: string | null;
  description: string | null;
  createdAt: string;
};

type Props = {
  relationshipId: string;
};

export function LinksPanel({ relationshipId }: Props) {
  const { showToast } = useAppState();
  const [links, setLinks] = useState<LinkItem[] | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/clients/${relationshipId}/links`, {
        credentials: "include",
      });
      if (!r.ok) {
        setLinks([]);
        return;
      }
      const json = (await r.json()) as { links: LinkItem[] };
      setLinks(json.links);
    } catch {
      setLinks([]);
    }
  }, [relationshipId]);

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --- one-shot bootstrap */
    void load();
  }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!newUrl.trim()) return;
    setSubmitting(true);
    try {
      const r = await fetch(`/api/clients/${relationshipId}/links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          url: newUrl.trim(),
          title: newTitle.trim() || undefined,
          description: newDescription.trim() || undefined,
        }),
      });
      const json = (await r.json()) as { error?: string };
      if (!r.ok) {
        setError(
          json.error === "invalid_url"
            ? "That doesn't look like a valid http(s) URL."
            : "Couldn't save link. Try again.",
        );
        setSubmitting(false);
        return;
      }
      setNewUrl("");
      setNewTitle("");
      setNewDescription("");
      setShowNew(false);
      await load();
      showToast("Link saved");
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteLink(link: LinkItem) {
    if (!window.confirm(`Remove "${link.title || link.url}"?`)) return;
    try {
      const r = await fetch(
        `/api/clients/${relationshipId}/links/${link.id}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );
      if (!r.ok) {
        showToast("Couldn't remove.");
        return;
      }
      await load();
      showToast("Removed");
    } catch {
      showToast("Network error.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h4 className="text-[14px] font-semibold text-text">Saved links</h4>
          <p className="text-[12px] text-muted mt-0.5">
            Drive folders, briefs, references — any URL, always at hand.
          </p>
        </div>
        {!showNew && (
          <Button onClick={() => setShowNew(true)}>
            <Plus className="w-3.5 h-3.5" /> Add link
          </Button>
        )}
      </div>

      {showNew && (
        <form
          onSubmit={add}
          className="rounded-[12px] border border-border bg-surface p-4 space-y-3"
        >
          <input
            type="url"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            placeholder="https://drive.google.com/…"
            disabled={submitting}
            autoFocus
            required
            className="w-full px-3 py-2 rounded-[8px] border border-border bg-surface-2 text-[14px] text-text placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
          />
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Optional label (e.g. April footage)"
            disabled={submitting}
            className="w-full px-3 py-2 rounded-[8px] border border-border bg-surface-2 text-[13px] text-text placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
          />
          <textarea
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="Optional notes"
            disabled={submitting}
            rows={2}
            className="w-full px-3 py-2 rounded-[8px] border border-border bg-surface-2 text-[12.5px] text-text placeholder:text-muted focus:outline-none focus:border-accent transition-colors resize-none"
          />
          {error && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-[8px] bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-[12.5px] text-red-700 dark:text-red-300">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={submitting}
              onClick={() => {
                setShowNew(false);
                setNewUrl("");
                setNewTitle("");
                setNewDescription("");
                setError(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={submitting || !newUrl.trim()}>
              {submitting ? "Saving…" : "Save link"}
            </Button>
          </div>
        </form>
      )}

      {links === null ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-14 rounded-[10px] bg-surface-2 border border-border animate-pulse"
            />
          ))}
        </div>
      ) : links.length === 0 ? (
        <div className="text-center py-8 text-[13px] text-muted rounded-[10px] border border-dashed border-border">
          No links saved yet.
        </div>
      ) : (
        <div className="space-y-2">
          {links.map((l) => (
            <LinkRow key={l.id} link={l} onDelete={() => deleteLink(l)} />
          ))}
        </div>
      )}
    </div>
  );
}

function LinkRow({ link, onDelete }: { link: LinkItem; onDelete: () => void }) {
  let domain = "";
  try {
    domain = new URL(link.url).hostname.replace(/^www\./, "");
  } catch {
    domain = "link";
  }

  return (
    <div className="group flex items-start gap-3 px-3 py-2.5 rounded-[10px] border border-border bg-surface hover:border-accent/40 transition-colors">
      <div className="shrink-0 w-9 h-9 rounded-[8px] bg-accent-soft border border-accent-border grid place-items-center text-accent">
        <Link2 className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[13.5px] font-medium text-text hover:text-accent inline-flex items-center gap-1 truncate cursor-pointer"
        >
          {link.title || domain}
          <ExternalLink className="w-3 h-3 shrink-0 opacity-60" />
        </a>
        <div className="text-[11.5px] text-muted truncate mt-0.5">
          {link.description || link.url}
        </div>
      </div>
      <button
        type="button"
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted hover:text-red-600 cursor-pointer shrink-0"
        aria-label="Remove link"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
