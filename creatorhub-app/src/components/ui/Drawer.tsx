"use client";

import { ReactNode, useEffect } from "react";
import { X } from "lucide-react";

export function Drawer({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="absolute inset-0 backdrop-blur-[2px]"
        style={{ background: "rgba(7,11,20,0.50)" }}
        onClick={onClose}
      />
      <div className="ml-auto relative w-full max-w-[480px] h-full bg-surface/95 backdrop-blur-xl border-l border-border shadow-[-12px_0_48px_-12px_rgba(7,17,31,0.30)] flex flex-col">
        <div className="flex items-center justify-between px-6 h-14 border-b border-border">
          <h3 className="text-[15px] font-semibold tracking-tight text-text">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 grid place-items-center rounded-md text-muted hover:bg-surface-2 hover:text-text"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}
