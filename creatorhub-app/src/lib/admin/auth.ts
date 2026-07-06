/**
 * Admin gate. Reads `ADMIN_EMAILS` (comma-separated, case-insensitive).
 *
 * Behavior:
 *   - Set, comma list  → only listed emails are admin.
 *   - Unset / empty    → DEV ONLY: grant access to all signed-in users so
 *                         the admin tool is usable in dev / preview without
 *                         an env push. In production we refuse outright to
 *                         avoid an open-by-default failure mode.
 */

import { getSupabaseServer } from "@/lib/supabase/server";

export type AdminGate =
  | { ok: true; email: string }
  | { ok: false; status: 401 | 403; reason: string };

export async function requireAdmin(): Promise<AdminGate> {
  const supabase = await getSupabaseServer();
  const { data: userRes } = await supabase.auth.getUser();
  const email = userRes.user?.email?.toLowerCase() ?? null;
  if (!email) {
    return { ok: false, status: 401, reason: "unauthorized" };
  }

  const raw = process.env.ADMIN_EMAILS ?? "";
  const allowed = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  if (allowed.length === 0) {
    if (process.env.NODE_ENV === "production") {
      return { ok: false, status: 403, reason: "admin_disabled_in_prod" };
    }
    return { ok: true, email };
  }

  if (!allowed.includes(email)) {
    return { ok: false, status: 403, reason: "not_admin" };
  }
  return { ok: true, email };
}
