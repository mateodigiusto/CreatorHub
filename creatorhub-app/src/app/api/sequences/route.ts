/**
 * POST /api/sequences  — persist a generated sequence to DB.
 * GET  /api/sequences  — list the user's saved sequences (newest first).
 *
 * RLS on `sequences` enforces self-CRUD (`user_id = auth.uid()`), so we use
 * the supabase server client and rely on policies for the security boundary.
 */

import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { log } from "@/lib/log";

type SaveBody = {
  title: string;
  goal?: string;
  contentStyle?: string;
  brandTone?: string;
  persona?: string;
  brief?: string;
  slides: unknown[];
  status?: "draft" | "review" | "scheduled" | "published";
  scheduledAt?: string;
  accentColor?: string;
  decorations?: string[];
};

type SequenceRow = {
  id: string;
  title: string;
  status: string;
  goal: string | null;
  content_style: string | null;
  brief: string | null;
  slides: unknown[];
  scheduled_at: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function POST(req: NextRequest) {
  const supabase = await getSupabaseServer();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: SaveBody;
  try {
    body = (await req.json()) as SaveBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body.title || !Array.isArray(body.slides)) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const insertRow = {
    user_id: userRes.user.id,
    title: body.title.slice(0, 200),
    goal: body.goal ?? null,
    content_style: body.contentStyle ?? null,
    brand_tone: body.brandTone ?? null,
    persona: body.persona ?? null,
    brief: body.brief ?? null,
    slides: body.slides,
    status: body.status ?? "draft",
    scheduled_at: body.scheduledAt ?? null,
    accent_color: body.accentColor ?? null,
    decorations: body.decorations ?? [],
  };

  const { data, error } = await supabase
    .from("sequences")
    /* `as never` — supabase-js 2.45 vs PostgrestVersion 14.5 narrowing. */
    .insert(insertRow as never)
    .select("id")
    .returns<Array<{ id: string }>>()
    .single();

  if (error || !data) {
    log.error("sequences.insert_failed", error ?? new Error("no row returned"));
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }

  return NextResponse.json({ id: data.id, ok: true });
}

export async function GET() {
  const supabase = await getSupabaseServer();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) {
    return NextResponse.json({ sequences: [] }, { status: 200 });
  }

  const { data: rows } = await supabase
    .from("sequences")
    .select(
      "id, title, status, goal, content_style, brief, slides, scheduled_at, published_at, created_at, updated_at",
    )
    .order("created_at", { ascending: false })
    .returns<SequenceRow[]>();

  return NextResponse.json({ sequences: rows ?? [] });
}
