"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, ArrowLeft, AlertCircle, Send } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAppState } from "@/lib/store";

const ERR_COPY: Record<string, string> = {
  invalid_email: "That doesn't look like a valid email.",
  self_invite: "You can't invite yourself.",
  too_many_pending:
    "You already have 5 pending invites. Wait for some to be accepted before sending more.",
  unauthorized: "Sign in first.",
};

export default function NewClientPage() {
  const router = useRouter();
  const { showToast } = useAppState();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const r = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim() }),
      });
      const json = (await r.json()) as {
        id?: string;
        kind?: "instant" | "pending";
        emailSent?: boolean;
        deduped?: boolean;
        error?: string;
      };
      if (!r.ok || !json.id) {
        setError(ERR_COPY[json.error ?? ""] ?? "Couldn't send invite. Try again.");
        setSubmitting(false);
        return;
      }
      if (json.deduped) {
        showToast("You already have an active relationship with this person");
      } else if (json.kind === "instant") {
        showToast("Added — they're already on CreatorHub");
      } else if (json.emailSent) {
        showToast("Invite sent");
      } else {
        showToast("Invite created (email send failed — share the link manually)");
      }
      router.push(`/clients/${json.id}`);
    } catch {
      setError("Network error. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Invite a creator"
        description="Send a magic-link invite by email. They'll join CreatorHub and the relationship activates automatically."
        actions={
          <Link
            href="/clients"
            className="inline-flex items-center gap-1 text-[12.5px] font-medium text-muted hover:text-text px-2 py-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to clients
          </Link>
        }
      />
      <Card className="max-w-xl">
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-[12.5px] font-semibold text-text mb-1.5"
            >
              Their email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="creator@example.com"
                disabled={submitting}
                autoComplete="email"
                required
                className="w-full pl-9 pr-3 py-2.5 rounded-[10px] border border-border bg-surface text-[14px] text-text placeholder:text-muted focus:outline-none focus:border-accent transition-colors disabled:opacity-60"
              />
            </div>
            <p className="text-[11.5px] text-muted mt-1.5">
              If they&apos;re already on CreatorHub the relationship activates instantly.
              Otherwise they&apos;ll get a Supabase magic-link email.
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-[10px] bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-[13px] text-red-700 dark:text-red-300">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Link href="/clients">
              <Button type="button" variant="ghost" disabled={submitting}>
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={submitting || email.trim().length === 0}>
              <Send className="w-3.5 h-3.5" />
              {submitting ? "Sending…" : "Send invite"}
            </Button>
          </div>
        </form>
      </Card>
    </>
  );
}
