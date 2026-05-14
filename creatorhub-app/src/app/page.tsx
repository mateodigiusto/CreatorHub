import { redirect } from "next/navigation";
import { resolveUserContext, destinationFor } from "@/lib/auth/user-context";

/**
 * Root gate. Server-side routes the user by account track so a fresh
 * browser landing on `/` is sent to the right surface regardless of
 * localStorage:
 *
 *   anonymous          → /login
 *   needs onboarding   → /onboarding
 *   agency staff       → /clients
 *   solo account       → /dashboard
 *   active client      → /workspace
 *   pending client     → /pending
 */
export default async function Home() {
  const ctx = await resolveUserContext();
  redirect(destinationFor(ctx));
}
