import { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Card({
  children,
  className,
  padded = true,
  lift = false,
  liftStrong = false,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
  lift?: boolean;
  liftStrong?: boolean;
}) {
  return (
    <div
      className={cn(
        "bg-surface border border-border rounded-[14px] card-base",
        padded && "p-5",
        (lift || liftStrong) && "lift",
        liftStrong && "lift-strong",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4 mb-4", className)}>
      <div>
        <h3 className="text-[15px] font-semibold tracking-tight text-navy">
          {title}
        </h3>
        {description && (
          <p className="text-[13px] text-muted mt-0.5">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
