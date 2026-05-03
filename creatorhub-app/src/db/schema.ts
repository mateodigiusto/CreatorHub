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
  boolean,
  integer,
  numeric,
  jsonb,
  customType,
  index,
  uniqueIndex,
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
