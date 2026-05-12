/**
 * GET /api/portfolio/[slug]/export-pdf
 *
 * Public PDF export of a published portfolio. Same RLS gate as
 * GET /api/portfolio/[slug] — anon read allowed when is_public=true.
 *
 * Filename: CreatorHub_Portfolio_<slug>.pdf
 */

import { type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { log } from "@/lib/log";

type RouteContext = { params: Promise<{ slug: string }> };

type PortfolioRow = {
  slug: string;
  bio: string | null;
  specialties: string[];
  platforms: string[];
  years_experience: number | null;
  contact_email: string | null;
  contact_links: Record<string, string>;
  work_samples: Array<{
    video_url?: string;
    description?: string;
    results?: string;
    thumbnail_url?: string;
  }>;
  niche_tags: string[];
  testimonials: Array<{
    quote?: string;
    attribution?: string;
    link?: string;
  }>;
  published_at: string | null;
};

let anonClient: ReturnType<typeof createClient<Database>> | null = null;
function getAnonClient(): ReturnType<typeof createClient<Database>> {
  if (anonClient) return anonClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("supabase_anon_not_configured");
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
      "slug, bio, specialties, platforms, years_experience, contact_email, contact_links, work_samples, niche_tags, testimonials, published_at",
    )
    .eq("slug", normalized)
    .eq("is_public", true)
    .maybeSingle();

  if (error || !data) {
    return jsonError("not_found", 404);
  }
  const portfolio = data as PortfolioRow;

  const [{ renderToBuffer }, { PortfolioPdf }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("@/lib/pdf/portfolio-pdf"),
  ]);

  let buffer: Buffer;
  try {
    buffer = await renderToBuffer(
      PortfolioPdf({
        portfolio: {
          slug: portfolio.slug,
          bio: portfolio.bio,
          specialties: portfolio.specialties ?? [],
          platforms: portfolio.platforms ?? [],
          yearsExperience: portfolio.years_experience,
          contactEmail: portfolio.contact_email,
          contactLinks: portfolio.contact_links ?? {},
          workSamples: Array.isArray(portfolio.work_samples) ? portfolio.work_samples : [],
          nicheTags: portfolio.niche_tags ?? [],
          testimonials: Array.isArray(portfolio.testimonials) ? portfolio.testimonials : [],
          publishedAt: portfolio.published_at,
        },
      }),
    );
  } catch (err) {
    log.error("portfolio.export_pdf.render_failed", err);
    return jsonError("render_failed", 500);
  }

  const filename = `CreatorHub_Portfolio_${normalized}.pdf`;

  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${filename}"`,
      "content-length": String(buffer.length),
      /* Public artifact — short cache OK. */
      "cache-control": "public, max-age=300",
    },
  });
}

function jsonError(error: string, status: number): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { "content-type": "application/json" },
  });
}
