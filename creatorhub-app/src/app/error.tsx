"use client";

/**
 * Global error boundary — catches unhandled errors in any client component
 * under `src/app/`. Renders a recovery UI and lets the user try again.
 *
 * The error itself is already captured by Sentry via @sentry/nextjs's
 * automatic instrumentation; we don't double-fire here. The `digest`
 * field is the Sentry-correlatable ID we surface to the user so they can
 * cite it in support.
 */

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCw } from "lucide-react";
import { log } from "@/lib/log";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    /* Log via the bound Sentry pipeline as a backup capture path. The
       Next runtime already auto-captures unhandled errors; this just
       gives us a structured event with our redacted-context envelope. */
    log.error("app.error_boundary", error, { digest: error.digest });
  }, [error]);

  return (
    <div className="min-h-screen relative z-10 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-[460px] rounded-[14px] border border-border bg-surface card-base p-7 text-center">
        <div className="w-12 h-12 mx-auto rounded-full bg-red-500/10 border border-red-500/30 grid place-items-center text-red-600 dark:text-red-400">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <h1 className="mt-4 text-[22px] font-semibold tracking-[-0.01em] text-text">
          Something went wrong
        </h1>
        <p className="mt-2 text-[13.5px] text-muted leading-relaxed">
          We hit an unexpected error. The team has been notified. You can
          try again, head back to your dashboard, or let us know if it
          keeps happening.
        </p>
        {error.digest && (
          <p className="mt-3 text-[11.5px] text-muted font-mono">
            Reference: {error.digest}
          </p>
        )}
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            onClick={() => reset()}
            className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-[10px] btn-primary text-white text-[13px] font-medium cursor-pointer"
          >
            <RotateCw className="w-3.5 h-3.5" />
            Try again
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center h-9 px-4 rounded-[10px] border border-border text-text text-[13px] font-medium hover:bg-surface-2 transition-colors"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
