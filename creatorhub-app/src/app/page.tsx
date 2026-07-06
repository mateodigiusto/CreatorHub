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
  /* Preview bypass: skip the auth-based routing and land straight on the
     dashboard when PREVIEW_NO_AUTH=1. */
  if (process.env.PREVIEW_NO_AUTH === "1") {
    redirect("/dashboard");
  }
  const ctx = await resolveUserContext();
  redirect(destinationFor(ctx));
}
