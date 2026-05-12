"use client";

/**
 * Asset links list. Each row links to an external resource (Drive, Notion,
 * Loom, etc.) with a category + visibility flag.
 */

import { useEffect, useState } from "react";
import { ExternalLink, Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  ASSET_CATEGORIES,
  ASSET_CATEGORY_LABEL,
  type AssetCategory,
  type AssetLink,
  type Visibility,
} from "@/lib/agency/assets-types";

type Props = {
  slug: string;
  folderId: string | null;
};

export function AssetLinkList({ slug, folderId }: Props) {
  const [links, setLinks] = useState<AssetLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const load = async () => {
    setLoading(true);
    const qs = folderId ? `?folderId=${folderId}` : "";
    const res = await fetch(`/api/clients/${slug}/assets/links${qs}`, {
      cache: "no-store",
    });
    if (res.ok) {
      const body = (await res.json()) as { links: AssetLink[] };
      setLinks(body.links);
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, folderId]);

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[14.5px] font-semibold text-text">Links</h3>
        <Button size="sm" onClick={() => setAdding((v) => !v)}>
          <Plus className="w-3.5 h-3.5" />
          Add link
        </Button>
      </div>

      {adding && (
        <AddLinkForm
          slug={slug}
          folderId={folderId}
          onDone={() => {
            setAdding(false);
            void load();
          }}
        />
      )}

      {loading ? (
        <p className="text-[13px] text-muted py-4">Loading…</p>
      ) : links.length === 0 ? (
        <EmptyState
          title="No links yet"
          description="Paste a Drive folder, Notion page, or Loom recording."
          primaryAction={{ label: "Add link", onClick: () => setAdding(true) }}
          showSampleDataCta={false}
        />
      ) : (
        <ul className="divide-y divide-border -mx-1">
          {links.map((l) => (
            <LinkRow key={l.id} slug={slug} link={l} onChanged={load} />
          ))}
        </ul>
      )}
    </Card>
  );
}

function AddLinkForm({
  slug,
  folderId,
  onDone,
}: {
  slug: string;
  folderId: string | null;
  onDone: () => void;
}) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState<AssetCategory>("other");
  const [visibility, setVisibility] = useState<Visibility>("internal");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setErr(null);
        setBusy(true);
        const res = await fetch(`/api/clients/${slug}/assets/links`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            url: url.trim(),
            category,
            visibility,
            folderId,
          }),
        });
        setBusy(false);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setErr(body.error ?? "save_failed");
          return;
        }
        onDone();
      }}
      className="mb-4 p-3 rounded-md bg-surface-2 border border-border space-y-2"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input
          required
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="bg-surface border border-border rounded px-2 py-1.5 text-[13px] outline-none focus:border-accent/40"
        />
        <input
          required
          placeholder="https://…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="bg-surface border border-border rounded px-2 py-1.5 text-[13px] outline-none focus:border-accent/40"
        />
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as AssetCategory)}
          className="bg-surface border border-border rounded px-2 py-1.5 text-[12.5px] outline-none"
        >
          {ASSET_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {ASSET_CATEGORY_LABEL[c]}
            </option>
          ))}
        </select>
        <select
          value={visibility}
          onChange={(e) => setVisibility(e.target.value as Visibility)}
          className="bg-surface border border-border rounded px-2 py-1.5 text-[12.5px] outline-none"
        >
          <option value="internal">Internal</option>
          <option value="client_visible">Client visible</option>
        </select>
        <div className="ml-auto flex items-center gap-2">
          {err && <span className="text-[12px] text-[var(--error)]">{err}</span>}
          <Button size="sm" type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </form>
  );
}

function LinkRow({
  slug,
  link,
  onChanged,
}: {
  slug: string;
  link: AssetLink;
  onChanged: () => void;
}) {
  return (
    <li className="flex items-center gap-3 px-1 py-2.5 group">
      <ExternalLink className="w-4 h-4 text-muted shrink-0" />
      <div className="flex-1 min-w-0">
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-[13.5px] text-text hover:text-accent truncate"
        >
          {link.title}
        </a>
        <p className="text-[11.5px] text-muted truncate">{link.url}</p>
      </div>
      <Badge tone="neutral">{ASSET_CATEGORY_LABEL[link.category]}</Badge>
      <Badge tone={link.visibility === "client_visible" ? "accent" : "neutral"}>
        {link.visibility === "client_visible" ? "Client" : "Internal"}
      </Badge>
      <button
        type="button"
        onClick={async () => {
          if (!window.confirm("Delete this link?")) return;
          await fetch(`/api/clients/${slug}/assets/links/${link.id}`, {
            method: "DELETE",
          });
          onChanged();
        }}
        className="opacity-0 group-hover:opacity-100 text-muted hover:text-[var(--error)] transition-opacity"
        aria-label="Delete"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </li>
  );
}
