/**
 * Sign-out endpoint — POST so it can't be triggered by a stray GET (e.g.
 * a prefetch hovering on a link).
 *
 * Clears the Supabase session cookies and redirects to /login.
 */

import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { log } from "@/lib/log";

export async function POST(req: NextRequest) {
  const supabase = await getSupabaseServer();
  const { error } = await supabase.auth.signOut();
  if (error) {
    log.warn("auth.sign_out_error", { name: error.name });
  }
  return NextResponse.redirect(new URL("/login", req.url), { status: 303 });
}
