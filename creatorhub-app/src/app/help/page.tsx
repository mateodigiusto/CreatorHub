"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import {
  ChevronDown,
  Mail,
  Users,
  Microscope,
  Wand2,
  CreditCard,
  Trash2,
  Shield,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/cn";

const SUPPORT_EMAIL = "support@creatorhub.app";

const QUICK_LINKS: Array<{
  href: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    href: "/clients",
    label: "Clients",
    description: "Manage creators or work with your manager.",
    icon: Users,
  },
  {
    href: "/content-dna",
    label: "Content DNA",
    description: "Reverse-engineer any post and get drafts in your voice.",
    icon: Microscope,
  },
  {
    href: "/sequence-studio",
    label: "Sequence Studio",
    description: "Turn assets into a finished sequence in one pass.",
    icon: Wand2,
  },
  {
    href: "/integrations",
    label: "Integrations",
    description: "Connect a platform to switch from sample data to real data.",
    icon: Bell,
  },
  {
    href: "/settings",
    label: "Plan & billing",
    description: "Change plan, manage subscription, restart setup.",
    icon: CreditCard,
  },
  {
    href: "/privacy",
    label: "Privacy & data",
    description: "What we collect, how we store it, how to delete it.",
    icon: Shield,
  },
];

const FAQS: Array<{ q: string; a: React.ReactNode }> = [
  {
    q: "How do client invites work?",
    a: (
      <>
        Open{" "}
        <Link className="text-accent" href="/clients">
          /clients
        </Link>{" "}
        and hit <strong>Add client</strong>. After the client is created you
        get a reusable join link (and a QR code) you can send to the creator
        — they sign in, request access, and you approve them from the Inbox.
      </>
    ),
  },
  {
    q: "How does the streak work?",
    a: (
      <>
        Strict rule: a day counts only if you complete <em>all</em> daily
        tasks assigned to you that day. A daily task created after 6am local
        time starts counting toward the streak the <strong>next</strong>{" "}
        day, so a manager can&apos;t accidentally break your streak by
        adding a task at 11pm.
      </>
    ),
  },
  {
    q: "Why are my Dashboard / Analytics numbers fake?",
    a: (
      <>
        While no platform is connected, the analytics surfaces show sample
        data so you can explore the UI. Once you connect a platform from{" "}
        <Link className="text-accent" href="/integrations">
          /integrations
        </Link>{" "}
        and the first sync completes, the real numbers replace them.
      </>
    ),
  },
  {
    q: "What&apos;s the limit on Content DNA analyses?",
    a: (
      <>
        Standard plan: 15 analyses per calendar month. Pro plan (or active
        trial on Pro): unlimited. The counter resets on the 1st of each
        month. If you hit the cap, the analyze button shows a friendly
        nudge to upgrade or wait for the reset.
      </>
    ),
  },
  {
    q: "How do I cancel or change my plan?",
    a: (
      <>
        Settings → Plan card → <strong>Manage subscription</strong> opens
        Stripe&apos;s Customer Portal. You can cancel, switch monthly ↔
        annual, or update your payment method there. Cancellations take
        effect at the end of your billing period — no pro-rated refunds for
        partial periods.
      </>
    ),
  },
  {
    q: "How do I delete my account?",
    a: (
      <>
        Settings → Danger zone → <strong>Delete account</strong>. We
        soft-delete immediately (you can&apos;t sign in) and hard-delete all
        data within 30 days. Audit logs are anonymized at hard-delete and
        retained for 12 months for security and dispute resolution. You can
        track deletion progress at{" "}
        <Link className="text-accent" href="/data-deletion-status">
          /data-deletion-status
        </Link>
        .
      </>
    ),
  },
  {
    q: "Why doesn&apos;t the email I expected show up?",
    a: (
      <>
        Email goes out for invite accepted, new message, and task assigned.
        Check Settings → Notifications to confirm <strong>Email me</strong>{" "}
        is on. If it is, check your spam folder for{" "}
        <code className="text-[12px] px-1 py-0.5 rounded bg-surface-2">
          @creatorhub.app
        </code>
        . If still nothing, our domain verification with Resend may not be
        complete — email{" "}
        <a className="text-accent" href={`mailto:${SUPPORT_EMAIL}`}>
          {SUPPORT_EMAIL}
        </a>{" "}
        and we&apos;ll resend manually.
      </>
    ),
  },
  {
    q: "Can I post to Instagram / TikTok / YouTube directly from CreatorHub?",
    a: (
      <>
        Not yet. Right now we focus on planning and analytics; publishing
        will land after Meta App Review for Instagram, then per-platform
        for the rest. For now, your Sequence Studio output is{" "}
        <strong>Download → publish manually</strong> in the platform app.
      </>
    ),
  },
  {
    q: "Found a bug. How do I report it?",
    a: (
      <>
        Email{" "}
        <a className="text-accent" href={`mailto:${SUPPORT_EMAIL}`}>
          {SUPPORT_EMAIL}
        </a>{" "}
        with a screenshot if you can. If the app showed an error reference
        ID (the &ldquo;Reference: …&rdquo; line), include it — we can pull
        the exact stack trace from Sentry.
      </>
    ),
  },
];

export default function HelpPage() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <>
      <PageHeader
        title="Help"
        description="Quick answers, links, and how to reach us."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {QUICK_LINKS.map((link) => (
          <Link key={link.href} href={link.href} className="lift block">
            <Card>
              <div className="w-10 h-10 rounded-xl bg-accent-soft text-accent grid place-items-center mb-4 border border-accent-border">
                <link.icon className="w-4 h-4" />
              </div>
              <CardHeader title={link.label} description={link.description} />
            </Card>
          </Link>
        ))}
      </div>

      <Card className="mb-6">
        <CardHeader
          title="Frequently asked"
          description="The 9 questions that come up most often. Click to expand."
        />
        <div className="border-t border-border -mx-5 mt-3">
          {FAQS.map((item, i) => {
            const isOpen = open === i;
            return (
              <div key={i} className="border-b border-border last:border-b-0">
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full flex items-center justify-between gap-4 px-5 py-3.5 text-left hover:bg-surface-2 transition-colors cursor-pointer"
                  aria-expanded={isOpen}
                >
                  <span className="text-[14px] font-medium text-text">
                    {item.q}
                  </span>
                  <ChevronDown
                    className={cn(
                      "w-4 h-4 text-muted shrink-0 transition-transform",
                      isOpen && "rotate-180",
                    )}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-4 text-[13.5px] text-text/85 leading-relaxed">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-accent-soft text-accent grid place-items-center border border-accent-border shrink-0">
            <Mail className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <h3 className="text-[15px] font-semibold text-text">
              Still stuck?
            </h3>
            <p className="text-[13.5px] text-muted mt-1 leading-relaxed">
              Email{" "}
              <a
                className="text-accent font-medium"
                href={`mailto:${SUPPORT_EMAIL}`}
              >
                {SUPPORT_EMAIL}
              </a>{" "}
              and we&apos;ll get back within one business day. Include any
              error reference IDs and the URL you were on — that lets us
              skip a round of &ldquo;what did you click?&rdquo;
            </p>
            <div className="mt-3 inline-flex items-center gap-2 text-[12px] text-muted">
              <Trash2 className="w-3.5 h-3.5" />
              <span>
                Need to delete your account?{" "}
                <Link className="text-accent" href="/settings">
                  Settings → Danger zone
                </Link>
                .
              </span>
            </div>
          </div>
        </div>
      </Card>
    </>
  );
}
