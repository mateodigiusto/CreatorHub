/**
 * Generic notifications helper. Used by invites, messages, task assignments
 * — anywhere the app needs to drop a row into a user's notification feed
 * for the topbar bell to surface.
 *
 * Inserts go through the service role since the `notifications` table has
 * no INSERT policy for authenticated users (intentional — clients can only
 * read + mark-as-read their own rows).
 *
 * Optionally fires an email via Resend (`args.email`) if the recipient has
 * `profiles.email_notifications=true` and `RESEND_API_KEY` + `EMAIL_FROM`
 * are set. Email is best-effort: a send failure is logged but doesn't fail
 * the triggering action (a missed email shouldn't block message delivery).
 */

import { getSupabaseServiceRole } from "@/lib/supabase/server";
import type { NotificationKind } from "@/lib/clients/types";
import { log } from "@/lib/log";
import { sendEmail } from "@/lib/email/send";

export type NotifyArgs = {
  recipientId: string;
  kind: NotificationKind;
  body: string;
  targetType?: string;
  targetId?: string;
  /* Pre-rendered email payload. Templates live in `lib/email/templates.ts`
     and are expected to be rendered at the call site (where the structured
     context is in scope). When omitted, only the in-app row fires. */
  email?: { subject: string; html: string; text: string };
};

type RecipientLookup = {
  email: string | null;
  email_notifications: boolean;
};

export async function notify(args: NotifyArgs): Promise<void> {
  const admin = getSupabaseServiceRole();
  const { error } = await admin.from("notifications").insert({
    recipient_id: args.recipientId,
    kind: args.kind,
    body: args.body,
    target_type: args.targetType ?? null,
    target_id: args.targetId ?? null,
  } as never);
  if (error) {
    /* Don't throw — notifications are best-effort. The triggering action
       (e.g. sending a message) shouldn't fail because the bell didn't ping. */
    log.warn("notifications.insert_failed", { msg: error.message });
  }

  if (!args.email) return;

  /* Look up the recipient's email + opt-in flag in a single round trip via
     two parallel queries. `users.email` is the source of truth (mirrored
     from auth.users by the on_auth_user_created trigger). */
  const [userRow, profileRow] = await Promise.all([
    admin
      .from("users")
      .select("email")
      .eq("id", args.recipientId)
      .returns<Array<{ email: string | null }>>()
      .maybeSingle(),
    admin
      .from("profiles")
      .select("email_notifications")
      .eq("user_id", args.recipientId)
      .returns<Array<{ email_notifications: boolean }>>()
      .maybeSingle(),
  ]);

  const lookup: RecipientLookup = {
    email: userRow.data?.email ?? null,
    email_notifications: profileRow.data?.email_notifications ?? true,
  };

  if (!lookup.email) {
    log.warn("notifications.email_skipped_no_address", {
      recipientId: args.recipientId,
    });
    return;
  }
  if (!lookup.email_notifications) return;

  await sendEmail({
    to: lookup.email,
    subject: args.email.subject,
    html: args.email.html,
    text: args.email.text,
  });
}
