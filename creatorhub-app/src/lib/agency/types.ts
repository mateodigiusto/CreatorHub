/**
 * Agency-side row types.
 *
 * Phase 2 surface only — clients + client memberships. Future phases add
 * brand_profiles, content_items, etc. Keep narrow until the migration
 * landed; over-shaping is its own kind of waste.
 */

export type ClientStatus = "active" | "paused" | "archived";
export type ClientAccessRole = "client_owner" | "team_assigned";

export type Client = {
  id: string;
  organizationId: string;
  slug: string;
  displayName: string;
  tagline: string | null;
  status: ClientStatus;
  instagramHandle: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ClientMembership = {
  id: string;
  organizationId: string;
  clientId: string;
  profileId: string;
  accessRole: ClientAccessRole;
  invitedBy: string | null;
  createdAt: string;
};

export type ClientMembershipWithProfile = ClientMembership & {
  profile: {
    userId: string;
    displayName: string | null;
    handle: string | null;
    avatarUrl: string | null;
  } | null;
  email?: string;
};

export type ClientCreateInput = {
  displayName: string;
  slug: string;
  tagline?: string | null;
  instagramHandle?: string | null;
};

export type ClientUpdateInput = Partial<{
  displayName: string;
  slug: string;
  tagline: string | null;
  instagramHandle: string | null;
  status: ClientStatus;
}>;
