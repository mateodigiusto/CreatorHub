import { Sparkles } from "lucide-react";
import { Button } from "./Button";

export function AiCallout({
  title = "AI insight",
  body,
  cta,
}: {
  title?: string;
  body: string;
  cta?: string;
}) {
  return (
    <div
      className="relative rounded-[14px] p-5 overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, var(--accent-soft) 0%, rgba(99,102,241,0.05) 60%, rgba(96,165,250,0.04) 100%)",
        border: "1px solid var(--accent-border)",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.10), 0 1px 2px rgba(7,17,31,0.06)",
      }}
    >
      <div
        aria-hidden
        className="absolute -top-20 -right-20 w-64 h-64 rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, var(--accent-glow), transparent 70%)",
          filter: "blur(40px)",
        }}
      />
      <div className="relative">
        <div className="flex items-center gap-2 mb-2.5">
          <div className="w-7 h-7 rounded-lg bg-accent/15 text-accent grid place-items-center border border-accent/20">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <span className="text-[11.5px] font-semibold tracking-[0.06em] text-accent uppercase">
            {title}
          </span>
        </div>
        <p className="text-[14px] leading-relaxed text-text/90 max-w-3xl">
          {body}
        </p>
        {cta && (
          <div className="mt-4">
            <Button size="sm" variant="primary">
              {cta}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
