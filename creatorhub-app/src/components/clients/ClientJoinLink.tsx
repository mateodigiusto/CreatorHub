"use client";

import { useEffect, useState, useTransition } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Copy, Check, RefreshCw, QrCode, Loader2 } from "lucide-react";

type InviteResponse = {
  token: string;
  joinUrl: string;
  accessRole: "client_owner" | "team_assigned";
  createdAt: string;
};

/**
 * Agency-facing join-link panel for a client's Settings tab. Shows the
 * shareable /join link + its QR code, with copy and rotate. The link is
 * created on first load (get-or-create) — rotating it invalidates any
 * copies already shared.
 */
export function ClientJoinLink({ slug }: { slug: string }) {
  const [invite, setInvite] = useState<InviteResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [rotating, startRotate] = useTransition();

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount with cancel flag
    setLoading(true);
    fetch(`/api/clients/${slug}/invite`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((body: InviteResponse) => {
        if (!cancelled) setInvite(body);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load the join link.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  function copy() {
    if (!invite) return;
    void navigator.clipboard.writeText(invite.joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  function rotate() {
    startRotate(async () => {
      setError(null);
      try {
        const res = await fetch(`/api/clients/${slug}/invite`, {
          method: "POST",
        });
        if (!res.ok) throw new Error(String(res.status));
        setInvite((await res.json()) as InviteResponse);
      } catch {
        setError("Couldn't rotate the link. Try again.");
      }
    });
  }

  return (
    <Card>
      <CardHeader
        title="Join link"
        description="Share this link (or its QR code) with the creator and their team. They sign in and request access to this workspace."
        action={
          invite && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowQr((v) => !v)}
            >
              <QrCode className="w-3.5 h-3.5" />
              {showQr ? "Hide QR" : "Show QR"}
            </Button>
          )
        }
      />

      {loading && (
        <div className="flex items-center gap-2 text-[13px] text-muted py-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading join link…
        </div>
      )}

      {error && !loading && (
        <p className="text-[12.5px] text-error py-1">{error}</p>
      )}

      {invite && !loading && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={invite.joinUrl}
              onFocus={(e) => e.currentTarget.select()}
              className="flex-1 h-10 px-3 rounded-[10px] bg-surface-2 border border-border text-[12.5px] text-text font-mono focus:outline-none focus:border-accent/40"
            />
            <Button size="sm" variant="ghost" onClick={copy}>
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-success" /> Copied
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" /> Copy
                </>
              )}
            </Button>
          </div>

          {showQr && (
            <div className="flex justify-center py-3">
              <div className="bg-white p-3 rounded-[12px] border border-border">
                <QRCodeSVG value={invite.joinUrl} size={168} level="M" />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <p className="text-[11.5px] text-muted">
              Reusable — anyone with the link can request access until you
              rotate it.
            </p>
            <Button
              size="sm"
              variant="ghost"
              onClick={rotate}
              disabled={rotating}
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${rotating ? "animate-spin" : ""}`}
              />
              Rotate
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
