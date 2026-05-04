/**
 * Email-invite helper using Supabase Auth's built-in
 * `auth.admin.inviteUserByEmail`. Supabase sends the magic-link email + lands
 * the recipient on a confirm page; the `on_auth_user_created` trigger mirrors
 * the auth row into `public.users`, and `promote_pending_invites` (defined in
 * migration 0018) flips any pending `creator_relationships` rows from
 * `pending → active` for that email.
 *
 * For invitees that ALREADY have a CreatorHub account, we skip the auth-invite
 * (Supabase rejects existing emails) and create the relationship as `active`
 * directly + push an in-app notification.
 */

import { randomBytes } from "node:crypto";
import { getSupabaseServiceRole } from "@/lib/supabase/server";
import { log } from "@/lib/log";

export type InviteOutcome =
  | { kind: "pending"; relationshipId: string; emailSent: boolean }
  | { kind: "instant"; relationshipId: string; creatorId: string }
  | { kind: "duplicate"; relationshipId: string }
  | { kind: "error"; reason: string };

export function generateInviteToken(): string {
  return randomBytes(24).toString("hex");
}

/**
 * Look up an existing CreatorHub user by email. Returns the user id or null.
 * Uses service-role to read across users (the lookup is purely for
 * routing — invitee identity isn't exposed back to the manager).
 */
export async function findUserByEmail(email: string): Promise<string | null> {
  const admin = getSupabaseServiceRole();
  const { data } = await admin
    .from("users")
    .select("id")
    .eq("email", email.toLowerCase())
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

/**
 * Send the Supabase Auth invite email. Returns true on success, false on
 * "user already registered" or any other error (caller decides what to do).
 */
export async function sendAuthInvite(
  email: string,
  redirectTo: string,
): Promise<boolean> {
  const admin = getSupabaseServiceRole();
  try {
    const { error } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo,
    });
    if (error) {
      log.warn("clients.invite.auth_invite_failed", { email, msg: error.message });
      return false;
    }
    return true;
  } catch (e) {
    log.warn("clients.invite.auth_invite_threw", {
      msg: e instanceof Error ? e.message : "unknown",
    });
    return false;
  }
}
