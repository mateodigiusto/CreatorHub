/**
 * GET  /api/clients/[id]/links  — list saved links
 * POST /api/clients/[id]/links  — save a new link (any member)
 */

import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { log } from "@/lib/log";

type LinkRow = {
  id: string;
  added_by: string;
  url: string;
  title: string | null;
  description: string | null;
  created_at: string;
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await getSupabaseServer();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data } = await supabase
    .from("relationship_links")
    .select("id, added_by, url, title, description, created_at")
    .eq("relationship_id", id)
    .order("created_at", { ascending: false })
    .returns<LinkRow[]>();

  return NextResponse.json({
    links: (data ?? []).map((l) => ({
      id: l.id,
      addedBy: l.added_by,
      url: l.url,
      title: l.title,
      description: l.description,
      createdAt: l.created_at,
    })),
  });
}

type PostBody = {
  url?: string;
  title?: string;
  description?: string;
};

const URL_RE = /^https?:\/\/[^\s]{3,2000}$/i;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await getSupabaseServer();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: PostBody;
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const url = (body.url ?? "").trim();
  if (!URL_RE.test(url)) {
    return NextResponse.json({ error: "invalid_url" }, { status: 400 });
  }
  const title = (body.title ?? "").slice(0, 200) || null;
  const description = (body.description ?? "").slice(0, 1000) || null;

  const { data, error } = await supabase
    .from("relationship_links")
    .insert({
      relationship_id: id,
      added_by: userRes.user.id,
      url,
      title,
      description,
    } as never)
    .select("id, added_by, url, title, description, created_at")
    .returns<LinkRow[]>()
    .single();
  if (error || !data) {
    log.error("clients.link_insert_failed", error ?? new Error("no row"));
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }

  return NextResponse.json({
    link: {
      id: data.id,
      addedBy: data.added_by,
      url: data.url,
      title: data.title,
      description: data.description,
      createdAt: data.created_at,
    },
  });
}
