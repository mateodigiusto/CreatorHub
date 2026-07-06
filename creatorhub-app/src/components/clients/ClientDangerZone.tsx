"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { AlertTriangle } from "lucide-react";
import type { Client } from "@/lib/agency/types";

export function ClientDangerZone({
  client,
  canDelete,
}: {
  client: Client;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const expected = client.slug;
  const ready = confirmText === expected;

  function del() {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/clients/${client.slug}`, { method: "DELETE" });
      if (!res.ok) {
        setError("Couldn't delete. Try again.");
        return;
      }
      router.push("/clients");
      router.refresh();
    });
  }

  return (
    <Card
      className="border-[color:rgba(239,68,68,0.25)] bg-[color:rgba(239,68,68,0.03)]"
    >
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" style={{ color: "var(--error)" }} />
            Danger zone
          </span>
        }
        description="Deleting a client removes all its data permanently — brand profile, pipeline, content, comments, metrics."
      />

      {!canDelete ? (
        <p className="text-[13px] text-muted">
          Only org admins can delete a client. Ask an admin to handle this.
        </p>
      ) : (
        <div className="space-y-3">
          <p className="text-[13px] text-text">
            Type{" "}
            <code className="px-1 py-0.5 rounded bg-surface-2 text-[12px] font-mono">
              {expected}
            </code>{" "}
            to confirm.
          </p>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={expected}
            className="w-full h-10 px-3 rounded-[10px] bg-surface border border-border text-[13.5px] text-text focus:outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/20 font-mono"
          />
          {error && (
            <p className="text-[12.5px]" style={{ color: "var(--error)" }}>
              {error}
            </p>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={del}
            disabled={!ready || pending}
            className="border-[color:rgba(239,68,68,0.4)] text-[color:var(--error)] hover:border-[color:rgba(239,68,68,0.6)]"
          >
            {pending ? "Deleting…" : "Delete client permanently"}
          </Button>
        </div>
      )}
    </Card>
  );
}
