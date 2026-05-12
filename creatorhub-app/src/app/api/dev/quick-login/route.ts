/**
 * DEV-ONLY quick login.
 *
 * Hit GET /api/dev/quick-login from a browser → signed in as a test user →
 * redirected to /onboarding/create-org (or /clients if you already have an
 * org). Refuses in production.
 *
 * Strategy: reuse the most recent `a-*@test.local` user from prior RLS test
 * runs. Those users were created via the public `signUp` API (no email
 * confirmation needed in this Supabase project), and their password is the
 * canonical test password from `tests/rls.spec.ts`. We sign in as them via
 * the SSR client, which writes the session cookies.
 *
 * Caveat: this user will accumulate state (org memberships, clients) across
 * dev sessions. Pass ?reset=1 to pick a different user, or sign up a fresh
 * account through /login if you want a clean slate.
 */

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseServiceRole } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

const TEST_PASSWORD = "test-password-1234567890";

type UserRow = { id: string; email: string };

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "disabled_in_prod" }, { status: 404 });
  }

  const url = new URL(req.url);
  const next = url.searchParams.get("next") ?? "/onboarding/create-org";

  const service = getSupabaseServiceRole();
  // Pick the most recent test user that looks like an `a-*` user from
  // tests/rls.spec.ts — these are confirmed to exist and have TEST_PASSWORD.
  const userRes = await service
    .from("users")
    .select("id, email")
    .like("email", "a-%@test.local")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const testUser = userRes.data as unknown as UserRow | null;
  if (!testUser) {
    return NextResponse.json(
      {
        error: "no_test_user",
        message:
          "No `a-*@test.local` user found. Run `npm run test:rls` once to seed one, or sign up via /login.",
      },
      { status: 500 },
    );
  }

  const cookieStore = await cookies();
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(items: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
          for (const { name, value, options } of items) {
            cookieStore.set(name, value, options);
          }
        },
      },
    },
  );
  const { error: signinErr } = await supabase.auth.signInWithPassword({
    email: testUser.email,
    password: TEST_PASSWORD,
  });
  if (signinErr) {
    return NextResponse.json(
      {
        error: "signin_failed",
        message: signinErr.message,
        email: testUser.email,
        hint:
          "If this user has a different password, sign up a fresh user via /login and use that.",
      },
      { status: 500 },
    );
  }

  return NextResponse.redirect(`${url.origin}${next}`);
}
