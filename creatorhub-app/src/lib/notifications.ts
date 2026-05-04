/**
 * Generic notifications helper. Used by invites, messages, task assignments
 * — anywhere the app needs to drop a row into a user's notification feed
 * for the topbar bell to surface.
 *
 * Inserts go through the service role since the `notifications` table has
 * no INSERT policy for authenticated users (intentional — clients can only
 * read + mark-as-read their own rows).
 */

import { getSupabaseServiceRole } from "@/lib/supabase/server";
import type { NotificationKind } from "@/lib/clients/types";
import { log } from "@/lib/log";

export type NotifyArgs = {
  recipientId: string;
  kind: NotificationKind;
  body: string;
  targetType?: string;
  targetId?: string;
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
}
