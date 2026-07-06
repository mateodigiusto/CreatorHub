/**
 * One-off backfill — attach every existing `subscriptions` row to an
 * organization so 0037_subscriptions_finalize.sql can drop user_id.
 *
 * Run order (see docs/plans/agency-clients-phase-6-NOTES.md):
 *   1. apply 0036_stripe_org_migration.sql
 *   2. `npx tsx scripts/backfill-subscriptions-to-orgs.ts --dry-run`
 *   3. `npx tsx scripts/backfill-subscriptions-to-orgs.ts`
 *   4. apply 0037_subscriptions_finalize.sql
 *
 * Strategy per subscriptions row:
 *   - Find the user's `organization_memberships` (joined to organizations).
 *   - If the user admins exactly one org, attach the subscription there.
 *   - If the user admins more than one, log + skip (manual review).
 *   - If the user admins zero, create a personal org with a slug derived
 *     from the profile display name → email localpart → fallback.
 *   - Copy stripe_customer_id / stripe_subscription_id / current_period_end /
 *     subscription_status onto the org. Conflict with a different
 *     customer_id already on the org ⇒ log + skip.
 *   - Map the legacy plan to the new four-tier plan: pro→pro, standard→starter.
 *   - Set subscriptions.organization_id; leave user_id populated (0037
 *     drops it).
 *
 * Idempotent — re-running picks up only rows where organization_id IS NULL.
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from env.
 * Exits 0 on success, 2 if any rows failed.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type Subscription = {
  id: string;
  user_id: string | null;
  organization_id: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string;
  plan: string;
  cycle: string;
  status: string;
  current_period_end: string | null;
};

type Profile = {
  user_id: string;
  display_name: string | null;
};

type AuthUser = {
  id: string;
  email: string | null;
};

type Membership = {
  organization_id: string;
  is_admin: boolean;
  organizations: {
    id: string;
    slug: string;
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
  };
};

type Counts = {
  attached: number;
  createdOrg: number;
  skippedMulti: number;
  skippedConflict: number;
  errors: number;
};

const DRY_RUN = process.argv.includes("--dry-run");

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function mapPlan(legacy: string): "starter" | "pro" {
  if (legacy === "pro") return "pro";
  return "starter";
}

function logLine(level: "info" | "warn" | "error", msg: string, meta?: unknown): void {
  const payload = meta === undefined ? "" : ` ${JSON.stringify(meta)}`;
  console.log(`[${level}] ${msg}${payload}`);
}

async function pickOrgForUser(
  supa: SupabaseClient,
  userId: string,
  counts: Counts,
): Promise<{ orgId: string; orgRow: Membership["organizations"] } | null> {
  const { data: memberships, error } = await supa
    .from("organization_memberships")
    .select("organization_id, is_admin, organizations(id, slug, stripe_customer_id, stripe_subscription_id)")
    .eq("profile_id", userId)
    .returns<Membership[]>();
  if (error) {
    logLine("error", "memberships query failed", { userId, error: error.message });
    counts.errors += 1;
    return null;
  }

  const adminMemberships = (memberships ?? []).filter((m) => m.is_admin);
  if (adminMemberships.length === 1) {
    const m = adminMemberships[0];
    return { orgId: m.organization_id, orgRow: m.organizations };
  }
  if (adminMemberships.length > 1) {
    logLine("warn", "skipping user with multiple admin orgs", {
      userId,
      count: adminMemberships.length,
    });
    counts.skippedMulti += 1;
    return null;
  }

  /* Zero admin orgs — create a personal org. */
  const { data: profile } = await supa
    .from("profiles")
    .select("user_id, display_name")
    .eq("user_id", userId)
    .returns<Profile[]>()
    .maybeSingle();

  let email: string | null = null;
  try {
    const { data: userData } = await supa.auth.admin.getUserById(userId);
    email = (userData?.user as AuthUser | undefined)?.email ?? null;
  } catch (err) {
    logLine("warn", "auth.admin.getUserById failed", { userId, error: String(err) });
  }

  const base =
    (profile?.display_name && slugify(profile.display_name)) ||
    (email && slugify(email.split("@")[0])) ||
    `workspace-${userId.slice(0, 8)}`;

  let slug = base || `workspace-${userId.slice(0, 8)}`;
  /* Resolve slug collisions by suffixing -2, -3, … up to a sane cap. */
  for (let i = 0; i < 20; i++) {
    const { data: existing } = await supa
      .from("organizations")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!existing) break;
    slug = `${base || "workspace"}-${i + 2}`;
  }

  if (DRY_RUN) {
    logLine("info", "[dry-run] would create personal org", { userId, slug });
    counts.createdOrg += 1;
    /* Return a synthetic row so the caller can continue the dry-run. */
    return {
      orgId: `dry-run-${userId}`,
      orgRow: {
        id: `dry-run-${userId}`,
        slug,
        stripe_customer_id: null,
        stripe_subscription_id: null,
      },
    };
  }

  const name = profile?.display_name?.trim() || email || `Workspace ${userId.slice(0, 8)}`;
  const { data: createdOrg, error: createErr } = await supa
    .from("organizations")
    .insert({
      slug,
      name,
      created_by: userId,
      plan: "free",
      subscription_status: "trialing",
    })
    .select("id, slug, stripe_customer_id, stripe_subscription_id")
    .single();
  if (createErr || !createdOrg) {
    logLine("error", "create org failed", { userId, error: createErr?.message });
    counts.errors += 1;
    return null;
  }

  const { error: memberErr } = await supa.from("organization_memberships").insert({
    organization_id: createdOrg.id,
    profile_id: userId,
    role: "user",
    is_admin: true,
  });
  if (memberErr) {
    logLine("error", "create membership failed", { userId, orgId: createdOrg.id, error: memberErr.message });
    counts.errors += 1;
    return null;
  }

  counts.createdOrg += 1;
  return { orgId: createdOrg.id, orgRow: createdOrg };
}

async function attachSubscription(
  supa: SupabaseClient,
  sub: Subscription,
  counts: Counts,
): Promise<void> {
  if (!sub.user_id) {
    logLine("warn", "subscription has null user_id, skipping", { id: sub.id });
    counts.errors += 1;
    return;
  }

  const picked = await pickOrgForUser(supa, sub.user_id, counts);
  if (!picked) return;

  const { orgId, orgRow } = picked;

  if (
    orgRow.stripe_customer_id &&
    sub.stripe_customer_id &&
    orgRow.stripe_customer_id !== sub.stripe_customer_id
  ) {
    logLine("warn", "org has a different stripe_customer_id, skipping", {
      subscriptionId: sub.id,
      orgId,
      orgCustomer: orgRow.stripe_customer_id,
      subCustomer: sub.stripe_customer_id,
    });
    counts.skippedConflict += 1;
    return;
  }

  const orgPlan = mapPlan(sub.plan);

  if (DRY_RUN) {
    logLine("info", "[dry-run] would attach subscription", {
      subscriptionId: sub.id,
      orgId,
      plan: orgPlan,
      status: sub.status,
    });
    counts.attached += 1;
    return;
  }

  const { error: orgUpdateErr } = await supa
    .from("organizations")
    .update({
      plan: orgPlan,
      stripe_customer_id: sub.stripe_customer_id,
      stripe_subscription_id: sub.stripe_subscription_id,
      subscription_status: sub.status,
      current_period_end: sub.current_period_end,
    })
    .eq("id", orgId);
  if (orgUpdateErr) {
    logLine("error", "update organization failed", { subscriptionId: sub.id, orgId, error: orgUpdateErr.message });
    counts.errors += 1;
    return;
  }

  const { error: subUpdateErr } = await supa
    .from("subscriptions")
    .update({ organization_id: orgId })
    .eq("id", sub.id);
  if (subUpdateErr) {
    logLine("error", "update subscription failed", { subscriptionId: sub.id, error: subUpdateErr.message });
    counts.errors += 1;
    return;
  }

  counts.attached += 1;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    logLine("error", "missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(2);
  }

  logLine("info", `starting backfill${DRY_RUN ? " (dry-run)" : ""}`);

  const supa = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { data: rows, error } = await supa
    .from("subscriptions")
    .select(
      "id, user_id, organization_id, stripe_customer_id, stripe_subscription_id, plan, cycle, status, current_period_end",
    )
    .is("organization_id", null)
    .returns<Subscription[]>();
  if (error) {
    logLine("error", "fetch subscriptions failed", { error: error.message });
    process.exit(2);
  }

  const counts: Counts = {
    attached: 0,
    createdOrg: 0,
    skippedMulti: 0,
    skippedConflict: 0,
    errors: 0,
  };

  for (const sub of rows ?? []) {
    await attachSubscription(supa, sub, counts);
  }

  logLine("info", "backfill summary", {
    total: rows?.length ?? 0,
    ...counts,
    dry_run: DRY_RUN,
  });

  if (counts.errors > 0) process.exit(2);
}

main().catch((err) => {
  logLine("error", "backfill crashed", { error: String(err) });
  process.exit(2);
});
