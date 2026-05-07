/**
 * GET   /api/portfolio  — own portfolio (creates a draft row on first call)
 * PATCH /api/portfolio  — update editable fields
 * POST  /api/portfolio  — body: { publish: boolean }, flips is_public
 *
 * Slug uniqueness validated at PATCH time (not just by the DB unique
 * index) so the user gets a clear error message instead of an opaque
 * Postgres conflict.
 *
 * Reserved slugs (login, settings, dashboard, etc.) are rejected here
 * rather than in SQL — easier to evolve the list without migrations.
 */

import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { withAudit } from "@/lib/audit";
import { schema } from "@/db";
import { getSupabaseServer, getSupabaseServiceRole } from "@/lib/supabase/server";
import { log } from "@/lib/log";
import type { Platform } from "@/lib/onboarding/types";

const RESERVED_SLUGS = new Set([
  "login", "logout", "signin", "signup", "signout",
  "dashboard", "settings", "onboarding", "help", "privacy", "terms",
  "api", "admin", "static", "assets", "public",
  "calendar", "content", "ideas", "library", "reports", "analytics",
  "integrations", "scripts", "clients", "creators", "outreach",
  "content-dna", "transcribe", "sequence-studio",
  "portfolio", "new", "edit",
]);

const SLUG_REGEX = /^[a-z0-9](?:[a-z0-9-]{1,48}[a-z0-9])?$/;

const VALID_PLATFORMS = new Set<Platform>([
  "instagram", "tiktok", "youtube", "linkedin", "x", "facebook",
]);

type PatchBody = {
  slug?: string;
  bio?: string | null;
  specialties?: string[];
  platforms?: Platform[];
  yearsExperience?: number | null;
  contactEmail?: string | null;
  contactLinks?: Record<string, string>;
  workSamples?: Array<{
    video_url?: string;
    description?: string;
    results?: string;
    thumbnail_url?: string;
  }>;
  nicheTags?: string[];
  clientLogos?: Array<{ name?: string; logo_url?: string }>;
  testimonials?: Array<{
    quote?: string;
    attribution?: string;
    link?: string;
    avatar_url?: string;
  }>;
};

type PublishBody = { publish: boolean };

export async function GET() {
  const supabase = await getSupabaseServer();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const userId = userRes.user.id;

  const { data, error } = await supabase
    .from("editor_portfolios")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    log.error("portfolio.get.failed", error);
    return NextResponse.json({ error: "load_failed" }, { status: 500 });
  }

  if (data) {
    return NextResponse.json({ portfolio: data });
  }

  /* No portfolio yet — create a draft with a derived slug. */
  const baseSlug = await deriveSlug(userId);
  let inserted: { id: string } | null = null;
  try {
    await withAudit(
      userId,
      {
        actor: "user",
        action: "portfolio.created",
        targetType: "editor_portfolio",
      },
      async (tx) => {
        const rows = await tx
          .insert(schema.editorPortfolios)
          .values({ userId, slug: baseSlug })
          .returning({ id: schema.editorPortfolios.id });
        inserted = rows[0];
      },
    );
  } catch (err) {
    log.error("portfolio.create.failed", err);
    return NextResponse.json({ error: "create_failed" }, { status: 500 });
  }
  if (!inserted) {
    return NextResponse.json({ error: "create_failed" }, { status: 500 });
  }

  const { data: created } = await supabase
    .from("editor_portfolios")
    .select("*")
    .eq("id", (inserted as { id: string }).id)
    .single();
  return NextResponse.json({ portfolio: created });
}

export async function PATCH(req: NextRequest) {
  const supabase = await getSupabaseServer();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const userId = userRes.user.id;

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const validation = validatePatch(body);
  if ("error" in validation) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }
  const patch = validation.patch;

  /* Slug change — verify uniqueness vs other users. Reserved-slug check
     already happened in validatePatch. We use the service-role client
     here because RLS would hide other users' unpublished portfolios,
     causing a unique-index violation later instead of a clean 409. */
  if (typeof patch.slug === "string") {
    if (RESERVED_SLUGS.has(patch.slug)) {
      return NextResponse.json({ error: "reserved_slug" }, { status: 400 });
    }
    const service = getSupabaseServiceRole();
    const { data: conflicts } = await service
      .from("editor_portfolios")
      .select("user_id")
      .eq("slug", patch.slug)
      .neq("user_id", userId)
      .limit(1);
    if ((conflicts?.length ?? 0) > 0) {
      return NextResponse.json({ error: "slug_taken" }, { status: 409 });
    }
  }

  try {
    await withAudit(
      userId,
      {
        actor: "user",
        action: "portfolio.updated",
        targetType: "editor_portfolio",
        targetId: userId,
        metadata: { fields: Object.keys(patch) },
      },
      async (tx) => {
        await tx
          .update(schema.editorPortfolios)
          .set(patch)
          .where(eq(schema.editorPortfolios.userId, userId));
      },
    );
  } catch (err) {
    log.error("portfolio.patch.failed", err);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  const { data } = await supabase
    .from("editor_portfolios")
    .select("*")
    .eq("user_id", userId)
    .single();
  return NextResponse.json({ portfolio: data });
}

export async function POST(req: NextRequest) {
  const supabase = await getSupabaseServer();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const userId = userRes.user.id;

  let body: PublishBody;
  try {
    body = (await req.json()) as PublishBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const wantPublish = !!body.publish;

  try {
    await withAudit(
      userId,
      {
        actor: "user",
        action: wantPublish ? "portfolio.published" : "portfolio.unpublished",
        targetType: "editor_portfolio",
        targetId: userId,
      },
      async (tx) => {
        await tx
          .update(schema.editorPortfolios)
          .set({
            isPublic: wantPublish,
            publishedAt: wantPublish ? new Date() : null,
          })
          .where(eq(schema.editorPortfolios.userId, userId));
      },
    );
  } catch (err) {
    log.error("portfolio.publish.failed", err);
    return NextResponse.json({ error: "publish_failed" }, { status: 500 });
  }

  const { data } = await supabase
    .from("editor_portfolios")
    .select("*")
    .eq("user_id", userId)
    .single();
  return NextResponse.json({ portfolio: data });
}

/* ─── helpers ────────────────────────────────────────────────────── */

function validatePatch(
  body: PatchBody,
): { patch: Record<string, unknown> } | { error: string } {
  const patch: Record<string, unknown> = {};

  if (body.slug !== undefined) {
    const v = String(body.slug).trim().toLowerCase();
    if (!SLUG_REGEX.test(v)) return { error: "invalid_slug" };
    patch.slug = v;
  }
  if (body.bio !== undefined) {
    patch.bio = body.bio === null ? null : String(body.bio).slice(0, 4000);
  }
  if (body.specialties !== undefined) {
    if (!Array.isArray(body.specialties)) return { error: "invalid_specialties" };
    patch.specialties = body.specialties
      .map((s) => String(s).trim())
      .filter(Boolean)
      .slice(0, 12);
  }
  if (body.platforms !== undefined) {
    if (!Array.isArray(body.platforms)) return { error: "invalid_platforms" };
    if (body.platforms.some((p) => !VALID_PLATFORMS.has(p))) {
      return { error: "invalid_platforms" };
    }
    patch.platforms = body.platforms;
  }
  if (body.yearsExperience !== undefined) {
    if (body.yearsExperience === null) {
      patch.yearsExperience = null;
    } else {
      const n = Number(body.yearsExperience);
      if (!Number.isInteger(n) || n < 0 || n > 80) {
        return { error: "invalid_years_experience" };
      }
      patch.yearsExperience = n;
    }
  }
  if (body.contactEmail !== undefined) {
    const v = body.contactEmail === null ? null : String(body.contactEmail).trim();
    if (v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
      return { error: "invalid_contact_email" };
    }
    patch.contactEmail = v && v.length > 0 ? v : null;
  }
  if (body.contactLinks !== undefined) {
    if (typeof body.contactLinks !== "object" || body.contactLinks === null) {
      return { error: "invalid_contact_links" };
    }
    patch.contactLinks = body.contactLinks;
  }
  if (body.workSamples !== undefined) {
    if (!Array.isArray(body.workSamples)) return { error: "invalid_work_samples" };
    patch.workSamples = body.workSamples
      .filter((s) => s && typeof s === "object")
      .slice(0, 30)
      .map((s) => ({
        video_url: String(s.video_url ?? "").slice(0, 2000),
        description: String(s.description ?? "").slice(0, 1000),
        results: String(s.results ?? "").slice(0, 1000),
        thumbnail_url: s.thumbnail_url ? String(s.thumbnail_url).slice(0, 2000) : undefined,
      }));
  }
  if (body.nicheTags !== undefined) {
    if (!Array.isArray(body.nicheTags)) return { error: "invalid_niche_tags" };
    patch.nicheTags = body.nicheTags
      .map((s) => String(s).trim())
      .filter(Boolean)
      .slice(0, 12);
  }
  if (body.clientLogos !== undefined) {
    if (!Array.isArray(body.clientLogos)) return { error: "invalid_client_logos" };
    patch.clientLogos = body.clientLogos
      .filter((l) => l && typeof l === "object")
      .slice(0, 30)
      .map((l) => ({
        name: String(l.name ?? "").slice(0, 100),
        logo_url: l.logo_url ? String(l.logo_url).slice(0, 2000) : undefined,
      }));
  }
  if (body.testimonials !== undefined) {
    if (!Array.isArray(body.testimonials)) return { error: "invalid_testimonials" };
    patch.testimonials = body.testimonials
      .filter((t) => t && typeof t === "object")
      .slice(0, 20)
      .map((t) => ({
        quote: String(t.quote ?? "").slice(0, 1000),
        attribution: String(t.attribution ?? "").slice(0, 200),
        link: t.link ? String(t.link).slice(0, 2000) : undefined,
        avatar_url: t.avatar_url ? String(t.avatar_url).slice(0, 2000) : undefined,
      }));
  }

  return { patch };
}

/** Derive a starting slug from the user's email (local part). Falls back
 *  to a random shortid if the local part conflicts with a reserved word. */
async function deriveSlug(userId: string): Promise<string> {
  const supabase = await getSupabaseServer();
  const { data: user } = await supabase
    .from("users")
    .select("email, handle, display_name")
    .eq("id", userId)
    .maybeSingle();
  type UserLite = { email: string | null; handle: string | null; display_name: string | null };
  const u = (user ?? null) as UserLite | null;
  const candidates = [u?.handle, u?.email?.split("@")[0], u?.display_name]
    .filter(Boolean)
    .map((s) => sanitizeSlug(String(s)));

  for (const c of candidates) {
    if (c && SLUG_REGEX.test(c) && !RESERVED_SLUGS.has(c)) return c;
  }
  /* Last resort — short random. */
  return `editor-${Math.random().toString(36).slice(2, 8)}`;
}

function sanitizeSlug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}
