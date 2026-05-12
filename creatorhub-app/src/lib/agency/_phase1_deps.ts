/**
 * Phase 6 — Stub for Phase 1's auth/session module.
 *
 * The real implementation lives at `src/lib/auth/session.ts` and is owned
 * by Phase 1. It hadn't been committed when Phase 6 began — meanwhile
 * Phases 2 / 3 / 5 already import from this path, so Phase 6 follows the
 * established convention.
 *
 * This file exists only to keep Phase 6 compiling. Every call into a stub
 * function will `redirect('/login')` at runtime, ensuring the code is
 * never reached in production before Phase 1's real session helpers ship.
 *
 * CUTOVER: when Phase 1 lands `src/lib/auth/session.ts` with real
 * `getSession`, `requireOrg`, `requireOrgRole`, `requireOrgAdmin`, delete
 * this file and rewrite imports to `@/lib/auth/session`. Phase 2 and 3
 * own the same rewrite for their own consumers.
 */

import { redirect } from "next/navigation";

export type OrgRole = "user" | "editor" | "director";
export type Plan = "free" | "starter" | "pro" | "scale";
export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete"
  | "incomplete_expired"
  | "paused";

export type AgencySession = {
  userId: string;
  email: string;
  organization: {
    id: string;
    slug: string;
    name: string;
  };
  orgRole: OrgRole;
  isAdmin: boolean;
  plan: Plan;
  subscriptionStatus: SubscriptionStatus;
};

function notReady(fn: string): never {
  redirect("/login");
  // The throw below is unreachable at runtime — redirect() never returns —
  // but it keeps the function type as `never` for callers that don't know
  // about Next's redirect throwing behavior.
  throw new Error(`PHASE_1_NOT_READY: ${fn} called before src/lib/auth/session.ts shipped`);
}

export async function getSession(): Promise<AgencySession | null> {
  notReady("getSession");
}

export async function requireOrg(): Promise<AgencySession> {
  notReady("requireOrg");
}

export async function requireOrgRole(_min: OrgRole): Promise<AgencySession> {
  notReady("requireOrgRole");
}

export async function requireOrgAdmin(): Promise<AgencySession> {
  notReady("requireOrgAdmin");
}
