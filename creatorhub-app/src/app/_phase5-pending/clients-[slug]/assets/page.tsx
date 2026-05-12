"use client";

/**
 * Assets tab — folder tree on the left, links + videos on the right.
 *
 * STAGED — see docs/plans/agency-clients-phase5-NOTES.md.
 */

import { use, useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { FolderTree } from "@/components/agency/assets/FolderTree";
import { AssetLinkList } from "@/components/agency/assets/AssetLinkList";
import { AssetVideoList } from "@/components/agency/assets/AssetVideoList";
import type { Folder } from "@/lib/agency/assets-types";

export default function AssetsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadFolders = useCallback(async () => {
    const res = await fetch(`/api/clients/${slug}/folders`, {
      cache: "no-store",
    });
    if (res.ok) {
      const body = (await res.json()) as { folders: Folder[] };
      setFolders(body.folders);
    }
    setLoading(false);
  }, [slug]);

  useEffect(() => {
    void loadFolders();
  }, [loadFolders]);

  return (
    <div className="p-6">
      <PageHeader
        title="Assets"
        description="Folders, links, and videos for this client. Videos are reviewable with timestamped comments."
      />

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6 items-start">
        <aside className="bg-surface border border-border rounded-[14px] p-3 sticky top-4">
          <h3 className="text-[11.5px] font-medium uppercase tracking-wide text-muted px-2.5 pb-2">
            Folders
          </h3>
          {loading ? (
            <p className="text-[12.5px] text-muted px-2.5">Loading…</p>
          ) : (
            <FolderTree
              slug={slug}
              folders={folders}
              selectedFolderId={selectedFolderId}
              onSelect={setSelectedFolderId}
              onMutated={loadFolders}
            />
          )}
        </aside>

        <div className="space-y-4 min-w-0">
          <AssetLinkList slug={slug} folderId={selectedFolderId} />
          <AssetVideoList slug={slug} folderId={selectedFolderId} />
        </div>
      </div>
    </div>
  );
}
