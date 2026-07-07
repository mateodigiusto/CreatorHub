"use client";

/**
 * Demo-grade Team + Editor-Portal state. LocalStorage only — no backend,
 * no auth, no API calls. This is a self-contained module that powers the
 * roles/editor-portal demo without touching the real DB-backed surfaces.
 *
 * One provider owns: the current acting role (the demo "role switcher"),
 * who "me" is, the team roster, and the task board. Everything persists to
 * localStorage so a refresh keeps the demo state. "Send to Content" writes
 * to a sibling localStorage list the (stubbed) Content page reads.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";

/* ------------------------------------------------------------------ types */

export type DemoRole = "owner" | "admin" | "manager" | "editor";
export type MemberRole = DemoRole | "pending";
export type TaskStatus =
  | "todo"
  | "in_progress"
  | "blocked"
  | "in_review"
  | "done";
export type TaskPriority = "low" | "medium" | "high";
export type TaskFormat = "Reel" | "Carousel" | "Short" | "YouTube";

/** Automatic, computed-on-read status derived from due date + completion.
 *  Separate from the workflow TaskStatus — a task can be in_progress AND overdue. */
export type TimeStatus = "open" | "due_today" | "overdue" | "done";

/** Editor Portal "My Tasks" view modes (segmented switcher). */
export type EditorView = "list" | "board" | "calendar";
export type ViewPref = { view: EditorView };

export type ResourceKind = "footage" | "frameio" | "brand" | "music" | "other";
export type InspoPlatform = "youtube" | "instagram" | "tiktok" | "other";

export type ResourceLink = {
  id: string;
  label: string;
  url: string;
  kind: ResourceKind;
};

export type InspirationLink = {
  id: string;
  title: string;
  url: string;
  platform: InspoPlatform;
};

export type TaskComment = {
  id: string;
  authorId: string;
  authorName: string;
  body: string;
  at: string; // ISO
};

export type TaskSpec = {
  aspectRatio: string; // "9:16"
  targetLength: string; // "≤ 15s"
  captions: boolean;
  exportFormat: string; // "MP4 · H.264 · 1080p"
};

export type Task = {
  id: string;
  title: string;
  client: string;
  assigneeId: string;
  status: TaskStatus;
  priority: TaskPriority;
  format: TaskFormat;
  dueDate: string; // ISO date
  brief: string;
  inspiration: InspirationLink[];
  resources: ResourceLink[];
  specs: TaskSpec;
  comments: TaskComment[];
  deliverableUrl?: string;
  /** Why the editor can't continue — set when status === "blocked". */
  blockerReason?: string;
  /** What the editor needs to get unblocked (optional). */
  blockerNeed?: string;
  /** Workflow status to restore when un-checking "done" from the List view. */
  prevStatus?: TaskStatus;
  sentToContent?: boolean;
  createdAt: string;
};

export type Member = {
  id: string;
  name: string;
  role: MemberRole;
  joinedViaLink?: boolean;
  avatar: string; // gradient css
};

export type DemoContentItem = {
  id: string;
  title: string;
  client: string;
  format: TaskFormat;
  deliverableUrl?: string;
  addedAt: string;
};

type DemoTeamState = {
  role: DemoRole;
  meId: string;
  members: Member[];
  tasks: Task[];
  /** Per-user "My Tasks" view preference, keyed by member id. */
  viewPrefs: Record<string, ViewPref>;
};

/* ------------------------------------------------------------------ utils */

const STORAGE_KEY = "creatorhub-demo-team-v1";
const CONTENT_KEY = "creatorhub-demo-content-v1";

const uid = (p = "id") =>
  `${p}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`;

const AVATARS = [
  "linear-gradient(135deg, #14315E, #0B1F3A)",
  "linear-gradient(135deg, #2563EB, #1D4ED8)",
  "linear-gradient(135deg, #6366F1, #4338CA)",
  "linear-gradient(135deg, #0891B2, #0E7490)",
  "linear-gradient(135deg, #DB2777, #9D174D)",
  "linear-gradient(135deg, #059669, #047857)",
];

/** ISO date `n` days from today (negative = past). */
function dayOffset(n: number): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return d.toISOString();
}

/* -------------------------------------------------------------- seed data */

const MEMBERS: Member[] = [
  { id: "m_owner", name: "You", role: "owner", avatar: AVATARS[0] },
  { id: "m_marco", name: "Marco B.", role: "admin", avatar: AVATARS[1] },
  { id: "m_priya", name: "Priya R.", role: "manager", avatar: AVATARS[2] },
  { id: "m_lena", name: "Lena M.", role: "editor", avatar: AVATARS[4] },
  { id: "m_tomas", name: "Tomas K.", role: "editor", avatar: AVATARS[3] },
  {
    id: "m_sam",
    name: "Sam D.",
    role: "pending",
    joinedViaLink: true,
    avatar: AVATARS[5],
  },
];

const SPEC_REEL: TaskSpec = {
  aspectRatio: "9:16",
  targetLength: "≤ 15s",
  captions: true,
  exportFormat: "MP4 · H.264 · 1080p",
};
const SPEC_YT: TaskSpec = {
  aspectRatio: "16:9",
  targetLength: "8–10 min",
  captions: false,
  exportFormat: "MP4 · H.264 · 4K",
};
const SPEC_CAROUSEL: TaskSpec = {
  aspectRatio: "4:5",
  targetLength: "6–8 slides",
  captions: false,
  exportFormat: "PNG · 1080×1350",
};

function inspo(
  title: string,
  url: string,
  platform: InspoPlatform,
): InspirationLink {
  return { id: uid("ins"), title, url, platform };
}
function res(
  label: string,
  url: string,
  kind: ResourceKind,
): ResourceLink {
  return { id: uid("res"), label, url, kind };
}
function comment(
  authorId: string,
  authorName: string,
  body: string,
  daysAgo: number,
): TaskComment {
  return { id: uid("cmt"), authorId, authorName, body, at: dayOffset(-daysAgo) };
}

const TASKS: Task[] = [
  {
    id: "t_hook12",
    title: "Cut 12s hook variant for June launch Reel",
    client: "June Launch",
    assigneeId: "m_lena",
    status: "in_progress",
    priority: "high",
    format: "Reel",
    dueDate: dayOffset(0),
    brief:
      "We need a punchier opening. Pull the strongest 12 seconds from the raw talking-head and front-load the result statement (\"I went from 0 to 40k in 60 days\"). Hard cuts on the beat, captions burned in, no intro card. Keep energy high — this is the paid-traffic variant.",
    inspiration: [
      inspo("Hook structure ref", "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "youtube"),
      inspo("Pacing we like", "https://www.instagram.com/reel/ref1", "instagram"),
    ],
    resources: [
      res("Raw footage (Drive)", "https://drive.google.com/drive/folders/raw-june", "footage"),
      res("Frame.io review", "https://app.frame.io/projects/june-launch", "frameio"),
      res("Brand kit", "https://drive.google.com/brand-kit", "brand"),
      res("Approved music", "https://drive.google.com/music-bed", "music"),
    ],
    specs: SPEC_REEL,
    comments: [
      comment("m_owner", "You", "First pass looked great — can we tighten the gap at 0:06?", 1),
      comment("m_lena", "Lena M.", "On it. New cut up by EOD.", 0),
    ],
    createdAt: dayOffset(-4),
  },
  {
    id: "t_carousel",
    title: "5-slide carousel: 3 mistakes killing your reach",
    client: "Aria Wellness",
    assigneeId: "m_tomas",
    status: "todo",
    priority: "medium",
    format: "Carousel",
    dueDate: dayOffset(3),
    brief:
      "Educational carousel. Slide 1 = bold claim, slides 2–4 = one mistake each with a fix, slide 5 = CTA to the free guide. Match the brand kit type and the soft navy palette. Keep copy tight — max 12 words per slide.",
    inspiration: [
      inspo("Carousel layout ref", "https://www.instagram.com/p/ref-carousel", "instagram"),
    ],
    resources: [
      res("Copy doc (Drive)", "https://drive.google.com/doc/aria-copy", "footage"),
      res("Brand kit", "https://drive.google.com/aria-brand", "brand"),
    ],
    specs: SPEC_CAROUSEL,
    comments: [],
    createdAt: dayOffset(-2),
  },
  {
    id: "t_overdue",
    title: "Recut testimonial montage — remove client #3",
    client: "FitForge",
    assigneeId: "m_lena",
    status: "blocked",
    priority: "high",
    format: "Reel",
    dueDate: dayOffset(-2),
    brief:
      "Client #3 asked to be removed. Pull them from the montage and re-balance the pacing so it still lands at ~18s. Re-export with the updated end card.",
    inspiration: [],
    resources: [
      res("Raw + project file", "https://drive.google.com/fitforge-montage", "footage"),
      res("Frame.io review", "https://app.frame.io/projects/fitforge", "frameio"),
    ],
    specs: SPEC_REEL,
    blockerReason: "Waiting on the updated end card from the brand team.",
    blockerNeed: "Final end-card export (logo + new tagline) as PNG/MOV",
    comments: [
      comment("m_owner", "You", "This one's overdue — what's blocking?", 1),
      comment(
        "m_lena",
        "Lena M.",
        "Blocked — I can't re-export until I have the updated end card.",
        0,
      ),
    ],
    createdAt: dayOffset(-9),
  },
  {
    id: "t_review1",
    title: "YouTube intro — 8s cold open + title sting",
    client: "Aria Wellness",
    assigneeId: "m_tomas",
    status: "in_review",
    priority: "medium",
    format: "YouTube",
    dueDate: dayOffset(1),
    brief:
      "Cold open before the logo sting. Tease the payoff in the first 8 seconds, then hit the branded title animation. Audio ducked under VO.",
    inspiration: [
      inspo("Cold open ref", "https://www.youtube.com/watch?v=intro-ref", "youtube"),
    ],
    resources: [
      res("Raw footage (Drive)", "https://drive.google.com/aria-yt-raw", "footage"),
      res("Frame.io review", "https://app.frame.io/projects/aria-yt", "frameio"),
      res("Title animation", "https://drive.google.com/title-sting", "other"),
    ],
    specs: SPEC_YT,
    comments: [
      comment("m_tomas", "Tomas K.", "Submitted v2 for review — fixed the audio duck.", 0),
    ],
    deliverableUrl: "https://app.frame.io/reviews/aria-yt-v2",
    createdAt: dayOffset(-6),
  },
  {
    id: "t_review2",
    title: "Short: 3 quick recipes (vertical, captioned)",
    client: "Aria Wellness",
    assigneeId: "m_lena",
    status: "in_review",
    priority: "low",
    format: "Short",
    dueDate: dayOffset(2),
    brief:
      "Three recipes in 30 seconds, vertical, big captions. Snappy transitions between each. End on the handle + 'full recipes in bio'.",
    inspiration: [
      inspo("Recipe short ref", "https://www.tiktok.com/@ref/recipe", "tiktok"),
    ],
    resources: [
      res("Raw clips (Drive)", "https://drive.google.com/aria-recipes", "footage"),
      res("Frame.io review", "https://app.frame.io/projects/aria-recipes", "frameio"),
    ],
    specs: SPEC_REEL,
    comments: [
      comment("m_lena", "Lena M.", "Ready for review — captions timed to the beat.", 1),
    ],
    deliverableUrl: "https://app.frame.io/reviews/aria-recipes",
    createdAt: dayOffset(-5),
  },
  {
    id: "t_done1",
    title: "Reel: behind-the-scenes of the launch shoot",
    client: "June Launch",
    assigneeId: "m_tomas",
    status: "done",
    priority: "medium",
    format: "Reel",
    dueDate: dayOffset(-1),
    brief:
      "Fun, fast BTS of the shoot day. Loose and authentic — quick cuts, trending-adjacent audio, light captions.",
    inspiration: [],
    resources: [
      res("Raw BTS (Drive)", "https://drive.google.com/june-bts", "footage"),
    ],
    specs: SPEC_REEL,
    comments: [
      comment("m_owner", "You", "Love it. Approved ✅", 1),
    ],
    deliverableUrl: "https://app.frame.io/reviews/june-bts-final",
    createdAt: dayOffset(-8),
  },
  {
    id: "t_done2",
    title: "Carousel: client results roundup (Q2)",
    client: "FitForge",
    assigneeId: "m_lena",
    status: "done",
    priority: "low",
    format: "Carousel",
    dueDate: dayOffset(-3),
    brief:
      "Roundup of Q2 client wins. One result per slide, consistent template, final slide CTA to book a call.",
    inspiration: [],
    resources: [
      res("Results doc", "https://drive.google.com/fitforge-q2", "footage"),
      res("Brand kit", "https://drive.google.com/fitforge-brand", "brand"),
    ],
    specs: SPEC_CAROUSEL,
    comments: [],
    deliverableUrl: "https://app.frame.io/reviews/fitforge-q2",
    createdAt: dayOffset(-12),
  },
  {
    id: "t_todo2",
    title: "Reel: 'day in the life' — tighten to 22s",
    client: "FitForge",
    assigneeId: "m_tomas",
    status: "todo",
    priority: "medium",
    format: "Reel",
    dueDate: dayOffset(5),
    brief:
      "We over-shot this one. Cut the 90s assembly down to a tight 22s story arc: wake → train → work → wind down. Keep the best 2 lines of VO.",
    inspiration: [
      inspo("DITL pacing ref", "https://www.instagram.com/reel/ditl-ref", "instagram"),
    ],
    resources: [
      res("Raw footage (Drive)", "https://drive.google.com/fitforge-ditl", "footage"),
      res("Frame.io review", "https://app.frame.io/projects/fitforge-ditl", "frameio"),
    ],
    specs: SPEC_REEL,
    comments: [],
    createdAt: dayOffset(-1),
  },
  {
    id: "t_todo3",
    title: "Short: myth-bust the '10k steps' rule",
    client: "Aria Wellness",
    assigneeId: "m_lena",
    status: "todo",
    priority: "high",
    format: "Short",
    dueDate: dayOffset(4),
    brief:
      "Quick myth-bust. Open with the myth on screen, knock it down with one stat, give the actual takeaway. 20s max, captioned, punchy.",
    inspiration: [
      inspo("Myth-bust format", "https://www.youtube.com/shorts/myth-ref", "youtube"),
    ],
    resources: [
      res("Script + footage", "https://drive.google.com/aria-myth", "footage"),
    ],
    specs: SPEC_REEL,
    comments: [],
    createdAt: dayOffset(0),
  },
];

function seedState(): DemoTeamState {
  return {
    role: "owner",
    meId: "m_owner",
    members: MEMBERS,
    tasks: TASKS,
    viewPrefs: {},
  };
}

/* ------------------------------------------------------------- read/write */

function readState(): DemoTeamState {
  if (typeof window === "undefined") return seedState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedState();
    const parsed = JSON.parse(raw) as Partial<DemoTeamState>;
    if (!parsed.members || !parsed.tasks) return seedState();
    return {
      role: parsed.role ?? "owner",
      meId: parsed.meId ?? "m_owner",
      members: parsed.members,
      tasks: parsed.tasks,
      viewPrefs: parsed.viewPrefs ?? {},
    };
  } catch {
    return seedState();
  }
}

export function readDemoContent(): DemoContentItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CONTENT_KEY);
    return raw ? (JSON.parse(raw) as DemoContentItem[]) : [];
  } catch {
    return [];
  }
}

function writeDemoContent(items: DemoContentItem[]) {
  try {
    localStorage.setItem(CONTENT_KEY, JSON.stringify(items));
  } catch {}
}

/* ----------------------------------------------------------- context api */

export type NewTaskInput = {
  title: string;
  client: string;
  assigneeId: string;
  dueDate: string;
  priority: TaskPriority;
  format: TaskFormat;
  brief: string;
  inspirationUrls: string[];
  resourceUrls: { label: string; url: string; kind: ResourceKind }[];
};

type DemoTeamApi = {
  ready: boolean;
  role: DemoRole;
  meId: string;
  me: Member | undefined;
  members: Member[];
  tasks: Task[];
  /* selectors */
  memberById: (id: string) => Member | undefined;
  myTasks: Task[];
  /* view preference (per user) */
  viewPref: ViewPref;
  setView: (view: EditorView) => void;
  /* role / session */
  setRole: (role: DemoRole) => void;
  actAs: (memberId: string) => void;
  /* tasks */
  addTask: (input: NewTaskInput) => string;
  setTaskStatus: (id: string, status: TaskStatus) => void;
  deleteTask: (id: string) => void;
  setBlocked: (id: string, reason: string, need?: string) => void;
  toggleDone: (id: string) => void;
  addComment: (id: string, body: string) => void;
  attachDeliverable: (id: string, url: string) => void;
  sendToContent: (id: string) => void;
  /* members */
  setMemberRole: (id: string, role: MemberRole) => void;
  removeMember: (id: string) => void;
  /* invite (demo) */
  joinViaLink: (name: string, role: DemoRole) => void;
  resetDemo: () => void;
};

const Ctx = createContext<DemoTeamApi | null>(null);

export function DemoTeamProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoTeamState>(seedState);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setState(readState());
    setReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }, [state, ready]);

  const memberById = useCallback(
    (id: string) => state.members.find((m) => m.id === id),
    [state.members],
  );

  const setRole = useCallback((role: DemoRole) => {
    setState((s) => {
      /* Pick a sensible "me" for the new role: keep current member if its
         role still matches, else snap to the first member with that role. */
      const current = s.members.find((m) => m.id === s.meId);
      if (current && current.role === role) return { ...s, role };
      const fallback =
        s.members.find((m) => m.role === role) ??
        s.members.find((m) => m.id === "m_owner");
      return { ...s, role, meId: fallback?.id ?? s.meId };
    });
  }, []);

  const actAs = useCallback((memberId: string) => {
    setState((s) => {
      const m = s.members.find((x) => x.id === memberId);
      if (!m || m.role === "pending") return s;
      return { ...s, meId: m.id, role: m.role };
    });
  }, []);

  const setView = useCallback((view: EditorView) => {
    setState((s) => ({
      ...s,
      viewPrefs: { ...s.viewPrefs, [s.meId]: { view } },
    }));
  }, []);

  const addTask = useCallback((input: NewTaskInput) => {
    const id = uid("t");
    const specByFormat: Record<TaskFormat, TaskSpec> = {
      Reel: SPEC_REEL,
      Short: SPEC_REEL,
      Carousel: SPEC_CAROUSEL,
      YouTube: SPEC_YT,
    };
    const task: Task = {
      id,
      title: input.title,
      client: input.client,
      assigneeId: input.assigneeId,
      status: "todo",
      priority: input.priority,
      format: input.format,
      dueDate: input.dueDate,
      brief: input.brief,
      inspiration: input.inspirationUrls
        .filter((u) => u.trim())
        .map((u) => inspo(u, u, "other")),
      resources: input.resourceUrls
        .filter((r) => r.url.trim())
        .map((r) => res(r.label || "Link", r.url, r.kind)),
      specs: specByFormat[input.format],
      comments: [],
      createdAt: new Date().toISOString(),
    };
    setState((s) => ({ ...s, tasks: [task, ...s.tasks] }));
    return id;
  }, []);

  const setTaskStatus = useCallback((id: string, status: TaskStatus) => {
    setState((s) => ({
      ...s,
      tasks: s.tasks.map((t) =>
        t.id === id
          ? status === "blocked"
            ? { ...t, status }
            : { ...t, status, blockerReason: undefined, blockerNeed: undefined }
          : t,
      ),
    }));
  }, []);

  const deleteTask = useCallback((id: string) => {
    setState((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== id) }));
  }, []);

  const setBlocked = useCallback(
    (id: string, reason: string, need?: string) => {
      setState((s) => ({
        ...s,
        tasks: s.tasks.map((t) =>
          t.id === id
            ? {
                ...t,
                status: "blocked",
                blockerReason: reason,
                blockerNeed: need?.trim() ? need.trim() : undefined,
              }
            : t,
        ),
      }));
    },
    [],
  );

  /** Quick "mark done" toggle (List-view checkbox). Marking done remembers the
   *  prior workflow status; un-checking restores it (falls back to In progress
   *  for tasks completed elsewhere). Going done clears any blocker. */
  const toggleDone = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      tasks: s.tasks.map((t) => {
        if (t.id !== id) return t;
        if (t.status === "done") {
          return { ...t, status: t.prevStatus ?? "in_progress", prevStatus: undefined };
        }
        return {
          ...t,
          status: "done",
          prevStatus: t.status,
          blockerReason: undefined,
          blockerNeed: undefined,
        };
      }),
    }));
  }, []);

  const addComment = useCallback((id: string, body: string) => {
    setState((s) => {
      const me = s.members.find((m) => m.id === s.meId);
      const c: TaskComment = {
        id: uid("cmt"),
        authorId: s.meId,
        authorName: me?.name ?? "You",
        body,
        at: new Date().toISOString(),
      };
      return {
        ...s,
        tasks: s.tasks.map((t) =>
          t.id === id ? { ...t, comments: [...t.comments, c] } : t,
        ),
      };
    });
  }, []);

  const attachDeliverable = useCallback((id: string, url: string) => {
    setState((s) => ({
      ...s,
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, deliverableUrl: url } : t)),
    }));
  }, []);

  const sendToContent = useCallback((id: string) => {
    setState((s) => {
      const task = s.tasks.find((t) => t.id === id);
      if (task && !task.sentToContent) {
        const items = readDemoContent();
        items.unshift({
          id: uid("dc"),
          title: task.title,
          client: task.client,
          format: task.format,
          deliverableUrl: task.deliverableUrl,
          addedAt: new Date().toISOString(),
        });
        writeDemoContent(items);
      }
      return {
        ...s,
        tasks: s.tasks.map((t) =>
          t.id === id ? { ...t, sentToContent: true } : t,
        ),
      };
    });
  }, []);

  const setMemberRole = useCallback((id: string, role: MemberRole) => {
    setState((s) => {
      // The Owner cannot be demoted (spec: Admin cannot remove/demote the Owner).
      if (s.members.find((m) => m.id === id)?.role === "owner") return s;
      return {
        ...s,
        members: s.members.map((m) => (m.id === id ? { ...m, role } : m)),
      };
    });
  }, []);

  const removeMember = useCallback((id: string) => {
    setState((s) => {
      // The Owner cannot be removed.
      if (s.members.find((m) => m.id === id)?.role === "owner") return s;
      const viewPrefs = { ...s.viewPrefs };
      delete viewPrefs[id];
      return { ...s, members: s.members.filter((m) => m.id !== id), viewPrefs };
    });
  }, []);

  const joinViaLink = useCallback((name: string, role: DemoRole) => {
    setState((s) => {
      const id = uid("m");
      const member: Member = {
        id,
        name: name.trim() || "New teammate",
        role,
        joinedViaLink: true,
        avatar: AVATARS[s.members.length % AVATARS.length],
      };
      return { ...s, members: [...s.members, member], meId: id, role };
    });
  }, []);

  const resetDemo = useCallback(() => {
    try {
      localStorage.removeItem(CONTENT_KEY);
    } catch {}
    setState(seedState());
  }, []);

  const me = state.members.find((m) => m.id === state.meId);
  const myTasks = state.tasks.filter((t) => t.assigneeId === state.meId);
  const viewPref: ViewPref = state.viewPrefs[state.meId] ?? { view: "list" };

  const api: DemoTeamApi = {
    ready,
    role: state.role,
    meId: state.meId,
    me,
    members: state.members,
    tasks: state.tasks,
    memberById,
    myTasks,
    viewPref,
    setView,
    setRole,
    actAs,
    addTask,
    setTaskStatus,
    deleteTask,
    setBlocked,
    toggleDone,
    addComment,
    attachDeliverable,
    sendToContent,
    setMemberRole,
    removeMember,
    joinViaLink,
    resetDemo,
  };

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useDemoTeam() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useDemoTeam must be used inside DemoTeamProvider");
  return v;
}

/* ------------------------------------------------------------ display map */

export const ROLE_LABEL: Record<MemberRole, string> = {
  owner: "Owner",
  admin: "Admin",
  manager: "Manager",
  editor: "Editor",
  pending: "Pending",
};

export const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: "To do",
  in_progress: "In progress",
  blocked: "Blocked",
  in_review: "In review",
  done: "Done",
};

/** Editor-Portal column titles (warmer, editor-facing wording). */
export const EDITOR_COLUMN_LABEL: Record<TaskStatus, string> = {
  todo: "Idea / Assigned",
  in_progress: "In Progress",
  blocked: "Blocked",
  in_review: "Review",
  done: "Complete",
};

export const STATUS_ORDER: TaskStatus[] = [
  "todo",
  "in_progress",
  "blocked",
  "in_review",
  "done",
];

export const STATUS_TONE: Record<
  TaskStatus,
  "neutral" | "blue" | "amber" | "green" | "violet"
> = {
  todo: "neutral",
  in_progress: "blue",
  blocked: "amber",
  in_review: "violet",
  done: "green",
};

export const PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

/** Roles that can see the whole CreatorHub app (vs editor = portal only). */
export function hasFullAppAccess(role: DemoRole): boolean {
  return role === "owner" || role === "admin" || role === "manager";
}

/** Computed time-status (separate from workflow status). Done wins; then
 *  overdue / due-today / open by comparing the due date to today. */
export function timeStatus(task: { status: TaskStatus; dueDate: string }): TimeStatus {
  if (task.status === "done") return "done";
  const d = daysUntilDue(task.dueDate);
  if (d < 0) return "overdue";
  if (d === 0) return "due_today";
  return "open";
}

export const TIME_STATUS_LABEL: Record<TimeStatus, string> = {
  overdue: "Overdue",
  due_today: "Due today",
  open: "Open",
  done: "Done",
};

export const TIME_STATUS_ORDER: TimeStatus[] = [
  "overdue",
  "due_today",
  "open",
  "done",
];

/** Whole days until a due date (negative = overdue). */
export function daysUntilDue(iso: string): number {
  const due = new Date(iso);
  const now = new Date();
  const startOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.round((startOfDay(due) - startOfDay(now)) / 86400000);
}

/** Friendly relative due-date label + overdue flag. */
export function dueLabel(iso: string): { text: string; overdue: boolean } {
  const due = new Date(iso);
  const now = new Date();
  const startOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round(
    (startOfDay(due) - startOfDay(now)) / 86400000,
  );
  if (diffDays < 0)
    return {
      text: diffDays === -1 ? "Due yesterday" : `${Math.abs(diffDays)} days overdue`,
      overdue: true,
    };
  if (diffDays === 0) return { text: "Due today", overdue: false };
  if (diffDays === 1) return { text: "Due tomorrow", overdue: false };
  if (diffDays <= 7) return { text: `Due in ${diffDays} days`, overdue: false };
  return {
    text: `Due ${due.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`,
    overdue: false,
  };
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
