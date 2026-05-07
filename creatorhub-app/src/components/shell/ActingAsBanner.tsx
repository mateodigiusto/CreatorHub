"use client";

/**
 * "Acting as [client]" banner — sticky thin strip under the Topbar that
 * makes it impossible for an editor to forget they're viewing/editing a
 * client's data instead of their own.
 *
 * Renders only when `currentClient` is set in store. Click "Exit" to
 * return to the editor's own workspace.
 */

import { Users, X } from "lucide-react";
import { useAppState } from "@/lib/store";

export function ActingAsBanner() {
  const { currentClient, setCurrentClient, showToast } = useAppState();
  if (!currentClient) return null;

  return (
    <div
      className="sticky top-14 z-20 flex items-center justify-between gap-3 px-4 sm:px-6 py-2 border-b border-accent/25 text-[12.5px]"
      style={{
        background:
          "linear-gradient(180deg, rgba(37,99,235,0.10) 0%, rgba(37,99,235,0.06) 100%)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <Users className="w-3.5 h-3.5 text-accent shrink-0" />
        <span className="text-accent">
          Acting as{" "}
          <span className="font-semibold">{currentClient.name}</span>
          <span className="text-accent/70 hidden sm:inline">
            {" "}— writes save to this client&apos;s account.
          </span>
        </span>
      </div>
      <button
        onClick={() => {
          setCurrentClient(null);
          showToast("Back to your workspace");
        }}
        className="inline-flex items-center gap-1 text-accent hover:text-accent-2 cursor-pointer font-medium shrink-0"
      >
        <X className="w-3 h-3" /> Exit
      </button>
    </div>
  );
}
