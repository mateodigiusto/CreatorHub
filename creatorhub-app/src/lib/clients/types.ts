/**
 * Shared types for the Creator Management Hub feature.
 *
 * Mirror the Postgres tables; convert snake_case → camelCase at the API
 * boundary so the rest of the app keeps the JS convention.
 */

export type RelationshipStatus =
  | "pending"
  | "active"
  | "declined"
  | "ended"
  | "expired";

export type TaskRecurrence = "none" | "daily";
export type TaskStatus = "pending" | "in_progress" | "done";

export type NotificationKind =
  | "invite"
  | "message"
  | "task_assigned"
  | "task_due"
  | "streak_at_risk";

export type RelationshipPerspective = "manager" | "creator";

export type RelationshipSummary = {
  id: string;
  perspective: RelationshipPerspective;
  status: RelationshipStatus;
  counterpartyName: string | null;
  counterpartyEmail: string | null;
  createdAt: string;
  acceptedAt: string | null;
  endedAt: string | null;
  expiresAt: string;
};

export type RelationshipDetail = RelationshipSummary & {
  managerId: string;
  creatorId: string | null;
  invitedEmail: string | null;
};

export type RelationshipTaskRow = {
  id: string;
  relationshipId: string;
  createdBy: string;
  assignedTo: string;
  title: string;
  notes: string | null;
  creatorNote: string | null;
  recurrence: TaskRecurrence;
  deadline: string | null;
  status: TaskStatus;
  createdAt: string;
  endedAt: string | null;
  completedAt: string | null;
  /* For daily tasks: was it already completed for today (creator's local tz)? */
  completedToday?: boolean;
};

export type RelationshipMessageRow = {
  id: string;
  relationshipId: string;
  senderId: string;
  body: string;
  createdAt: string;
  readAt: string | null;
};

export type StreakResponse = {
  current: number;
  longest: number;
  /* 30-day grid: oldest → newest, each entry = "complete" | "miss" | "no_tasks" */
  grid: Array<{
    day: string;
    state: "complete" | "miss" | "no_tasks";
  }>;
};
