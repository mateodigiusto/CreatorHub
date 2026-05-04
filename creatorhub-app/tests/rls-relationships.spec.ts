/**
 * RLS regression for the multi-party Creator Management Hub shape.
 *
 * The shapes covered here are different from `rls.spec.ts` (single-tenant
 * user_id ownership). Relationships have TWO owners (manager_id + creator_id),
 * and child tables (tasks, messages, links, documents) gate via the
 * `is_relationship_member()` SECURITY DEFINER helper.
 *
 * What this proves:
 *   1. Anonymous clients can't read anything.
 *   2. Both parties of a relationship can read it; outsiders cannot.
 *   3. Child-table membership flows through `is_relationship_member()`.
 *   4. `with check (status='active')` freezes child-table inserts on ended
 *      relationships (preserves history but stops further activity).
 *   5. The `promote_pending_invites` trigger fires when a fresh user signs up
 *      with an email that matches a pending invite.
 *   6. `notifications` is recipient-only.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

type TestUser = { id: string; email: string; client: SupabaseClient };

let manager: TestUser;
let creator: TestUser;
let outsider: TestUser;
let anon: SupabaseClient;
let admin: SupabaseClient;
let relationshipId: string;

async function signUpTestUser(email: string): Promise<TestUser> {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data, error } = await client.auth.signUp({
    email,
    password: "test-password-1234567890",
  });
  if (error) throw error;
  if (!data.user) throw new Error("signUp returned no user");
  return { id: data.user.id, email, client };
}

beforeAll(async () => {
  anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const stamp = Date.now();
  manager = await signUpTestUser(`mgr-${stamp}@test.local`);
  creator = await signUpTestUser(`crt-${stamp}@test.local`);
  outsider = await signUpTestUser(`out-${stamp}@test.local`);

  /* Manager inserts an already-active relationship with the existing creator
     user. Bypassing the pending → trigger flow because we test that
     separately at the bottom. */
  const { data: rel, error: relErr } = await admin
    .from("creator_relationships")
    .insert({
      manager_id: manager.id,
      creator_id: creator.id,
      status: "active",
      accepted_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (relErr || !rel) throw new Error(`seed relationship failed: ${relErr?.message}`);
  relationshipId = rel.id;
}, 30_000);

describe("anonymous access is denied", () => {
  for (const table of [
    "creator_relationships",
    "relationship_tasks",
    "relationship_messages",
    "relationship_links",
    "relationship_documents",
    "notifications",
  ]) {
    it(`anon cannot read ${table}`, async () => {
      const { data, error } = await anon.from(table).select("*");
      expect(error).toBeNull();
      expect(data ?? []).toEqual([]);
    });
  }
});

describe("creator_relationships: both parties see, outsider cannot", () => {
  it("manager sees the relationship", async () => {
    const { data, error } = await manager.client
      .from("creator_relationships")
      .select("id, manager_id, creator_id")
      .eq("id", relationshipId);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].manager_id).toBe(manager.id);
  });

  it("creator (counterparty) sees the relationship", async () => {
    const { data, error } = await creator.client
      .from("creator_relationships")
      .select("id, creator_id")
      .eq("id", relationshipId);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].creator_id).toBe(creator.id);
  });

  it("outsider cannot see the relationship", async () => {
    const { data, error } = await outsider.client
      .from("creator_relationships")
      .select("id")
      .eq("id", relationshipId);
    expect(error).toBeNull();
    expect(data ?? []).toEqual([]);
  });

  it("outsider cannot insert a relationship pretending to be manager", async () => {
    const { error } = await outsider.client.from("creator_relationships").insert({
      manager_id: manager.id,
      creator_id: outsider.id,
      status: "pending",
    });
    /* RLS WITH CHECK violation — outsider's auth.uid() != manager_id. */
    expect(error).toBeTruthy();
  });
});

describe("relationship_tasks: membership via is_relationship_member()", () => {
  let taskId: string;

  it("manager can insert a task in their relationship", async () => {
    const { data, error } = await manager.client
      .from("relationship_tasks")
      .insert({
        relationship_id: relationshipId,
        created_by: manager.id,
        assigned_to: creator.id,
        title: "Test task",
        recurrence: "none",
      })
      .select("id")
      .single();
    expect(error).toBeNull();
    expect(data).toBeTruthy();
    taskId = data!.id;
  });

  it("creator (counterparty) can read the task", async () => {
    const { data, error } = await creator.client
      .from("relationship_tasks")
      .select("id, title")
      .eq("id", taskId);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it("outsider cannot read the task", async () => {
    const { data } = await outsider.client
      .from("relationship_tasks")
      .select("id")
      .eq("id", taskId);
    expect(data ?? []).toEqual([]);
  });

  it("outsider cannot insert a task into someone else's relationship", async () => {
    const { error } = await outsider.client.from("relationship_tasks").insert({
      relationship_id: relationshipId,
      created_by: outsider.id,
      assigned_to: outsider.id,
      title: "Sneaky task",
    });
    expect(error).toBeTruthy();
  });
});

describe("frozen-on-end: status='active' WITH CHECK", () => {
  let endedRelId: string;

  beforeAll(async () => {
    const { data, error } = await admin
      .from("creator_relationships")
      .insert({
        manager_id: manager.id,
        creator_id: creator.id,
        status: "ended",
        ended_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (error || !data) throw new Error(`seed ended relationship: ${error?.message}`);
    endedRelId = data.id;
  });

  it("manager cannot insert a task into an ended relationship", async () => {
    const { error } = await manager.client.from("relationship_tasks").insert({
      relationship_id: endedRelId,
      created_by: manager.id,
      assigned_to: creator.id,
      title: "After-the-fact task",
    });
    expect(error).toBeTruthy();
  });

  it("manager cannot insert a message into an ended relationship", async () => {
    const { error } = await manager.client.from("relationship_messages").insert({
      relationship_id: endedRelId,
      sender_id: manager.id,
      body: "ghost message",
    });
    expect(error).toBeTruthy();
  });

  it("both parties can still READ history of an ended relationship", async () => {
    const m = await manager.client
      .from("creator_relationships")
      .select("id")
      .eq("id", endedRelId);
    expect(m.data).toHaveLength(1);

    const c = await creator.client
      .from("creator_relationships")
      .select("id")
      .eq("id", endedRelId);
    expect(c.data).toHaveLength(1);
  });
});

describe("auto-promote trigger: pending invite → fresh signup", () => {
  it("invite by email + fresh signup flips the row to active", async () => {
    const stamp = Date.now();
    const ghostEmail = `ghost-${stamp}@test.local`;

    /* Manager inserts a pending invite for someone who doesn't exist yet. */
    const { data: rel, error: relErr } = await admin
      .from("creator_relationships")
      .insert({
        manager_id: manager.id,
        invited_email: ghostEmail,
        status: "pending",
      })
      .select("id")
      .single();
    expect(relErr).toBeNull();
    expect(rel).toBeTruthy();
    const inviteId = rel!.id;

    /* Ghost signs up. The handle_new_auth_user trigger inserts into
       public.users, which fires promote_pending_invites and flips the row. */
    const ghost = await signUpTestUser(ghostEmail);

    /* Trigger is synchronous within the user insert tx, but the public.users
       row is created via auth.users → handle_new_auth_user, which has its
       own latency. Poll briefly. */
    let promoted = false;
    for (let i = 0; i < 10; i++) {
      const { data } = await admin
        .from("creator_relationships")
        .select("status, creator_id, invited_email")
        .eq("id", inviteId)
        .single();
      if (data?.status === "active" && data.creator_id === ghost.id) {
        promoted = true;
        expect(data.invited_email).toBeNull();
        break;
      }
      await new Promise((r) => setTimeout(r, 250));
    }
    expect(promoted).toBe(true);
  }, 15_000);
});

describe("notifications: recipient-only visibility", () => {
  let notifId: string;

  beforeAll(async () => {
    /* Service role insert (the only way) — recipient is `manager`. */
    const { data, error } = await admin
      .from("notifications")
      .insert({
        recipient_id: manager.id,
        kind: "message",
        body: "hello manager",
      })
      .select("id")
      .single();
    if (error || !data) throw new Error(`seed notification: ${error?.message}`);
    notifId = data.id;
  });

  it("recipient (manager) can read their notification", async () => {
    const { data, error } = await manager.client
      .from("notifications")
      .select("id")
      .eq("id", notifId);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it("non-recipient (creator) cannot read manager's notifications", async () => {
    const { data } = await creator.client
      .from("notifications")
      .select("id")
      .eq("id", notifId);
    expect(data ?? []).toEqual([]);
  });

  it("non-recipient cannot insert a notification (service-role only)", async () => {
    const { error } = await creator.client.from("notifications").insert({
      recipient_id: manager.id,
      kind: "message",
      body: "spoofed",
    });
    expect(error).toBeTruthy();
  });
});
