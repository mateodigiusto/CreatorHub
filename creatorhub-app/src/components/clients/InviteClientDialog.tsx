"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { ClientInviteLinkInline } from "./ClientInviteLinkInline";

/**
 * Lightweight dialog wrapping the shared client join-link UI. Opened from
 * the per-client "Invite" action on the clients grid so an agency can grab
 * a client's link without diving into Settings.
 */
export function InviteClientDialog({
  open,
  onClose,
  slug,
  clientName,
}: {
  open: boolean;
  onClose: () => void;
  slug: string;
  clientName: string;
}) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className="bg-transparent p-0 backdrop:bg-text/40 backdrop:backdrop-blur-sm"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
    >
      <div
        className="bg-surface border border-border rounded-[14px] w-[min(460px,92vw)] p-6 shadow-[0_24px_60px_rgba(11,18,32,0.18)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-[17px] font-semibold tracking-[-0.005em] text-text">
              Invite {clientName}
            </h2>
            <p className="text-[13px] text-muted mt-1">
              Send this link to the creator and their team — they sign in and
              request access to this workspace.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:text-text cursor-pointer p-1 -m-1"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {open && <ClientInviteLinkInline slug={slug} />}
      </div>
    </dialog>
  );
}
