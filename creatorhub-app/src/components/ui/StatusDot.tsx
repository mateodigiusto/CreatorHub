import { cn } from "@/lib/cn";

type Tone = "accent" | "teal" | "amber" | "muted" | "cyan";

const tones: Record<Tone, string> = {
  accent: "bg-accent",
  teal: "bg-accent", // legacy alias — same as accent
  amber: "bg-amber-500",
  muted: "bg-muted/50",
  cyan: "bg-cyan-soft",
};

export function StatusDot({
  tone = "accent",
  pulse = true,
  size = 6,
  className,
}: {
  tone?: Tone;
  pulse?: boolean;
  size?: number;
  className?: string;
}) {
  const shouldPulse = pulse && (tone === "accent" || tone === "teal");
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block rounded-full shrink-0",
        tones[tone],
        shouldPulse && "dot-pulse",
        className
      )}
      style={{ width: size, height: size }}
    />
  );
}
