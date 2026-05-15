/**
 * Phase 3 dependency shim — re-exports adapted from the real Phase 1/2/6
 * implementations now that they've landed. Phase 3 route handlers + pages
 * import session/role/plan helpers from this file; after cutover this file
 * could be deleted and the consumers re-pointed, but keeping it works fine
 * as a thin wrapper.
 *
 * Shape adaptations:
 *  - getAgencySession() flattens session.organization → organizationId for
 *    Phase 3's callers (the rest of the AgencySession is identical).
 *  - requireClientAccess(slug) returns the narrower ResolvedClient shape
 *    Phase 3 expects instead of the {session, client} pair the real helper
 *    returns.
 *  - requireOrgRole takes an allow-list array (Phase 3 convention) rather
 *    than the rank-minimum that Phase 1's helper takes.
 */

import { NextResponse } from "next/server";
import {
  getSession,
  type AgencySession as RealAgencySession,
} from "@/lib/auth/session";
import { requireClientAccess as realRequireClientAccess } from "@/lib/auth/require-client-access";
import {
  assertPlanAllows as realAssertPlanAllows,
  PlanLimitError,
} from "@/lib/billing/limits";

// ─── Session ─────────────────────────────────────────────────────────

export type AgencySession = {
  userId: string;
  email: string | null;
  organizationId: string;
  orgRole: "user" | "editor" | "director";
  isOrgAdmin: boolean;
  plan: "free" | "starter" | "pro" | "scale";
  subscriptionStatus: RealAgencySession["subscriptionStatus"];
};

function flatten(s: RealAgencySession): AgencySession {
  return {
    userId: s.userId,
    email: s.email ?? null,
    organizationId: s.organization.id,
    orgRole: s.orgRole,
    isOrgAdmin: s.isAdmin,
    plan: s.plan,
    subscriptionStatus: s.subscriptionStatus,
  };
}

export async function getAgencySession(): Promise<AgencySession | null> {
  const s = await getSession();
  return s ? flatten(s) : null;
}

// ─── Client access ───────────────────────────────────────────────────

export type ResolvedClient = {
  id: string;
  slug: string;
  organizationId: string;
  displayName: string;
  isClientViewer: boolean;
};

export async function requireClientAccess(slug: string): Promise<ResolvedClient> {
  const { client } = await realRequireClientAccess(slug);
  return {
    id: client.id,
    slug: client.slug,
    organizationId: client.organizationId,
    displayName: client.displayName,
    isClientViewer: false,
  };
}

// ─── Role gates ──────────────────────────────────────────────────────

export type BaseRole = "user" | "editor" | "director";

export function requireOrgRole(session: AgencySession, allowed: BaseRole[]): void {
  if (!allowed.includes(session.orgRole)) {
    throw new HttpError(403, "forbidden");
  }
}

export function requireOrgAdmin(session: AgencySession): void {
  if (!session.isOrgAdmin) {
    throw new HttpError(403, "admin_required");
  }
}

// ─── Plan gates ──────────────────────────────────────────────────────

export type Capability = "addClient" | "aiAnalyzer" | "videoUpload";

const CAP_MAP: Record<Capability, "add_client" | "ai_analyzer" | "video_upload"> = {
  addClient: "add_client",
  aiAnalyzer: "ai_analyzer",
  videoUpload: "video_upload",
};

export async function assertPlanAllows(
  session: AgencySession,
  capability: Capability,
): Promise<void> {
  const kind = CAP_MAP[capability];
  if (kind === "add_client") {
    try {
      await realAssertPlanAllows(session.plan, {
        kind,
        organizationId: session.organizationId,
      });
    } catch (err) {
      if (err instanceof PlanLimitError) {
        throw new HttpError(402, err.code, { capability, message: err.message });
      }
      throw err;
    }
    return;
  }
  try {
    await realAssertPlanAllows(session.plan, { kind });
  } catch (err) {
    if (err instanceof PlanLimitError) {
      throw new HttpError(402, err.code, { capability, message: err.message });
    }
    throw err;
  }
}

// ─── Error helper ────────────────────────────────────────────────────

export class HttpError extends Error {
  status: number;
  code: string;
  detail?: Record<string, unknown>;
  constructor(status: number, code: string, detail?: Record<string, unknown>) {
    super(code);
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

export function httpErrorResponse(err: unknown): NextResponse {
  if (err instanceof HttpError) {
    return NextResponse.json(
      { error: err.code, ...(err.detail ?? {}) },
      { status: err.status },
    );
  }
  return NextResponse.json({ error: "internal_error" }, { status: 500 });
}
