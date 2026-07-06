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
          "linear-gradient(135deg, rgba(11,31,58,0.06) 0%, rgba(20,49,94,0.04) 60%, rgba(27,79,212,0.05) 100%)",
        border: "1px solid rgba(11,31,58,0.18)",
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
          <div
            className="w-7 h-7 rounded-lg grid place-items-center text-white"
            style={{
              background: "linear-gradient(135deg, #14315E, #0B1F3A)",
              border: "1px solid rgba(11,31,58,0.40)",
            }}
          >
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <span
            className="text-[11.5px] font-semibold tracking-[0.06em] uppercase"
            style={{ color: "var(--accent)" }}
          >
            {title}
          </span>
        </div>
        <p className="text-[14px] leading-[1.55] text-text/90 max-w-[90%]">
          {body}
        </p>
        {cta && (
          <div className="mt-4">
            <Button size="sm">{cta}</Button>
          </div>
        )}
      </div>
    </div>
  );
}
