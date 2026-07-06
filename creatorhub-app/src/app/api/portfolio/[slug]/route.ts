/**
 * GET /api/portfolio/[slug]
 *
 * Public read of a published portfolio. RLS allows anon when is_public=true,
 * so we hit the anon-key supabase client and let the policy do the gating.
 *
 * 404 covers both "no such slug" and "slug exists but not published" so we
 * don't leak portfolio existence to drive-by lookups.
 */

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type RouteContext = { params: Promise<{ slug: string }> };

let anonClient: ReturnType<typeof createClient<Database>> | null = null;

function getAnonClient(): ReturnType<typeof createClient<Database>> {
  if (anonClient) return anonClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("supabase_anon_not_configured");
  }
  anonClient = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return anonClient;
}

export async function GET(_req: NextRequest, ctx: RouteContext) {
  const { slug } = await ctx.params;
  const normalized = slug.toLowerCase();

  const supabase = getAnonClient();
  const { data, error } = await supabase
    .from("editor_portfolios")
    .select(
      "slug, bio, specialties, platforms, years_experience, contact_email, contact_links, work_samples, niche_tags, client_logos, testimonials, published_at, user_id",
    )
    .eq("slug", normalized)
    .eq("is_public", true)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  /* Pull the editor's display name + handle for the hero. Public read
     against `users` is restricted; for now we return what's in the
     portfolio + omit personal identity (deferring to user choice via
     contactLinks / contactEmail). */
  return NextResponse.json({ portfolio: data });
}
