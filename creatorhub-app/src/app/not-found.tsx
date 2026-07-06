/**
 * 404 — fired by Next.js for any route the App Router can't resolve, and
 * by `notFound()` calls inside server components.
 *
 * Bypasses the AppShell intentionally so the user isn't fighting a
 * sidebar/topbar while they recover from a broken link.
 */

import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen relative z-10 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-[440px] rounded-[14px] border border-border bg-surface card-base p-7 text-center">
        <div className="w-12 h-12 mx-auto rounded-full bg-accent-soft border border-accent-border grid place-items-center text-accent">
          <Compass className="w-5 h-5" />
        </div>
        <h1 className="mt-4 text-[22px] font-semibold tracking-[-0.01em] text-text">
          Page not found
        </h1>
        <p className="mt-2 text-[13.5px] text-muted leading-relaxed">
          The page you tried to open doesn&apos;t exist or moved. Head back to
          your dashboard and we&apos;ll pick up where you left off.
        </p>
        <div className="mt-6 flex items-center justify-center gap-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center h-9 px-4 rounded-[10px] btn-primary text-white text-[13px] font-medium"
          >
            Back to dashboard
          </Link>
          <Link
            href="/help"
            className="inline-flex items-center justify-center h-9 px-4 rounded-[10px] border border-border text-text text-[13px] font-medium hover:bg-surface-2 transition-colors"
          >
            Get help
          </Link>
        </div>
      </div>
    </div>
  );
}
