"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

/**
 * Accept button for the /join-org/[token] staff-invite screen. POSTs the
 * redeem endpoint, then drops the new teammate into /clients.
 */
export function JoinOrgAccept({ token }: { token: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/join-org/${encodeURIComponent(token)}`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string; message?: string }
          | null;
        const code = body?.error ?? "join_failed";
        setError(
          body?.message ??
            (code === "expired_invite" || code === "already_used"
              ? "This invite is no longer valid. Ask your admin for a fresh one."
              : code === "already_in_org"
                ? "You're already part of another organization."
                : "Something went wrong joining. Try again."),
        );
        setBusy(false);
        return;
      }
      router.replace("/clients");
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
            Join the team <ArrowRight className="w-3.5 h-3.5" />
          </>
        )}
      </Button>
      {error && (
        <p className="text-[12px] text-error text-center mt-2.5">{error}</p>
      )}
    </div>
  );
}
