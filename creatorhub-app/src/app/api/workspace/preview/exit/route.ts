/**
 * POST /api/workspace/preview/exit
 *
 * Clears the workspace-preview cookies and 303s back to the client's
 * settings page (or `/clients` if the slug cookie is missing).
 */

import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import {
  WORKSPACE_COOKIE,
  WORKSPACE_PREVIEW_COOKIE,
} from "@/lib/auth/require-workspace-access";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const store = await cookies();
  const slug = store.get(WORKSPACE_PREVIEW_COOKIE)?.value;
  const origin = new URL(req.url).origin;
  const dest = slug ? `/clients/${slug}/settings` : "/clients";
  const res = NextResponse.redirect(new URL(dest, origin), 303);
  res.cookies.delete(WORKSPACE_PREVIEW_COOKIE);
  res.cookies.delete(WORKSPACE_COOKIE);
  return res;
}
