"use client";

/**
 * Folder tree for the Assets tab. Tree built client-side from the flat
 * folder list returned by `GET /api/clients/[slug]/folders`. Selection
 * lifts to the parent so link + video lists can filter by folderId.
 */

import { useState } from "react";
import { ChevronRight, FolderPlus, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  buildFolderTree,
  type Folder,
  type FolderNode,
} from "@/lib/agency/assets-types";

type Props = {
  slug: string;
  folders: Folder[];
  selectedFolderId: string | null;
  onSelect: (id: string | null) => void;
  onMutated: () => void;
};

export function FolderTree({
  slug,
  folders,
  selectedFolderId,
  onSelect,
  onMutated,
}: Props) {
  const tree = buildFolderTree(folders);
  return (
    <div className="text-[13.5px] text-text">
      <button
        type="button"
        onClick={() => onSelect(null)}
        className={cn(
          "w-full text-left px-2.5 py-1.5 rounded-md hover:bg-surface-2 transition-colors",
          selectedFolderId === null && "bg-accent/[0.06] text-accent",
        )}
      >
        All files
      </button>
      <ul className="mt-1 space-y-0.5">
        {tree.map((node) => (
          <FolderRow
            key={node.id}
            node={node}
            depth={0}
            slug={slug}
            selectedFolderId={selectedFolderId}
            onSelect={onSelect}
            onMutated={onMutated}
          />
        ))}
      </ul>
      <NewFolderRow slug={slug} parentId={null} onCreated={onMutated} />
    </div>
  );
}

function FolderRow({
  node,
  depth,
  slug,
  selectedFolderId,
  onSelect,
  onMutated,
}: {
  node: FolderNode;
  depth: number;
  slug: string;
  selectedFolderId: string | null;
  onSelect: (id: string | null) => void;
  onMutated: () => void;
}) {
  const [open, setOpen] = useState(depth === 0);
  const [renaming, setRenaming] = useState(false);
  const isSelected = node.id === selectedFolderId;
  const hasChildren = node.children.length > 0;

  return (
    <li>
      <div
        className={cn(
          "group flex items-center gap-1 rounded-md hover:bg-surface-2",
          isSelected && "bg-accent/[0.06]",
        )}
        style={{ paddingLeft: 8 + depth * 14 }}
      >
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "w-5 h-5 grid place-items-center text-muted",
            !hasChildren && "invisible",
          )}
          aria-label={open ? "Collapse" : "Expand"}
        >
          <ChevronRight
            className={cn(
              "w-3.5 h-3.5 transition-transform",
              open && "rotate-90",
            )}
          />
        </button>
        {renaming ? (
          <RenameInline
            slug={slug}
            folderId={node.id}
            initial={node.name}
            onDone={() => {
              setRenaming(false);
              onMutated();
            }}
            onCancel={() => setRenaming(false)}
          />
        ) : (
          <>
            <button
              type="button"
              onClick={() => onSelect(node.id)}
              className={cn(
                "flex-1 text-left py-1 truncate",
                isSelected && "text-accent",
              )}
            >
              {node.name}
            </button>
            <div className="hidden group-hover:flex items-center gap-0.5 pr-1.5">
              <button
                type="button"
                onClick={() => setRenaming(true)}
                className="p-1 text-muted hover:text-text"
                aria-label="Rename"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <DeleteButton slug={slug} folderId={node.id} onDone={onMutated} />
            </div>
          </>
        )}
      </div>
      {open && (
        <>
          {hasChildren && (
            <ul className="mt-0.5 space-y-0.5">
              {node.children.map((c) => (
                <FolderRow
                  key={c.id}
                  node={c}
                  depth={depth + 1}
                  slug={slug}
                  selectedFolderId={selectedFolderId}
                  onSelect={onSelect}
                  onMutated={onMutated}
                />
              ))}
            </ul>
          )}
          <div style={{ paddingLeft: 8 + (depth + 1) * 14 }}>
            <NewFolderRow slug={slug} parentId={node.id} onCreated={onMutated} />
          </div>
        </>
      )}
    </li>
  );
}

function RenameInline({
  slug,
  folderId,
  initial,
  onDone,
  onCancel,
}: {
  slug: string;
  folderId: string;
  initial: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!value.trim() || value.trim() === initial) {
          onCancel();
          return;
        }
        await fetch(`/api/clients/${slug}/folders/${folderId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: value.trim() }),
        });
        onDone();
      }}
      className="flex-1 py-0.5"
    >
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={onCancel}
        onKeyDown={(e) => {
          if (e.key === "Escape") onCancel();
        }}
        className="w-full bg-surface border border-accent/40 rounded px-1.5 py-0.5 text-[13px] outline-none"
      />
    </form>
  );
}

function DeleteButton({
  slug,
  folderId,
  onDone,
}: {
  slug: string;
  folderId: string;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        if (!window.confirm("Delete this folder and all its contents?")) return;
        setBusy(true);
        await fetch(`/api/clients/${slug}/folders/${folderId}`, {
          method: "DELETE",
        });
        setBusy(false);
        onDone();
      }}
      className="p-1 text-muted hover:text-[var(--error)] disabled:opacity-50"
      aria-label="Delete"
    >
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  );
}

function NewFolderRow({
  slug,
  parentId,
  onCreated,
}: {
  slug: string;
  parentId: string | null;
  onCreated: () => void;
}) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  if (!creating) {
    return (
      <button
        type="button"
        onClick={() => setCreating(true)}
        className="flex items-center gap-1.5 text-[12.5px] text-muted hover:text-accent px-2.5 py-1 mt-1"
      >
        <FolderPlus className="w-3.5 h-3.5" />
        New folder
      </button>
    );
  }
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!name.trim()) {
          setCreating(false);
          return;
        }
        await fetch(`/api/clients/${slug}/folders`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim(), parentId }),
        });
        setName("");
        setCreating(false);
        onCreated();
      }}
      className="px-2.5 py-1"
    >
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => {
          if (!name.trim()) setCreating(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setName("");
            setCreating(false);
          }
        }}
        placeholder="Folder name"
        className="w-full bg-surface border border-accent/40 rounded px-1.5 py-1 text-[13px] outline-none"
      />
    </form>
  );
}
