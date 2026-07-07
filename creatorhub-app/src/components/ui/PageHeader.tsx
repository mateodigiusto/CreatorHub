import { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 sm:gap-6 mb-6">
      <div className="min-w-0">
        <h1 className="text-[21px] sm:text-[24px] font-semibold tracking-[-0.01em] text-text">
          {title}
        </h1>
        {description && (
          <p className="text-[13.5px] sm:text-[14px] text-muted mt-1.5 max-w-[560px]">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0 flex-wrap">{actions}</div>
      )}
    </div>
  );
}
