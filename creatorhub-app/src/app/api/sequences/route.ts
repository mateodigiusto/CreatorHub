/**
 * POST /api/sequences  — persist a sequence (own or, when ?relationship_id is
 *                        set, an active client's).
 * GET  /api/sequences  — list the effective user's sequences (newest first).
 *
 * Without `?relationship_id`: RLS on `sequences` enforces self-CRUD via the
 * editor's session — fast path for the 95% case.
 *
 * With `?relationship_id`: the editor is "acting as" a client they manage.
 * resolveEffectiveUser() verifies membership using the editor's RLS-scoped
 * session, then we use the SERVICE-ROLE client to read/write as the client
 * (bypassing RLS — the membership check IS the security boundary).
 */

import { NextResponse, type NextRequest } from "next/server";
import {
  getSupabaseServer,
  getSupabaseServiceRole,
} from "@/lib/supabase/server";
import { resolveEffectiveUser } from "@/lib/clients/effective-user";
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
  const editorId = userRes.user.id;

  let body: SaveBody;
  try {
    body = (await req.json()) as SaveBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body.title || !Array.isArray(body.slides)) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const relationshipId = req.nextUrl.searchParams.get("relationship_id");
  const eff = await resolveEffectiveUser(supabase, editorId, relationshipId);
  if (!eff.ok) {
    return NextResponse.json({ error: eff.error }, { status: eff.status });
  }

  const insertRow = {
    user_id: eff.userId,
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

  /* Editor's own session writes via RLS; client-acting writes via
     service role after the membership check above. The two Supabase
     clients have different generic shapes so we branch instead of
     unifying — keeps TS happy without `any`. */
  let inserted: { id: string } | null = null;
  let writeError: unknown = null;
  if (eff.isClient) {
    const service = getSupabaseServiceRole();
    const r = await service
      .from("sequences")
      .insert(insertRow as never)
      .select("id")
      .returns<Array<{ id: string }>>()
      .single();
    inserted = r.data ?? null;
    writeError = r.error;
  } else {
    const r = await supabase
      .from("sequences")
      .insert(insertRow as never)
      .select("id")
      .returns<Array<{ id: string }>>()
      .single();
    inserted = r.data ?? null;
    writeError = r.error;
  }

  if (writeError || !inserted) {
    log.error("sequences.insert_failed", writeError ?? new Error("no row returned"));
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }

  return NextResponse.json({ id: inserted.id, ok: true });
}

export async function GET(req: NextRequest) {
  const supabase = await getSupabaseServer();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) {
    return NextResponse.json({ sequences: [] }, { status: 200 });
  }
  const editorId = userRes.user.id;

  const relationshipId = req.nextUrl.searchParams.get("relationship_id");
  const eff = await resolveEffectiveUser(supabase, editorId, relationshipId);
  if (!eff.ok) {
    return NextResponse.json({ error: eff.error }, { status: eff.status });
  }

  /* Same logic as POST: own-data via RLS, client-data via service role
     filtered by user_id. Branch instead of unifying for TS friendliness. */
  let rows: SequenceRow[] | null = null;
  if (eff.isClient) {
    const service = getSupabaseServiceRole();
    const r = await service
      .from("sequences")
      .select(
        "id, title, status, goal, content_style, brief, slides, scheduled_at, published_at, created_at, updated_at",
      )
      .eq("user_id", eff.userId)
      .order("created_at", { ascending: false })
      .returns<SequenceRow[]>();
    rows = r.data ?? [];
  } else {
    const r = await supabase
      .from("sequences")
      .select(
        "id, title, status, goal, content_style, brief, slides, scheduled_at, published_at, created_at, updated_at",
      )
      .order("created_at", { ascending: false })
      .returns<SequenceRow[]>();
    rows = r.data ?? [];
  }

  return NextResponse.json({ sequences: rows, actingAsClient: eff.isClient });
}
