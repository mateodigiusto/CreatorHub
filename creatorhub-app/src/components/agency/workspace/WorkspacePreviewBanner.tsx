import { Eye } from "lucide-react";

/**
 * Shown above the WorkspaceHeader when an agency director is previewing
 * a client's portal. Plain `<form method="POST">` so it works without JS.
 */
export function WorkspacePreviewBanner({ clientName }: { clientName: string }) {
  return (
    <div className="border-b border-accent-border bg-accent-soft">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-2.5">
        <div className="flex items-center gap-2 text-[12.5px] text-text">
          <Eye className="h-3.5 w-3.5 text-accent" />
          <span>
            <span className="font-semibold">Client view</span>
            <span className="text-text-2">
              {" "}— previewing {clientName}&apos;s workspace
            </span>
          </span>
        </div>
        <form method="POST" action="/api/workspace/preview/exit">
          <button
            type="submit"
            className="inline-flex h-7 items-center gap-1.5 rounded-[8px] border border-accent-border bg-surface px-2.5 text-[12px] font-medium text-text hover:border-accent/50 cursor-pointer"
          >
            Exit client view
          </button>
        </form>
      </div>
    </div>
  );
}
