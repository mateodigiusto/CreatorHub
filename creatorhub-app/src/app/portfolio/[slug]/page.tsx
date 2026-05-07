/**
 * Public portfolio page — server-rendered, no auth required.
 *
 * RLS policy `editor_portfolios_select` (v29 consolidated form) lets the
 * anon client read rows where is_public = true. We hit it server-side so
 * the HTML is crawlable + OG tags work for sharing.
 */

import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import type { Metadata } from "next";
import { ExternalLink, Mail, Globe, Sparkles } from "lucide-react";
import type { Database } from "@/lib/supabase/database.types";
import type { Platform } from "@/lib/onboarding/types";

type RouteContext = { params: Promise<{ slug: string }> };

type PublicPortfolio = {
  slug: string;
  bio: string | null;
  specialties: string[];
  platforms: Platform[];
  years_experience: number | null;
  contact_email: string | null;
  contact_links: Record<string, string>;
  work_samples: Array<{
    video_url: string;
    description: string;
    results: string;
    thumbnail_url?: string;
  }>;
  niche_tags: string[];
  client_logos: Array<{ name: string; logo_url?: string }>;
  testimonials: Array<{
    quote: string;
    attribution: string;
    link?: string;
    avatar_url?: string;
  }>;
  published_at: string | null;
};

async function loadPortfolio(slug: string): Promise<PublicPortfolio | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  const supabase = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data } = await supabase
    .from("editor_portfolios")
    .select(
      "slug, bio, specialties, platforms, years_experience, contact_email, contact_links, work_samples, niche_tags, client_logos, testimonials, published_at",
    )
    .eq("slug", slug.toLowerCase())
    .eq("is_public", true)
    .maybeSingle();
  return (data as PublicPortfolio | null) ?? null;
}

export async function generateMetadata({ params }: RouteContext): Promise<Metadata> {
  const { slug } = await params;
  const p = await loadPortfolio(slug);
  if (!p) return { title: "Portfolio not found" };
  const bio = p.bio ? p.bio.slice(0, 150) : `Editor portfolio · ${slug}`;
  return {
    title: `${slug} — Editor portfolio · CreatorHub`,
    description: bio,
    openGraph: {
      title: `${slug} — Editor portfolio`,
      description: bio,
      type: "profile",
    },
  };
}

export default async function PublicPortfolioPage({ params }: RouteContext) {
  const { slug } = await params;
  const portfolio = await loadPortfolio(slug);
  if (!portfolio) notFound();

  const hasContact =
    portfolio.contact_email || Object.keys(portfolio.contact_links).length > 0;

  return (
    <div className="min-h-screen bg-bg">
      {/* Top nav — minimal, just CreatorHub branding */}
      <header className="border-b border-border bg-surface/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-[760px] mx-auto px-5 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="text-[14px] font-semibold text-text tracking-tight">
            Creator<span className="text-accent">Hub</span>
          </Link>
          <a
            href="/onboarding"
            className="text-[12px] text-muted hover:text-text inline-flex items-center gap-1"
          >
            Build your own <Sparkles className="w-3 h-3" />
          </a>
        </div>
      </header>

      <main className="max-w-[760px] mx-auto px-5 sm:px-6 py-10 sm:py-14">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-1 text-[10.5px] uppercase font-semibold text-muted bg-surface-2 border border-border px-2 py-1 rounded-full tracking-wider">
            Editor portfolio
          </div>
          <h1 className="text-[36px] sm:text-[44px] font-semibold tracking-[-0.02em] text-text mt-4 leading-tight">
            {portfolio.bio
              ? portfolio.bio.split(/[\.!?]/)[0]
              : `${slug}`}
          </h1>
          {portfolio.bio && (
            <p className="text-[15px] sm:text-[16px] text-muted mt-4 leading-relaxed max-w-[560px] mx-auto whitespace-pre-wrap">
              {portfolio.bio.split(/[\.!?]/).slice(1).join(". ").trim()}
            </p>
          )}

          {(portfolio.years_experience !== null || portfolio.platforms.length > 0) && (
            <div className="mt-6 flex flex-wrap justify-center items-center gap-x-4 gap-y-2 text-[13px] text-muted">
              {portfolio.years_experience !== null && (
                <span>
                  <span className="text-text font-medium">{portfolio.years_experience}</span>{" "}
                  {portfolio.years_experience === 1 ? "year" : "years"} editing
                </span>
              )}
              {portfolio.platforms.length > 0 && (
                <span className="capitalize">
                  Edits for{" "}
                  <span className="text-text font-medium">
                    {portfolio.platforms.join(", ")}
                  </span>
                </span>
              )}
            </div>
          )}

          {hasContact && (
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {portfolio.contact_email && (
                <a
                  href={`mailto:${portfolio.contact_email}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-accent text-white text-[13px] font-medium hover:bg-accent-2 transition-colors"
                >
                  <Mail className="w-3.5 h-3.5" /> Hire me
                </a>
              )}
              {Object.entries(portfolio.contact_links).map(([k, v]) => (
                <a
                  key={k}
                  href={v}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-surface border border-border text-text text-[13px] font-medium hover:border-accent/30 transition-colors"
                >
                  <Globe className="w-3.5 h-3.5" /> {k}
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Specialties + niche tags */}
        {(portfolio.specialties.length > 0 || portfolio.niche_tags.length > 0) && (
          <section className="mb-12">
            {portfolio.specialties.length > 0 && (
              <div className="mb-4">
                <div className="text-[11px] uppercase font-semibold text-muted tracking-wider mb-2">
                  Specialties
                </div>
                <div className="flex flex-wrap gap-2">
                  {portfolio.specialties.map((s) => (
                    <span
                      key={s}
                      className="px-3 py-1.5 rounded-full bg-accent-soft border border-accent/20 text-[12.5px] text-accent font-medium"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {portfolio.niche_tags.length > 0 && (
              <div>
                <div className="text-[11px] uppercase font-semibold text-muted tracking-wider mb-2">
                  Worked in
                </div>
                <div className="flex flex-wrap gap-2">
                  {portfolio.niche_tags.map((t) => (
                    <span
                      key={t}
                      className="px-3 py-1.5 rounded-full bg-surface-2 border border-border text-[12.5px] text-text"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Work samples */}
        {portfolio.work_samples.length > 0 && (
          <section className="mb-12">
            <h2 className="text-[20px] font-semibold tracking-[-0.01em] text-text mb-4">
              Selected work
            </h2>
            <div className="space-y-3">
              {portfolio.work_samples.map((s, i) => (
                <a
                  key={i}
                  href={s.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block lift rounded-[14px] border border-border bg-surface card-base p-5 cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-[14.5px] font-semibold text-text leading-snug">
                        {s.description || "Untitled work"}
                      </div>
                      {s.results && (
                        <div className="text-[13px] text-muted mt-1.5 leading-relaxed">
                          {s.results}
                        </div>
                      )}
                    </div>
                    <ExternalLink className="w-4 h-4 text-muted shrink-0 mt-1" />
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Testimonials */}
        {portfolio.testimonials.length > 0 && (
          <section className="mb-12">
            <h2 className="text-[20px] font-semibold tracking-[-0.01em] text-text mb-4">
              What creators say
            </h2>
            <div className="space-y-3">
              {portfolio.testimonials.map((t, i) => (
                <blockquote
                  key={i}
                  className="border-l-2 border-accent/30 pl-4 py-2"
                >
                  <p className="text-[14px] text-text leading-relaxed italic">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <cite className="block text-[12.5px] text-muted mt-2 not-italic">
                    {t.link ? (
                      <a
                        href={t.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-text"
                      >
                        — {t.attribution}
                      </a>
                    ) : (
                      <>— {t.attribution}</>
                    )}
                  </cite>
                </blockquote>
              ))}
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-border text-center text-[11.5px] text-muted">
          Portfolio built with{" "}
          <Link href="/" className="text-accent hover:text-accent-2 font-medium">
            CreatorHub
          </Link>
          {portfolio.published_at && (
            <>
              {" · "}Updated{" "}
              {new Date(portfolio.published_at).toLocaleDateString("en-US", {
                month: "short",
                year: "numeric",
              })}
            </>
          )}
        </footer>
      </main>
    </div>
  );
}
