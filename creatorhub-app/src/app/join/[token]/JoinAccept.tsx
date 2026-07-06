"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

/**
 * Accept button for the /join/[token] screen. POSTs the redeem endpoint,
 * then routes by the returned membership status:
 *   active  → straight into the workspace
 *   pending → the waiting-for-approval holding screen
 */
export function JoinAccept({
  token,
  approvalRequired,
}: {
  token: string;
  approvalRequired: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/join/${encodeURIComponent(token)}`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        const code = body?.error ?? "join_failed";
        setError(
          code === "revoked_invite" || code === "expired_invite"
            ? "This invite link is no longer valid. Ask the agency for a new one."
            : code === "invalid_invite"
              ? "We couldn't find that invite."
              : "Something went wrong joining. Try again.",
        );
        setBusy(false);
        return;
      }
      const body = (await res.json()) as { status: "pending" | "active" };
      router.replace(body.status === "active" ? "/workspace" : "/pending");
    } catch {
      setError("Network error — check your connection and try again.");
      setBusy(false);
    }
  }

  return (
    <div className="mt-6">
      <Button size="md" onClick={accept} disabled={busy} className="w-full">
        {busy ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Joining…
          </>
        ) : (
          <>
            Accept &amp; continue <ArrowRight className="w-3.5 h-3.5" />
          </>
        )}
      </Button>
      {approvalRequired && !error && (
        <p className="text-[11.5px] text-muted text-center mt-2.5">
          The agency reviews new members — you&apos;ll get in as soon as
          they approve.
        </p>
      )}
      {error && (
        <p className="text-[12px] text-error text-center mt-2.5">{error}</p>
      )}
    </div>
  );
}
