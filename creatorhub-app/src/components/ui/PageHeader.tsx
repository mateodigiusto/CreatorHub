import { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-6 mb-6">
      <div>
        <h1 className="text-[24px] font-semibold tracking-[-0.01em] text-text">
          {title}
        </h1>
        {description && (
          <p className="text-[14px] text-muted mt-1.5 max-w-[560px]">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
