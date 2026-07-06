import { CSSProperties } from "react";
import { cn } from "@/lib/cn";

export function Thumb({
  gradient,
  size = "md",
  label,
  className,
  style,
}: {
  gradient: string;
  size?: "sm" | "md" | "lg";
  label?: string;
  className?: string;
  style?: CSSProperties;
}) {
  const sizes = {
    sm: "w-9 h-9 rounded-md text-[10px]",
    md: "w-12 h-12 rounded-[10px] text-[11px]",
    lg: "w-full aspect-[4/5] rounded-[12px] text-[13px]",
  } as const;
  return (
    <div
      className={cn(
        "shrink-0 grid place-items-end p-2 text-white/85 font-medium overflow-hidden relative",
        sizes[size],
        className
      )}
      style={{ background: gradient, ...style }}
    >
      {label && (
        <span className="relative z-10 bg-black/20 backdrop-blur-sm rounded px-1.5 py-0.5 text-[10px]">
          {label}
        </span>
      )}
    </div>
  );
}
