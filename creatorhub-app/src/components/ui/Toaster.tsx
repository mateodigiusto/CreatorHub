"use client";

import { useAppState } from "@/lib/store";
import { Check } from "lucide-react";

export function Toaster() {
  const { toast } = useAppState();
  return (
    <div className="fixed bottom-6 right-6 z-[60] pointer-events-none">
      {toast && (
        <div
          key={toast.id}
          className="pointer-events-auto bg-navy text-white text-[13px] px-4 py-2.5 rounded-[10px] shadow-[0_8px_24px_rgba(10,15,28,0.18)] border border-white/[0.06] flex items-center gap-2 animate-[toast-in_.2s_ease-out]"
          style={{
            backdropFilter: "blur(12px)",
            background:
              "linear-gradient(180deg, rgba(13,27,42,0.95), rgba(10,15,28,0.95))",
          }}
        >
          <span
            className="w-5 h-5 rounded-full grid place-items-center"
            style={{
              background: "rgba(96,165,250,0.20)",
              color: "#93C5FD",
            }}
          >
            <Check className="w-3 h-3" />
          </span>
          <span>{toast.message}</span>
        </div>
      )}
      <style jsx>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
