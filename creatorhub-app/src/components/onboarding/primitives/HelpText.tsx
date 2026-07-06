"use client";

export function HelpText({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="text-center mb-8">
      {eyebrow && (
        <div
          className="text-[11px] uppercase font-semibold text-accent mb-2"
          style={{ letterSpacing: "0.10em" }}
        >
          {eyebrow}
        </div>
      )}
      <h1 className="text-[28px] font-semibold tracking-[-0.015em] text-text leading-tight">
        {title}
      </h1>
      {description && (
        <p className="text-[14px] text-muted mt-2 max-w-[560px] mx-auto leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
}
