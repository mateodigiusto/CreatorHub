"use client";

import { useRef } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/cn";

type Props = {
  onFiles: (files: FileList | null) => void | Promise<void>;
  uploading?: boolean;
  context: "library" | "picker";
  className?: string;
};

export function AddAssetCard({ onFiles, uploading, context, className }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const savesTo = context === "library" ? "Library" : "Library + this picker";

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      disabled={uploading}
      aria-label="Add new asset from your device"
      className={cn(
        "group rounded-[14px] border-2 border-dashed border-accent/35 bg-accent-soft/40 hover:bg-accent-soft/70 hover:border-accent/55 transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer flex flex-col text-left overflow-hidden",
        className,
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        hidden
        onChange={(e) => {
          void onFiles(e.target.files);
          if (inputRef.current) inputRef.current.value = "";
        }}
      />
      <div className="aspect-[4/5] flex flex-col items-center justify-center px-4">
        <div className="w-14 h-14 rounded-full border-[1.5px] border-accent/70 text-accent grid place-items-center mb-4 group-hover:scale-105 transition-transform">
          <Plus className="w-6 h-6" />
        </div>
        <div className="text-[15px] font-semibold text-text text-center">
          {uploading ? "Uploading…" : "Add new asset"}
        </div>
        <div className="text-[12.5px] text-muted mt-1 text-center">
          Photo or video — max 15s
        </div>
      </div>
      <div className="border-t border-accent/15 bg-surface/55 px-3 py-2.5 text-[11px] space-y-1">
        <div className="flex items-center gap-1.5">
          <span className="bg-surface-2 border border-border px-1.5 py-0.5 rounded-md font-semibold text-text shrink-0">
            Upload
          </span>
          <span className="text-muted truncate">From your device</span>
        </div>
        <div className="text-muted truncate">
          <span className="font-semibold text-text">Saves to:</span> {savesTo}
        </div>
      </div>
    </button>
  );
}
