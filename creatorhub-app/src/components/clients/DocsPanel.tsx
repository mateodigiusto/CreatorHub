"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Upload,
  Image as ImageIcon,
  Video,
  FileText,
  Trash2,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAppState } from "@/lib/store";
import { uploadAssetFile } from "@/lib/uploads";

type DocItem = {
  id: string;
  assetId: string;
  sharedBy: string;
  title: string;
  kind: "photo" | "video" | "screenshot" | "testimonial" | "proof";
  durationSeconds: number | null;
  signedUrl: string | null;
  createdAt: string;
};

type Props = {
  relationshipId: string;
};

export function DocsPanel({ relationshipId }: Props) {
  const { showToast } = useAppState();
  const [docs, setDocs] = useState<DocItem[] | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/clients/${relationshipId}/documents`, {
        credentials: "include",
      });
      if (!r.ok) {
        setDocs([]);
        return;
      }
      const json = (await r.json()) as { documents: DocItem[] };
      setDocs(json.documents);
    } catch {
      setDocs([]);
    }
  }, [relationshipId]);

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --- one-shot bootstrap */
    void load();
  }, [load]);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    let added = 0;
    let failed = 0;
    for (const file of Array.from(files)) {
      const upload = await uploadAssetFile(file);
      if (!upload.ok) {
        failed++;
        continue;
      }
      /* The upload helper finalizes the asset and returns ok, but doesn't
         expose the assetId. Re-fetch the latest asset for this user. */
      const r = await fetch("/api/assets", { credentials: "include" });
      if (!r.ok) {
        failed++;
        continue;
      }
      const j = (await r.json()) as {
        assets: Array<{ id: string; createdAt: string }>;
      };
      const newest = j.assets[0];
      if (!newest) {
        failed++;
        continue;
      }
      const attach = await fetch(
        `/api/clients/${relationshipId}/documents`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ assetId: newest.id }),
        },
      );
      if (attach.ok) added++;
      else failed++;
    }
    setUploading(false);
    await load();
    if (added > 0) {
      showToast(
        `${added} doc${added === 1 ? "" : "s"} shared${
          failed > 0 ? ` · ${failed} failed` : ""
        }`,
      );
    } else if (failed > 0) {
      showToast(`Couldn't share (${failed} file${failed === 1 ? "" : "s"})`);
    }
  }

  async function deleteDoc(doc: DocItem) {
    if (!window.confirm(`Remove "${doc.title}" from this hub?`)) return;
    try {
      const r = await fetch(
        `/api/clients/${relationshipId}/documents/${doc.id}`,
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
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h4 className="text-[14px] font-semibold text-text">Shared files</h4>
          <p className="text-[12px] text-muted mt-0.5">
            Files you upload here are visible to both sides of this relationship.
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          hidden
          onChange={(e) => {
            void handleFiles(e.target.files);
            if (fileInputRef.current) fileInputRef.current.value = "";
          }}
        />
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          <Upload className="w-3.5 h-3.5" />
          {uploading ? "Uploading…" : "Share a file"}
        </Button>
      </div>

      {docs === null ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[4/5] rounded-[10px] bg-surface-2 border border-border animate-pulse"
            />
          ))}
        </div>
      ) : docs.length === 0 ? (
        <div className="text-center py-8 text-[13px] text-muted rounded-[10px] border border-dashed border-border">
          No files shared yet. Drop a file to start the library.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {docs.map((d) => (
            <DocTile key={d.id} doc={d} onDelete={() => deleteDoc(d)} />
          ))}
        </div>
      )}
    </div>
  );
}

function DocTile({ doc, onDelete }: { doc: DocItem; onDelete: () => void }) {
  const isVideo = doc.kind === "video";
  const Icon = isVideo ? Video : doc.kind === "photo" ? ImageIcon : FileText;

  return (
    <div className="group lift relative rounded-[10px] border border-border bg-surface card-base overflow-hidden">
      <div className="aspect-[4/5] relative bg-surface-2">
        {doc.signedUrl && !isVideo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={doc.signedUrl}
            alt={doc.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        {doc.signedUrl && isVideo && (
          // eslint-disable-next-line creatorhub/no-bare-video --- click-to-play poster swap is in Phase 1 part 2 follow-up; preload="none" + muted keeps Storage egress low
          <video
            src={doc.signedUrl}
            muted
            playsInline
            preload="none"
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
        <div className="absolute top-2 left-2">
          <span className="bg-black/35 backdrop-blur-sm text-white text-[10px] px-1.5 py-0.5 rounded font-medium uppercase tracking-wide inline-flex items-center gap-1">
            <Icon className="w-2.5 h-2.5" /> {doc.kind}
          </span>
        </div>
        <div className="absolute bottom-2 left-2 right-2">
          <div className="text-white text-[12px] font-semibold drop-shadow truncate">
            {doc.title}
          </div>
        </div>
      </div>
      <div className="absolute top-1.5 right-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {doc.signedUrl && (
          <a
            href={doc.signedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-black/55 backdrop-blur-sm text-white p-1.5 rounded-md hover:bg-black/75 cursor-pointer"
            aria-label="Open in new tab"
          >
            <Download className="w-3.5 h-3.5" />
          </a>
        )}
        <button
          type="button"
          onClick={onDelete}
          className="bg-black/55 backdrop-blur-sm text-white p-1.5 rounded-md hover:bg-red-600/85 cursor-pointer"
          aria-label="Remove from hub"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
