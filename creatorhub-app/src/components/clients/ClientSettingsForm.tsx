"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { Client, ClientStatus } from "@/lib/agency/types";

const INPUT_CLS =
  "w-full h-10 px-3 rounded-[10px] bg-surface border border-border text-[13.5px] text-text focus:outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/20";

const STATUSES: { value: ClientStatus; label: string; description: string }[] = [
  { value: "active", label: "Active", description: "Visible and operational." },
  { value: "paused", label: "Paused", description: "Hidden from default views; data preserved." },
  { value: "archived", label: "Archived", description: "Read-only. Doesn't count against plan limit." },
];

export function ClientSettingsForm({ client }: { client: Client }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [displayName, setDisplayName] = useState(client.displayName);
  const [slug, setSlug] = useState(client.slug);
  const [tagline, setTagline] = useState(client.tagline ?? "");
  const [instagramHandle, setInstagramHandle] = useState(client.instagramHandle ?? "");
  const [status, setStatus] = useState<ClientStatus>(client.status);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const cleanedSlug = slug.trim().toLowerCase();
    if (!displayName.trim()) {
      setError("Name is required.");
      return;
    }
    if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(cleanedSlug)) {
      setError("Slug can only contain lowercase letters, numbers, and dashes.");
      return;
    }

    startTransition(async () => {
      const res = await fetch(`/api/clients/${client.slug}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim(),
          slug: cleanedSlug,
          tagline: tagline.trim() || null,
          instagramHandle: instagramHandle.trim().replace(/^@/, "") || null,
          status,
        }),
      });

      if (res.status === 409) {
        setError("That slug is already in use.");
        return;
      }
      if (!res.ok) {
        setError("Couldn't save. Try again.");
        return;
      }
      setSuccess(true);
      /* Slug change → navigate to the new URL. */
      if (cleanedSlug !== client.slug) {
        router.push(`/clients/${cleanedSlug}/settings`);
        router.refresh();
      } else {
        router.refresh();
      }
    });
  }

  const slugChanged = slug.trim().toLowerCase() !== client.slug;

  return (
    <Card>
      <CardHeader
        title="Profile"
        description="Public details about the creator this workspace represents."
      />

      <form onSubmit={submit} className="space-y-4">
        <Field label="Name" required>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={80}
            className={INPUT_CLS}
            required
          />
        </Field>

        <Field
          label="Slug"
          hint={
            slugChanged
              ? `URL will change to /clients/${slug.trim().toLowerCase()}/…`
              : `creatorhub.app/clients/${client.slug}`
          }
        >
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
            maxLength={60}
            className={`${INPUT_CLS} font-mono text-[13px]`}
          />
        </Field>

        <Field label="Tagline" optional>
          <input
            type="text"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            maxLength={200}
            className={INPUT_CLS}
            placeholder="Fitness creator · 480k followers"
          />
        </Field>

        <Field label="Instagram handle" optional>
          <input
            type="text"
            value={instagramHandle}
            onChange={(e) => setInstagramHandle(e.target.value)}
            maxLength={60}
            className={INPUT_CLS}
            placeholder="acme.creator"
          />
        </Field>

        <Field label="Status">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {STATUSES.map((s) => (
              <label
                key={s.value}
                className={`block cursor-pointer rounded-[10px] border px-3 py-2.5 transition-colors ${
                  status === s.value
                    ? "border-accent bg-accent/[0.06]"
                    : "border-border hover:border-accent/40"
                }`}
              >
                <input
                  type="radio"
                  name="status"
                  value={s.value}
                  checked={status === s.value}
                  onChange={() => setStatus(s.value)}
                  className="sr-only"
                />
                <div className="text-[13px] font-medium text-text">{s.label}</div>
                <div className="text-[11.5px] text-muted mt-0.5 leading-tight">
                  {s.description}
                </div>
              </label>
            ))}
          </div>
        </Field>

        <div className="flex items-center justify-between gap-3 pt-2">
          <div className="text-[12px]">
            {error && <span style={{ color: "var(--error)" }}>{error}</span>}
            {success && !error && (
              <span style={{ color: "var(--success)" }}>Saved.</span>
            )}
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function Field({
  label,
  hint,
  required,
  optional,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[12.5px] text-text font-medium flex items-center gap-1.5">
        {label}
        {required && <span style={{ color: "var(--error)" }}>*</span>}
        {optional && <span className="text-muted font-normal">(optional)</span>}
      </span>
      <div className="mt-1.5">{children}</div>
      {hint && <span className="text-[11.5px] text-muted mt-1 block">{hint}</span>}
    </label>
  );
}
