"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { X, CheckCircle2 } from "lucide-react";
import { ClientInviteLinkInline } from "./ClientInviteLinkInline";

const INPUT_CLS =
  "w-full h-10 px-3 rounded-[10px] bg-surface border border-border text-[13.5px] text-text focus:outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/20";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function AddClientDialog({
  open,
  onClose,
  atLimit,
  limitMessage,
}: {
  open: boolean;
  onClose: () => void;
  atLimit: boolean;
  limitMessage?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [displayName, setDisplayName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [tagline, setTagline] = useState("");
  const [instagramHandle, setInstagramHandle] = useState("");
  const [error, setError] = useState<string | null>(null);
  /* Set once the client is created — flips the dialog to the "here's the
     invite link" success step instead of navigating straight away. */
  const [created, setCreated] = useState<{ slug: string; name: string } | null>(
    null,
  );

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset form on dialog open
      setDisplayName("");
      setSlug("");
      setSlugTouched(false);
      setTagline("");
      setInstagramHandle("");
      setError(null);
      setCreated(null);
    }
  }, [open]);

  function handleDisplayNameChange(v: string) {
    setDisplayName(v);
    if (!slugTouched) setSlug(slugify(v));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const finalSlug = (slug.trim() || slugify(displayName)).toLowerCase();
    if (!displayName.trim()) {
      setError("Name is required.");
      return;
    }
    if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(finalSlug)) {
      setError("Slug can only contain lowercase letters, numbers, and dashes.");
      return;
    }

    startTransition(async () => {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim(),
          slug: finalSlug,
          tagline: tagline.trim() || null,
          instagramHandle: instagramHandle.trim().replace(/^@/, "") || null,
        }),
      });

      if (res.status === 402) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        setError(body.message ?? "Plan limit reached.");
        return;
      }
      if (res.status === 409) {
        setError("That slug is already in use. Pick another.");
        return;
      }
      if (!res.ok) {
        setError("Couldn't create the client. Try again.");
        return;
      }

      const body = (await res.json()) as {
        client: { slug: string; displayName: string };
      };
      /* Stay in the dialog — show the invite link so the agency can send it
         immediately. The grid refreshes now; navigation happens on close. */
      setCreated({ slug: body.client.slug, name: body.client.displayName });
      router.refresh();
    });
  }

  function finish(goToClient: boolean) {
    const slug = created?.slug;
    onClose();
    if (goToClient && slug) router.push(`/clients/${slug}/overview`);
  }

  /* Success step — client created, show the invite link to send. */
  if (created) {
    return (
      <dialog
        ref={dialogRef}
        className="bg-transparent p-0 backdrop:bg-text/40 backdrop:backdrop-blur-sm"
        onClose={onClose}
        onClick={(e) => {
          if (e.target === dialogRef.current) finish(false);
        }}
      >
        <div
          className="bg-surface border border-border rounded-[14px] w-[min(460px,92vw)] p-6 shadow-[0_24px_60px_rgba(11,18,32,0.18)]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start gap-3 mb-4">
            <div className="w-9 h-9 rounded-full bg-accent-soft border border-accent-border grid place-items-center shrink-0">
              <CheckCircle2 className="w-4.5 h-4.5 text-accent" style={{ width: 18, height: 18 }} />
            </div>
            <div>
              <h2 className="text-[17px] font-semibold tracking-[-0.005em] text-text">
                {created.name} added
              </h2>
              <p className="text-[13px] text-muted mt-0.5">
                Send this link to the creator so they can log into their
                workspace.
              </p>
            </div>
          </div>

          <ClientInviteLinkInline slug={created.slug} />

          <div className="flex items-center justify-end gap-2 mt-5">
            <Button type="button" variant="ghost" onClick={() => finish(false)}>
              Done
            </Button>
            <Button type="button" onClick={() => finish(true)}>
              Go to client
            </Button>
          </div>
        </div>
      </dialog>
    );
  }

  return (
    <dialog
      ref={dialogRef}
      className="bg-transparent p-0 backdrop:bg-text/40 backdrop:backdrop-blur-sm"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
    >
      <form
        onSubmit={submit}
        className="bg-surface border border-border rounded-[14px] w-[min(440px,92vw)] p-6 shadow-[0_24px_60px_rgba(11,18,32,0.18)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-[17px] font-semibold tracking-[-0.005em] text-text">
              Add a client
            </h2>
            <p className="text-[13px] text-muted mt-1">
              Create a workspace for a creator you manage.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:text-text cursor-pointer p-1 -m-1"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {atLimit && (
          <div className="mb-4 rounded-[10px] border border-amber-500/30 bg-amber-500/[0.08] px-3 py-2 text-[12.5px]" style={{ color: "#B45309" }}>
            {limitMessage ?? "You've hit your plan's client limit. Upgrade to add more."}
          </div>
        )}

        <div className="space-y-3.5">
          <Field label="Name" required>
            <input
              type="text"
              value={displayName}
              onChange={(e) => handleDisplayNameChange(e.target.value)}
              placeholder="Acme Creator Co"
              maxLength={80}
              required
              autoFocus
              className={INPUT_CLS}
            />
          </Field>

          <Field
            label="Slug"
            hint={`creatorhub.app/clients/${slug || "your-client"}`}
          >
            <input
              type="text"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                setSlugTouched(true);
              }}
              placeholder="acme-creator-co"
              maxLength={60}
              className={`${INPUT_CLS} font-mono text-[13px]`}
            />
          </Field>

          <Field label="Tagline" optional>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="Fitness creator · 480k followers"
              maxLength={200}
              className={INPUT_CLS}
            />
          </Field>

          <Field label="Instagram handle" optional>
            <input
              type="text"
              value={instagramHandle}
              onChange={(e) => setInstagramHandle(e.target.value)}
              placeholder="acme.creator"
              maxLength={60}
              className={INPUT_CLS}
            />
          </Field>
        </div>

        {error && (
          <p className="mt-4 text-[12.5px]" style={{ color: "var(--error)" }}>
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-2 mt-5">
          <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending || atLimit}>
            {pending ? "Creating…" : "Create client"}
          </Button>
        </div>
      </form>
    </dialog>
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
