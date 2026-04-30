/**
 * `forUser(userId)` — the only sanctioned entry point for service-role DB
 * access in cron jobs, webhook handlers, and any other place where there's
 * no Supabase auth session.
 *
 * **App code (server components, request-bound API routes) does not use this.**
 * It uses the Supabase server client (src/lib/supabase/server.ts) which
 * inherits the user's session and RLS does the isolation.
 *
 * Why this exists:
 *   - The Drizzle client uses the service-role connection, which bypasses RLS.
 *   - Background workers (sync, transcode, publish, refresh) have no session.
 *   - We still want every query to be user-scoped — by code convention
 *     enforced by ESLint, not by hope.
 *
 * Every method on the returned scope injects `where eq(table.userId, userId)`.
 * Joins also filter every joined user-owned table by the same userId.
 *
 * If you need cross-user access (rare — admin scripts, support ops), use
 * `escapeHatch(reason)` and accept the audit log entry + Sentry warning.
 */

import { and, eq, desc } from "drizzle-orm";
import { dbInternal, schema } from "./index";
import { log } from "@/lib/log";
import type {
  Profile,
  NewProfile,
  Asset,
  NewAsset,
  Sequence,
  NewSequence,
  Post,
  NewPost,
  Integration,
} from "./schema";

/* ─── Public, redacted Integration shape ────────────────────────────
 *
 * App code must never see encrypted tokens. The integrations scope
 * returns this redacted shape; raw rows stay inside the worker. */
export type PublicIntegration = Omit<
  Integration,
  | "accessTokenCiphertext"
  | "accessTokenDek"
  | "accessTokenKeyId"
  | "refreshTokenCiphertext"
  | "refreshTokenDek"
  | "refreshTokenKeyId"
>;

function publicIntegrationFields() {
  const i = schema.integrations;
  return {
    id: i.id,
    userId: i.userId,
    platform: i.platform,
    externalAccountId: i.externalAccountId,
    status: i.status,
    accountType: i.accountType,
    tokenExpiresAt: i.tokenExpiresAt,
    scopes: i.scopes,
    connectedAt: i.connectedAt,
    disconnectedAt: i.disconnectedAt,
    lastSyncedAt: i.lastSyncedAt,
    updatedAt: i.updatedAt,
  };
}

/* ─── Scopes ─────────────────────────────────────────────────────── */

class ProfilesScope {
  constructor(private readonly userId: string) {}

  async get(): Promise<Profile | null> {
    const rows = await dbInternal
      .select()
      .from(schema.profiles)
      .where(eq(schema.profiles.userId, this.userId))
      .limit(1);
    return rows[0] ?? null;
  }

  async upsert(values: Omit<NewProfile, "userId">): Promise<Profile> {
    const [row] = await dbInternal
      .insert(schema.profiles)
      .values({ ...values, userId: this.userId })
      .onConflictDoUpdate({
        target: schema.profiles.userId,
        set: { ...values, updatedAt: new Date() },
      })
      .returning();
    return row;
  }
}

class AssetsScope {
  constructor(private readonly userId: string) {}

  async list(): Promise<Asset[]> {
    return dbInternal
      .select()
      .from(schema.assets)
      .where(eq(schema.assets.userId, this.userId))
      .orderBy(desc(schema.assets.createdAt));
  }

  async insert(row: Omit<NewAsset, "userId">): Promise<Asset> {
    const [created] = await dbInternal
      .insert(schema.assets)
      .values({ ...row, userId: this.userId })
      .returning();
    return created;
  }

  async update(id: string, patch: Partial<NewAsset>): Promise<void> {
    /* Defensive: never let userId be patched through this path. */
    const { userId: _ignore, ...safe } = patch;
    void _ignore;
    await dbInternal
      .update(schema.assets)
      .set(safe)
      .where(and(eq(schema.assets.id, id), eq(schema.assets.userId, this.userId)));
  }

  async remove(id: string): Promise<void> {
    await dbInternal
      .delete(schema.assets)
      .where(and(eq(schema.assets.id, id), eq(schema.assets.userId, this.userId)));
  }
}

class SequencesScope {
  constructor(private readonly userId: string) {}

  async list(): Promise<Sequence[]> {
    return dbInternal
      .select()
      .from(schema.sequences)
      .where(eq(schema.sequences.userId, this.userId))
      .orderBy(desc(schema.sequences.createdAt));
  }

  async insert(row: Omit<NewSequence, "userId">): Promise<Sequence> {
    const [created] = await dbInternal
      .insert(schema.sequences)
      .values({ ...row, userId: this.userId })
      .returning();
    return created;
  }

  async update(id: string, patch: Partial<NewSequence>): Promise<void> {
    const { userId: _ignore, ...safe } = patch;
    void _ignore;
    await dbInternal
      .update(schema.sequences)
      .set(safe)
      .where(
        and(eq(schema.sequences.id, id), eq(schema.sequences.userId, this.userId)),
      );
  }

  /**
   * Typed join: sequences with all asset rows referenced in their slides.
   * Both tables are filtered by userId — joining a sequence to another
   * user's asset is impossible.
   */
  async withAssets(id: string): Promise<{ sequence: Sequence; assets: Asset[] } | null> {
    const seq = await dbInternal
      .select()
      .from(schema.sequences)
      .where(
        and(eq(schema.sequences.id, id), eq(schema.sequences.userId, this.userId)),
      )
      .limit(1);
    if (!seq[0]) return null;

    const slides = (seq[0].slides ?? []) as Array<{ assetId?: string }>;
    const assetIds = [...new Set(slides.map((s) => s.assetId).filter(Boolean) as string[])];
    if (assetIds.length === 0) return { sequence: seq[0], assets: [] };

    const assets = await dbInternal
      .select()
      .from(schema.assets)
      .where(
        and(
          eq(schema.assets.userId, this.userId),
          /* drizzle inArray import would shorten this — kept as eq-or for clarity */
          assetIds.length === 1
            ? eq(schema.assets.id, assetIds[0])
            : (await import("drizzle-orm")).inArray(schema.assets.id, assetIds),
        ),
      );
    return { sequence: seq[0], assets };
  }
}

class PostsScope {
  constructor(private readonly userId: string) {}

  async list(): Promise<Post[]> {
    return dbInternal
      .select()
      .from(schema.posts)
      .where(eq(schema.posts.userId, this.userId))
      .orderBy(desc(schema.posts.publishedAt));
  }

  async scheduled(): Promise<Post[]> {
    return dbInternal
      .select()
      .from(schema.posts)
      .where(
        and(
          eq(schema.posts.userId, this.userId),
          eq(schema.posts.lifecycleState, "scheduled"),
        ),
      )
      .orderBy(schema.posts.scheduledAt);
  }

  async insert(row: Omit<NewPost, "userId">): Promise<Post> {
    const [created] = await dbInternal
      .insert(schema.posts)
      .values({ ...row, userId: this.userId })
      .returning();
    return created;
  }

  async update(id: string, patch: Partial<NewPost>): Promise<void> {
    const { userId: _ignore, ...safe } = patch;
    void _ignore;
    await dbInternal
      .update(schema.posts)
      .set(safe)
      .where(
        and(eq(schema.posts.id, id), eq(schema.posts.userId, this.userId)),
      );
  }

  /**
   * Typed join: posts with their integration metadata for the sync UI.
   * Returns the redacted PublicIntegration shape — never raw token bytes.
   */
  async withIntegrations(): Promise<Array<Post & { integration: PublicIntegration | null }>> {
    const rows = await dbInternal
      .select({
        post: schema.posts,
        integration: publicIntegrationFields(),
      })
      .from(schema.posts)
      .leftJoin(
        schema.integrations,
        and(
          eq(schema.integrations.id, schema.posts.integrationId),
          eq(schema.integrations.userId, this.userId),
        ),
      )
      .where(eq(schema.posts.userId, this.userId))
      .orderBy(desc(schema.posts.publishedAt));
    return rows.map((r) => ({ ...r.post, integration: r.integration }));
  }
}

class IntegrationsScope {
  constructor(private readonly userId: string) {}

  /** Returns redacted rows — never raw token bytes. */
  async list(): Promise<PublicIntegration[]> {
    return dbInternal
      .select(publicIntegrationFields())
      .from(schema.integrations)
      .where(eq(schema.integrations.userId, this.userId));
  }

  async byPlatform(platform: PublicIntegration["platform"]): Promise<PublicIntegration | null> {
    const rows = await dbInternal
      .select(publicIntegrationFields())
      .from(schema.integrations)
      .where(
        and(
          eq(schema.integrations.userId, this.userId),
          eq(schema.integrations.platform, platform),
          eq(schema.integrations.status, "active"),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }
}

/* ─── forUser API ────────────────────────────────────────────────── */

export type ForUserApi = {
  profiles: ProfilesScope;
  assets: AssetsScope;
  sequences: SequencesScope;
  posts: PostsScope;
  integrations: IntegrationsScope;
};

export function forUser(userId: string): ForUserApi {
  if (!userId || typeof userId !== "string") {
    throw new Error("forUser requires a non-empty string userId");
  }
  return {
    profiles: new ProfilesScope(userId),
    assets: new AssetsScope(userId),
    sequences: new SequencesScope(userId),
    posts: new PostsScope(userId),
    integrations: new IntegrationsScope(userId),
  };
}

/* ─── escapeHatch ────────────────────────────────────────────────── *
 *
 * Last resort. Returns the raw Drizzle handle so cross-user analytics jobs,
 * admin scripts, and support ops can run queries that don't fit `forUser`.
 *
 * Constraints:
 *   - Requires a >=20-char `reason` string.
 *   - Logs a warning + audit entry on every call.
 *   - The `creatorhub/escape-hatch-justified` ESLint rule requires a
 *     `// eslint-disable-next-line creatorhub/escape-hatch-justified — <reason>`
 *     comment immediately above the call.
 *   - `creatorhub/no-raw-db-import-in-app` blocks importing `dbInternal`
 *     and `escapeHatch` from src/app/(app)/** and src/components/**.
 */
export function escapeHatch(reason: string) {
  if (!reason || reason.trim().length < 20) {
    throw new Error(
      `escapeHatch requires a >=20-char reason describing why forUser doesn't fit. ` +
        `Got: ${JSON.stringify(reason)}`,
    );
  }
  log.warn("db.escapeHatch", { reason });
  /* Audit write happens via the audit lib at the call site, not here, to
     avoid a circular import. */
  return dbInternal;
}
