/**
 * Resend wrapper. Single send-point for every transactional email the app
 * sends. Gated on RESEND_API_KEY + EMAIL_FROM — when either is unset, this
 * is a no-op (returns `{ sent: false, reason: 'unconfigured' }`) so the
 * deploy doesn't break before you finish DNS verification at resend.com.
 *
 * The Resend SDK swallows network failures into a structured `error` field
 * on the response. We treat any error as a non-fatal `{ sent: false }` and
 * let the caller decide whether to log or retry — emails are best-effort
 * for the in-app notification flow (the bell still fires regardless).
 */

import { Resend } from "resend";
import { log } from "@/lib/log";

export type SendEmailArgs = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type SendResult =
  | { sent: true; id: string }
  | { sent: false; reason: string };

let cached: Resend | null = null;
function client(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!cached) cached = new Resend(process.env.RESEND_API_KEY);
  return cached;
}

export async function sendEmail(args: SendEmailArgs): Promise<SendResult> {
  const c = client();
  const from = process.env.EMAIL_FROM;
  if (!c || !from) {
    return { sent: false, reason: "unconfigured" };
  }
  try {
    const res = await c.emails.send({
      from,
      to: [args.to],
      subject: args.subject,
      html: args.html,
      text: args.text,
    });
    if (res.error) {
      log.warn("email.send_failed", {
        to: args.to,
        msg: res.error.message,
        name: res.error.name,
      });
      return { sent: false, reason: res.error.name ?? "send_failed" };
    }
    return { sent: true, id: res.data?.id ?? "unknown" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    log.warn("email.send_threw", { to: args.to, msg });
    return { sent: false, reason: "exception" };
  }
}
