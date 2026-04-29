import { ReactNode, CSSProperties } from "react";
import { cn } from "@/lib/cn";

export function Card({
  children,
  className,
  style,
  padded = true,
  lift = false,
  liftStrong = false,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  padded?: boolean;
  lift?: boolean;
  liftStrong?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-surface border border-border rounded-[14px] card-base",
        padded && "p-5",
        (lift || liftStrong) && "lift",
        liftStrong && "lift-strong",
        onClick && "cursor-pointer",
        className
      )}
      style={style}
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
    <div
      className={cn(
        "flex items-start justify-between gap-4 mb-4",
        className
      )}
    >
      <div>
        <h3 className="text-[15px] font-semibold tracking-[-0.005em] text-text">
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
