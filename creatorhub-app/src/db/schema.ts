/**
 * Drizzle schema — TypeScript mirror of supabase/migrations/*.sql.
 *
 * Source of truth is the SQL migrations (they include RLS policies, triggers,
 * partial indexes, and all the bits Drizzle Kit doesn't generate). This file
 * exists so app code gets type-safe queries.
 *
 * Schema drift between this file and the migrations is caught by the
 * migration round-trip CI test (tests/migration-roundtrip.spec.ts).
 */

import {
  pgTable,
  pgEnum,
  uuid,
  text,
  timestamp,
  date,
  boolean,
  integer,
  numeric,
  jsonb,
  customType,
  index,
  uniqueIndex,
  primaryKey,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/* Drizzle ORM doesn't ship `bytea` or `inet` as first-class helpers — they
   are valid Postgres types but Drizzle expects you to define them via
   customType when you need them. */

const _bytea = customType<{ data: Buffer; default: false }>({
  dataType() {
    return "bytea";
  },
});

const _inet = customType<{ data: string; default: false }>({
  dataType() {
    return "inet";
  },
});

/* ─── Enums (mirror 0000_setup.sql) ─────────────────────────────────── */

export const platformEnum = pgEnum("platform_t", [
  "instagram", "tiktok", "youtube", "linkedin", "x", "facebook",
]);
export const integrationStatusEnum = pgEnum("integration_status_t", [
  "active", "expired", "revoked", "unsupported",
]);
export const postSourceEnum = pgEnum("post_source_t", ["imported", "native"]);
export const postLifecycleEnum = pgEnum("post_lifecycle_t", [
  "draft", "review", "scheduled", "publishing", "published", "failed", "analyzed",
]);
export const assetKindEnum = pgEnum("asset_kind_t", [
  "photo", "video", "screenshot", "testimonial", "proof",
]);
export const jobStatusEnum = pgEnum("job_status_t", [
  "queued", "running", "completed", "failed", "dead",
]);
export const jobKindEnum = pgEnum("job_kind_t", [
  "sync", "transcode", "publish", "refresh_token", "finalize_deletion", "cleanup",
  "content_dna_analyze",
]);

/* ─── users (mirror of auth.users + our app-side fields) ──────────── */

export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull().unique(),
  displayName: text("display_name"),
  handle: text("handle"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

/* ─── profiles ────────────────────────────────────────────────────── */

export const profiles = pgTable("profiles", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  displayName: text("display_name"),
  handle: text("handle"),
  avatarUrl: text("avatar_url"),
  creatorType: text("creator_type").notNull(),
  niche: text("niche").notNull(),
  primaryGoal: text("primary_goal").notNull(),
  secondaryGoals: text("secondary_goals").array().notNull().default(sql`array[]::text[]`),
  platforms: text("platforms").array().notNull().default(sql`array[]::text[]`),
  contentFormats: text("content_formats").array().notNull().default(sql`array[]::text[]`),
  frequency: text("frequency"),
  planningWorkflow: text("planning_workflow").array().notNull().default(sql`array[]::text[]`),
  biggestProblem: text("biggest_problem"),
  audienceWho: text("audience_who"),
  audienceWants: text("audience_wants"),
  audienceProblem: text("audience_problem"),
  selling: text("selling").array().notNull().default(sql`array[]::text[]`),
  offerName: text("offer_name"),
  ctaStyle: text("cta_style"),
  customCta: text("custom_cta"),
  brandTones: text("brand_tones").array().notNull().default(sql`array[]::text[]`),
  sequenceUses: text("sequence_uses").array().notNull().default(sql`array[]::text[]`),
  wantsNichePresets: boolean("wants_niche_presets").notNull().default(true),
  assetTypes: text("asset_types").array().notNull().default(sql`array[]::text[]`),
  reportsNeeds: text("reports_needs").array().notNull().default(sql`array[]::text[]`),
  team: text("team"),
  startMode: text("start_mode").notNull().default("demo"),
  timezone: text("timezone").notNull().default("UTC"),
  schemaVersion: integer("schema_version").notNull().default(1),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  emailNotifications: boolean("email_notifications").notNull().default(true),
  /* Onboarding v2 trial fields. Nullable until the user picks a plan in the
     paywall step; CHECK constraints in the migration enforce the enums. */
  trialPlan: text("trial_plan"),
  trialCycle: text("trial_cycle"),
  trialStartedAt: timestamp("trial_started_at", { withTimezone: true }),
  trialExpiresAt: timestamp("trial_expires_at", { withTimezone: true }),
  /* Stripe customer id — set on first /api/stripe/checkout-session call.
     Reused for subsequent checkouts + Customer Portal sessions. */
  stripeCustomerId: text("stripe_customer_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ─── subscriptions ──────────────────────────────────────────────── */

export const subscriptionStatusEnum = pgEnum("subscription_status_t", [
  "trialing",
  "active",
  "past_due",
  "canceled",
  "incomplete",
  "incomplete_expired",
  "unpaid",
  "paused",
]);

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    stripeCustomerId: text("stripe_customer_id").notNull(),
    stripeSubscriptionId: text("stripe_subscription_id").notNull().unique(),
    plan: text("plan").notNull(),     // 'standard' | 'pro' (CHECK in SQL)
    cycle: text("cycle").notNull(),   // 'monthly' | 'annual' (CHECK in SQL)
    status: subscriptionStatusEnum("status").notNull(),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("subscriptions_user_idx").on(t.userId),
    index("subscriptions_customer_idx").on(t.stripeCustomerId),
  ],
);

/* ─── oauth_states ────────────────────────────────────────────────── */

export const oauthStates = pgTable(
  "oauth_states",
  {
    state: text("state").primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    platform: platformEnum("platform").notNull(),
    codeVerifierHash: text("code_verifier_hash"),
    redirectUri: text("redirect_uri").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("oauth_states_expires_at").on(t.expiresAt)],
);

/* ─── integrations ───────────────────────────────────────────────── */

export const integrations = pgTable(
  "integrations",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    platform: platformEnum("platform").notNull(),
    externalAccountId: text("external_account_id").notNull(),
    status: integrationStatusEnum("status").notNull().default("active"),
    accountType: text("account_type"),
    accessTokenCiphertext: _bytea("access_token_ciphertext").notNull(),
    accessTokenDek: _bytea("access_token_dek").notNull(),
    accessTokenKeyId: text("access_token_key_id").notNull(),
    refreshTokenCiphertext: _bytea("refresh_token_ciphertext"),
    refreshTokenDek: _bytea("refresh_token_dek"),
    refreshTokenKeyId: text("refresh_token_key_id"),
    tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
    scopes: text("scopes").array().notNull().default(sql`array[]::text[]`),
    connectedAt: timestamp("connected_at", { withTimezone: true }).notNull().defaultNow(),
    disconnectedAt: timestamp("disconnected_at", { withTimezone: true }),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("integrations_user_platform_external")
      .on(t.userId, t.platform, t.externalAccountId),
    /* Partial unique — only one active row per (platform, external_account_id) */
    uniqueIndex("integrations_platform_external_active")
      .on(t.platform, t.externalAccountId)
      .where(sql`status = 'active'`),
    index("integrations_user_platform").on(t.userId, t.platform),
  ],
);

/* ─── assets ─────────────────────────────────────────────────────── */

export const assets = pgTable(
  "assets",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    kind: assetKindEnum("kind").notNull(),
    title: text("title").notNull(),
    mood: text("mood"),
    scene: text("scene"),
    aestheticScore: numeric("aesthetic_score"),
    tags: text("tags").array().notNull().default(sql`array[]::text[]`),
    durationSeconds: numeric("duration_seconds"),
    storageKey: text("storage_key").notNull(),
    thumbnailStorageKey: text("thumbnail_storage_key"),
    /** Consumer state machine — read only via assetState() helper. */
    transcodedVariants: jsonb("transcoded_variants"),
    source: text("source").notNull().default("upload"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("assets_user_created_desc").on(t.userId, sql`created_at desc`)],
);

/* ─── sequences ──────────────────────────────────────────────────── */

export const sequences = pgTable(
  "sequences",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    goal: text("goal"),
    contentStyle: text("content_style"),
    brandTone: text("brand_tone"),
    persona: text("persona"),
    brief: text("brief"),
    slides: jsonb("slides").notNull().default(sql`'[]'::jsonb`),
    status: text("status").notNull().default("draft"),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    scheduledAtTimezone: text("scheduled_at_timezone"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    accentColor: text("accent_color"),
    decorations: text("decorations").array().notNull().default(sql`array[]::text[]`),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("sequences_user_created_desc").on(t.userId, sql`created_at desc`)],
);

/* ─── posts ──────────────────────────────────────────────────────── */

export const posts = pgTable(
  "posts",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    integrationId: uuid("integration_id").references(() => integrations.id, { onDelete: "set null" }),
    platform: platformEnum("platform").notNull(),
    externalId: text("external_id"),
    source: postSourceEnum("source").notNull(),
    type: text("type"),
    lifecycleState: postLifecycleEnum("lifecycle_state").notNull(),
    caption: text("caption"),
    thumbnailUrl: text("thumbnail_url"),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    scheduledAtTimezone: text("scheduled_at_timezone"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    reach: integer("reach"),
    likes: integer("likes"),
    comments: integer("comments"),
    saves: integer("saves"),
    shares: integer("shares"),
    engagementRate: numeric("engagement_rate"),
    importedAt: timestamp("imported_at", { withTimezone: true }),
    lastInsightSyncAt: timestamp("last_insight_sync_at", { withTimezone: true }),
    publishError: text("publish_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("posts_user_published_desc")
      .on(t.userId, sql`published_at desc`)
      .where(sql`published_at is not null`),
    index("posts_user_scheduled")
      .on(t.userId, t.scheduledAt)
      .where(sql`lifecycle_state = 'scheduled'`),
    uniqueIndex("posts_user_integration_external")
      .on(t.userId, t.integrationId, t.externalId)
      .where(sql`external_id is not null`),
  ],
);

/* ─── jobs ───────────────────────────────────────────────────────── */

export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    /** Logical reference; no FK because audit-style retention. */
    userId: uuid("user_id").notNull(),
    kind: jobKindEnum("kind").notNull(),
    integrationId: uuid("integration_id").references(() => integrations.id, { onDelete: "cascade" }),
    assetId: uuid("asset_id").references(() => assets.id, { onDelete: "cascade" }),
    postId: uuid("post_id").references(() => posts.id, { onDelete: "cascade" }),
    subType: text("sub_type"),
    payload: jsonb("payload").notNull().default(sql`'{}'::jsonb`),
    status: jobStatusEnum("status").notNull().default("queued"),
    cursor: jsonb("cursor"),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(5),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).notNull().defaultNow(),
    /** Observability only. */
    claimedAt: timestamp("claimed_at", { withTimezone: true }),
    /** Sweeper key — workers bump every 30s; sweeper reclaims if older than 90s. */
    heartbeatAt: timestamp("heartbeat_at", { withTimezone: true }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    errorText: text("error_text"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("jobs_status_kind_next_attempt")
      .on(t.status, t.kind, t.nextAttemptAt)
      .where(sql`status in ('queued','running')`),
    index("jobs_user_kind").on(t.userId, t.kind),
    index("jobs_running_heartbeat")
      .on(t.heartbeatAt)
      .where(sql`status = 'running'`),
  ],
);

/* ─── audit_log ──────────────────────────────────────────────────── */

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    /** Logical reference only — survives 1 year past hard-delete with hashed value. */
    userId: uuid("user_id").notNull(),
    actor: text("actor").notNull(),
    action: text("action").notNull(),
    targetType: text("target_type"),
    targetId: text("target_id"),
    metadata: jsonb("metadata"),
    ip: _inet("ip"),
    userAgent: text("user_agent"),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("audit_log_user_at_desc").on(t.userId, sql`at desc`),
    index("audit_log_action").on(t.action, sql`at desc`),
  ],
);

/* ─── webhook_events ─────────────────────────────────────────────── */

export const webhookEvents = pgTable(
  "webhook_events",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    provider: platformEnum("provider").notNull(),
    externalId: text("external_id").notNull(),
    payload: jsonb("payload").notNull(),
    signatureVerified: boolean("signature_verified").notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    processError: text("process_error"),
  },
  (t) => [
    uniqueIndex("webhook_events_provider_external").on(t.provider, t.externalId),
    index("webhook_events_provider_received").on(t.provider, sql`received_at desc`),
  ],
);

/* ─── sync_runs ──────────────────────────────────────────────────── */

export const syncRuns = pgTable(
  "sync_runs",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    integrationId: uuid("integration_id").notNull().references(() => integrations.id, { onDelete: "cascade" }),
    jobId: uuid("job_id").references(() => jobs.id, { onDelete: "set null" }),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    status: text("status").notNull(),
    pagesFetched: integer("pages_fetched").default(0),
    postsUpserted: integer("posts_upserted").default(0),
    cursor: jsonb("cursor"),
    errorText: text("error_text"),
  },
  (t) => [index("sync_runs_integration_started_desc").on(t.integrationId, sql`started_at desc`)],
);

/* ─── deletion_requests ──────────────────────────────────────────── */

export const deletionRequests = pgTable(
  "deletion_requests",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id").notNull(),
    source: text("source").notNull(),
    confirmationCode: text("confirmation_code").notNull().unique(),
    requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    reason: text("reason"),
  },
  (t) => [
    index("deletion_requests_user_id").on(t.userId),
    index("deletion_requests_unprocessed").on(t.requestedAt).where(sql`completed_at is null`),
  ],
);

/* ─── content_dna (analyses + drafts) ────────────────────────────── */

export const analysisStatusEnum = pgEnum("analysis_status_t", [
  "analyzing",
  "ready",
  "failed",
]);

export const sourcePlatformEnum = pgEnum("source_platform_t", [
  "youtube",
  "instagram",
  "tiktok",
  "other",
]);

/** v21: input mode discriminator for the Transcription Engine. */
export const sourceKindEnum = pgEnum("source_kind_t", [
  "url",
  "username",
  "upload",
]);

export const contentAnalyses = pgTable(
  "content_analyses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    /** v21: nullable for username/upload flows that defer URL resolution. */
    sourceUrl: text("source_url"),
    sourcePlatform: sourcePlatformEnum("source_platform").notNull(),
    sourceTitle: text("source_title"),
    sourceCreator: text("source_creator"),
    sourceThumbnail: text("source_thumbnail"),
    /** v21: how the user provided the source — drives the input UI tab. */
    sourceKind: sourceKindEnum("source_kind").notNull().default("url"),
    /** v21: handle for username flow (e.g. "@hubermanlab"). */
    sourceHandle: text("source_handle"),
    /** v21: asset row for upload flow. */
    uploadAssetId: uuid("upload_asset_id").references(() => assets.id, { onDelete: "set null" }),
    transcription: text("transcription"),
    hook: text("hook"),
    structure: jsonb("structure"),
    whyItWorked: jsonb("why_it_worked"),
    variations: jsonb("variations"),
    /** v21: jsonb { hook_text, why_it_works, attention_arc[] } */
    hookAnalysis: jsonb("hook_analysis"),
    /** v21: bulleted themes for filtering and search. */
    themes: text("themes").array().notNull().default(sql`array[]::text[]`),
    /** v21: educational | entertaining | authoritative | conversational | ... */
    tone: text("tone"),
    cta: text("cta"),
    /** v21: 0.0–10.0 quality score from the AI enrichment pass. */
    contentScore: numeric("content_score", { precision: 3, scale: 1 }),
    /** v21: "what to steal" — actionable adaptation notes for the user. */
    stealNotes: text("steal_notes"),
    status: analysisStatusEnum("status").notNull().default("analyzing"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("content_analyses_user_created_idx").on(t.userId, sql`created_at desc`),
    index("content_analyses_themes_gin").using("gin", t.themes),
    index("content_analyses_user_kind_created_idx")
      .on(t.userId, t.sourceKind, sql`created_at desc`),
    index("content_analyses_upload_asset_idx")
      .on(t.uploadAssetId)
      .where(sql`upload_asset_id is not null`),
    check(
      "content_analyses_content_score_check",
      sql`content_score is null or (content_score >= 0 and content_score <= 10)`,
    ),
  ],
);

export const contentDrafts = pgTable(
  "content_drafts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    analysisId: uuid("analysis_id").notNull().references(() => contentAnalyses.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    angle: text("angle"),
    audience: text("audience"),
    targetPlatform: text("target_platform"),
    tone: text("tone"),
    script: text("script"),
    hooks: jsonb("hooks"),
    shots: jsonb("shots"),
    captions: jsonb("captions"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("content_drafts_analysis_idx").on(t.analysisId),
    index("content_drafts_user_created_idx").on(t.userId, sql`created_at desc`),
  ],
);

/* ─── Agency multi-tenancy (v33): organizations + memberships + invites ── */

export const orgRoleEnum = pgEnum("org_role_t", ["user", "editor", "director"]);
export const orgPlanEnum = pgEnum("org_plan_t", [
  "free", "starter", "pro", "scale",
]);
export const orgSubStatusEnum = pgEnum("org_sub_status_t", [
  "trialing", "active", "past_due", "canceled", "unpaid",
  "incomplete", "incomplete_expired", "paused",
]);

export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    plan: orgPlanEnum("plan").notNull().default("free"),
    stripeCustomerId: text("stripe_customer_id").unique(),
    stripeSubscriptionId: text("stripe_subscription_id").unique(),
    subscriptionStatus: orgSubStatusEnum("subscription_status").notNull().default("trialing"),
    trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  () => [
    check("organizations_slug_format", sql`slug ~ '^[a-z0-9-]+$'`),
  ],
);

export const organizationMemberships = pgTable(
  "organization_memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    role: orgRoleEnum("role").notNull().default("user"),
    /** Orthogonal admin flag. Gates invites, billing, client delete. */
    isAdmin: boolean("is_admin").notNull().default(false),
    invitedBy: uuid("invited_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("organization_memberships_org_profile_uniq").on(t.organizationId, t.profileId),
    index("org_members_profile_idx").on(t.profileId),
    index("org_members_org_idx").on(t.organizationId),
  ],
);

export const organizationInvites = pgTable(
  "organization_invites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: orgRoleEnum("role").notNull().default("user"),
    isAdmin: boolean("is_admin").notNull().default(false),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("org_invites_org_idx").on(t.organizationId),
  ],
);

/** Stripe webhook idempotency. Service-role only. */
export const stripeEvents = pgTable("stripe_events", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  payload: jsonb("payload").notNull(),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ─── PDF expansion: AI Script Generator (v22 + v23) ─────────────── */

export const scriptFormatEnum = pgEnum("script_format_t", [
  "reel", "longform", "vsl", "story_sequence", "email",
]);
export const scriptStatusEnum = pgEnum("script_status_t", [
  "draft", "approved", "used", "archived",
]);
export const scriptFrequencyEnum = pgEnum("script_frequency_t", [
  "daily", "three_x_week", "weekly", "biweekly", "monthly", "custom",
]);

export const generatedScripts = pgTable(
  "generated_scripts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    sourceAnalysisId: uuid("source_analysis_id").references(() => contentAnalyses.id, { onDelete: "set null" }),
    platform: platformEnum("platform").notNull(),
    format: scriptFormatEnum("format").notNull(),
    title: text("title"),
    hook: text("hook"),
    setup: text("setup"),
    /** jsonb: [{ title, body }, ...] */
    keyPoints: jsonb("key_points").notNull().default(sql`'[]'::jsonb`),
    cta: text("cta"),
    bRollNotes: text("b_roll_notes"),
    status: scriptStatusEnum("status").notNull().default("draft"),
    feedback: text("feedback"),
    linkedSequenceId: uuid("linked_sequence_id").references(() => sequences.id, { onDelete: "set null" }),
    linkedPostId: uuid("linked_post_id").references(() => posts.id, { onDelete: "set null" }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("generated_scripts_user_status_created_idx").on(t.userId, t.status, sql`created_at desc`),
    index("generated_scripts_user_platform_idx").on(t.userId, t.platform),
    index("generated_scripts_source_analysis_idx")
      .on(t.sourceAnalysisId)
      .where(sql`source_analysis_id is not null`),
    index("generated_scripts_linked_sequence_idx")
      .on(t.linkedSequenceId)
      .where(sql`linked_sequence_id is not null`),
    index("generated_scripts_linked_post_idx")
      .on(t.linkedPostId)
      .where(sql`linked_post_id is not null`),
  ],
);

export const scriptPreferences = pgTable(
  "script_preferences",
  {
    userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
    scriptsPerPeriod: integer("scripts_per_period").notNull().default(3),
    frequency: scriptFrequencyEnum("frequency").notNull().default("weekly"),
    /** 5-field cron expression. Required when frequency = 'custom'. */
    customCron: text("custom_cron"),
    defaultFormat: scriptFormatEnum("default_format").notNull().default("reel"),
    defaultPlatforms: platformEnum("default_platforms").array().notNull()
      .default(sql`array['instagram']::platform_t[]`),
    /** jsonb { system_prompt?, style_guide?, banned_phrases?[] } */
    systemPromptOverrides: jsonb("system_prompt_overrides").notNull().default(sql`'{}'::jsonb`),
    /** Null → use plan-tier default cap. */
    monthlyCap: integer("monthly_cap"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  () => [
    check(
      "script_preferences_per_period_check",
      sql`scripts_per_period >= 1 and scripts_per_period <= 100`,
    ),
    check(
      "script_preferences_monthly_cap_check",
      sql`monthly_cap is null or monthly_cap > 0`,
    ),
    check(
      "script_preferences_custom_cron_check",
      sql`frequency != 'custom' or (custom_cron is not null and length(custom_cron) > 0)`,
    ),
  ],
);

/* ─── PDF expansion: Editor Portfolio Builder (v24) ──────────────── */

export const editorPortfolios = pgTable(
  "editor_portfolios",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    bio: text("bio"),
    specialties: text("specialties").array().notNull().default(sql`array[]::text[]`),
    platforms: platformEnum("platforms").array().notNull().default(sql`array[]::platform_t[]`),
    yearsExperience: integer("years_experience"),
    contactEmail: text("contact_email"),
    /** jsonb { website?, twitter?, instagram?, youtube?, linkedin?, calendly? } */
    contactLinks: jsonb("contact_links").notNull().default(sql`'{}'::jsonb`),
    /** jsonb [{ video_url, description, results, thumbnail_url? }, ...] */
    workSamples: jsonb("work_samples").notNull().default(sql`'[]'::jsonb`),
    nicheTags: text("niche_tags").array().notNull().default(sql`array[]::text[]`),
    /** jsonb [{ name, logo_url? }, ...] */
    clientLogos: jsonb("client_logos").notNull().default(sql`'[]'::jsonb`),
    /** jsonb [{ quote, attribution, link?, avatar_url? }, ...] */
    testimonials: jsonb("testimonials").notNull().default(sql`'[]'::jsonb`),
    isPublic: boolean("is_public").notNull().default(false),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("editor_portfolios_slug_uniq").on(sql`lower(${t.slug})`),
    check(
      "editor_portfolios_years_experience_check",
      sql`years_experience is null or (years_experience >= 0 and years_experience <= 80)`,
    ),
    check(
      "editor_portfolios_slug_check",
      sql`slug ~ '^[a-z0-9](?:[a-z0-9-]{1,48}[a-z0-9])?$'`,
    ),
  ],
);

/* ─── PDF expansion: Creator Database + Outreach (v25 + v26 + v27) ─ */

export const followerRangeEnum = pgEnum("follower_range_t", [
  "under_10k", "10k_50k", "50k_250k", "250k_1m", "over_1m",
]);
export const postingFrequencyEnum = pgEnum("posting_frequency_t", [
  "rarely", "weekly", "few_per_week", "daily", "multi_daily",
]);
export const targetStatusEnum = pgEnum("target_status_t", [
  "pitched", "responded", "client", "pass",
]);
export const outreachMethodEnum = pgEnum("outreach_method_t", [
  "dm", "email", "comment", "followup", "voice_note",
]);
export const outreachOutcomeEnum = pgEnum("outreach_outcome_t", [
  "pending", "no_response", "declined", "interested", "converted",
]);

export const creatorDirectory = pgTable(
  "creator_directory",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    handle: text("handle").notNull(),
    displayName: text("display_name"),
    primaryPlatform: platformEnum("primary_platform").notNull(),
    niche: text("niche").notNull(),
    followerRange: followerRangeEnum("follower_range"),
    platforms: platformEnum("platforms").array().notNull().default(sql`array[]::platform_t[]`),
    postingFrequency: postingFrequencyEnum("posting_frequency"),
    bio: text("bio"),
    avatarUrl: text("avatar_url"),
    /** jsonb { engagement_rate?, content_themes?, language?, region?, notes? } */
    metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
    /** Audit-only — who curated this row. */
    curatedBy: text("curated_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("creator_directory_handle_platform_uniq")
      .on(sql`lower(${t.handle})`, t.primaryPlatform),
    index("creator_directory_niche_idx").on(t.niche),
    index("creator_directory_follower_range_idx")
      .on(t.followerRange)
      .where(sql`follower_range is not null`),
  ],
);

export const editorCreatorTargets = pgTable(
  "editor_creator_targets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    creatorId: uuid("creator_id").notNull().references(() => creatorDirectory.id, { onDelete: "cascade" }),
    status: targetStatusEnum("status").notNull().default("pitched"),
    notes: text("notes"),
    addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
    /** Stamped by trg_touch_target_status_change on every status flip. */
    lastStatusChangeAt: timestamp("last_status_change_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("editor_creator_targets_user_creator_uniq").on(t.userId, t.creatorId),
    index("editor_creator_targets_user_status_idx").on(t.userId, t.status, sql`added_at desc`),
    index("editor_creator_targets_creator_idx").on(t.creatorId),
  ],
);

export const creatorOutreachLog = pgTable(
  "creator_outreach_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    creatorId: uuid("creator_id").notNull().references(() => creatorDirectory.id, { onDelete: "cascade" }),
    targetId: uuid("target_id").references(() => editorCreatorTargets.id, { onDelete: "set null" }),
    outreachMethod: outreachMethodEnum("outreach_method").notNull(),
    messageText: text("message_text").notNull(),
    /** Logical FK only — deleting transcripts shouldn't bork the log. */
    sourceAnalysisIds: uuid("source_analysis_ids").array().notNull().default(sql`array[]::uuid[]`),
    outcome: outreachOutcomeEnum("outcome").notNull().default("pending"),
    outreachDate: timestamp("outreach_date", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("creator_outreach_log_user_date_idx").on(t.userId, sql`outreach_date desc`),
    index("creator_outreach_log_creator_idx").on(t.creatorId, sql`outreach_date desc`),
    index("creator_outreach_log_target_idx")
      .on(t.targetId)
      .where(sql`target_id is not null`),
  ],
);

/* ─── schema_migrations ──────────────────────────────────────────── */

export const schemaMigrations = pgTable("schema_migrations", {
  version: integer("version").primaryKey(),
  appliedAt: timestamp("applied_at", { withTimezone: true }).notNull().defaultNow(),
  checksum: text("checksum"),
});

/* ─── Type exports ───────────────────────────────────────────────── */

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
export type Integration = typeof integrations.$inferSelect;
export type NewIntegration = typeof integrations.$inferInsert;
export type Asset = typeof assets.$inferSelect;
export type NewAsset = typeof assets.$inferInsert;
export type Sequence = typeof sequences.$inferSelect;
export type NewSequence = typeof sequences.$inferInsert;
export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
export type Job = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;
export type AuditEntry = typeof auditLog.$inferSelect;
export type NewAuditEntry = typeof auditLog.$inferInsert;
export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
export type OrganizationMembership = typeof organizationMemberships.$inferSelect;
export type NewOrganizationMembership = typeof organizationMemberships.$inferInsert;
export type OrganizationInvite = typeof organizationInvites.$inferSelect;
export type NewOrganizationInvite = typeof organizationInvites.$inferInsert;
export type StripeEvent = typeof stripeEvents.$inferSelect;
export type NewStripeEvent = typeof stripeEvents.$inferInsert;
/* PDF expansion (v21-v27). */
export type ContentAnalysis = typeof contentAnalyses.$inferSelect;
export type NewContentAnalysis = typeof contentAnalyses.$inferInsert;
export type GeneratedScript = typeof generatedScripts.$inferSelect;
export type NewGeneratedScript = typeof generatedScripts.$inferInsert;
export type ScriptPreferences = typeof scriptPreferences.$inferSelect;
export type NewScriptPreferences = typeof scriptPreferences.$inferInsert;
export type EditorPortfolio = typeof editorPortfolios.$inferSelect;
export type NewEditorPortfolio = typeof editorPortfolios.$inferInsert;
export type CreatorDirectoryEntry = typeof creatorDirectory.$inferSelect;
export type NewCreatorDirectoryEntry = typeof creatorDirectory.$inferInsert;
export type EditorCreatorTarget = typeof editorCreatorTargets.$inferSelect;
export type NewEditorCreatorTarget = typeof editorCreatorTargets.$inferInsert;
export type CreatorOutreachLogEntry = typeof creatorOutreachLog.$inferSelect;
export type NewCreatorOutreachLogEntry = typeof creatorOutreachLog.$inferInsert;
