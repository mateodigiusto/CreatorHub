import { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "outline";
type Size = "sm" | "md";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

const variants: Record<Variant, string> = {
  primary: "btn-primary text-white",
  secondary: "bg-surface text-text border border-border hover:border-accent/40",
  ghost: "text-text hover:bg-surface-2",
  outline: "bg-surface text-text border border-border hover:border-accent/40",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5",
  md: "h-9 px-3.5 text-[13.5px] gap-2",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: Props) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-[10px] font-medium cursor-pointer transition-[transform,background-color,border-color,box-shadow,color] duration-150 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
        variants[variant],
        sizes[size],
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
