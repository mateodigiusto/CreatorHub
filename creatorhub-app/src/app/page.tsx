import { redirect } from "next/navigation";

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
  /* Login is disabled — every visitor lands straight on the dashboard. */
  redirect("/dashboard");
}
