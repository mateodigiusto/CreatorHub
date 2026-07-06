"use client";

import { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  size?: "sm" | "md";
}

export function IconButton({
  children,
  size = "md",
  className,
  ...rest
}: Props) {
  return (
    <button
      {...rest}
      className={cn(
        "grid place-items-center rounded-[8px] bg-transparent border border-transparent text-muted cursor-pointer hover:bg-surface-2 hover:text-text transition-colors",
        size === "sm" ? "w-7 h-7" : "w-8 h-8",
        className
      )}
    >
      {children}
    </button>
  );
}
