/**
 * /onboarding/create-org — caller lands here when authenticated but with no
 * organization membership. Takes an agency name → POSTs /api/organizations
 * → redirects to /clients on success.
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Building2 } from "lucide-react";

export default function CreateOrgPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const r = await fetch("/api/organizations", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!r.ok) {
        const body = (await r.json().catch(() => ({}))) as { error?: string };
        setError(body.error === "already_has_org" ? "You already have a workspace." : "Couldn't create the workspace. Try again.");
        setSubmitting(false);
        return;
      }
      router.push("/clients");
      router.refresh();
    } catch {
      setError("Network error. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-dvh grid place-items-center p-6 bg-bg">
      <div className="w-full max-w-[440px]">
        <Card className="p-7">
          <div className="flex items-center gap-3 mb-5">
            <div
              className="w-10 h-10 rounded-lg grid place-items-center"
              style={{
                background: "linear-gradient(180deg, #14315E 0%, #0B1F3A 100%)",
              }}
            >
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-[18px] font-semibold tracking-tight text-text">
                Name your workspace
              </h1>
              <p className="text-[13px] text-muted mt-0.5">
                You can change this later.
              </p>
            </div>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="org-name"
                className="block text-[12.5px] font-medium text-text-2 mb-1.5"
              >
                Agency or team name
              </label>
              <input
                id="org-name"
                type="text"
                autoFocus
                required
                maxLength={80}
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={submitting}
                placeholder="Acme Studio"
                className="w-full h-10 px-3 rounded-md bg-surface border border-border text-[14px] text-text placeholder:text-muted focus:outline-none focus:border-accent transition-colors disabled:opacity-60"
              />
            </div>

            {error ? (
              <p className="text-[12.5px] text-error">{error}</p>
            ) : null}

            <Button
              type="submit"
              disabled={submitting || !name.trim()}
              className="w-full justify-center"
            >
              {submitting ? "Creating…" : "Create workspace"}
            </Button>
          </form>

          <p className="text-[12px] text-muted mt-5 leading-relaxed">
            Your workspace starts on a 14-day Pro trial — all features
            unlocked. No card required. After the trial you can pick a plan
            from the Billing page.
          </p>
        </Card>
      </div>
    </main>
  );
}
