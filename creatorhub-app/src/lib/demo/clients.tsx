"use client";

/**
 * Demo-grade Clients + Revenue + self-tasks state. LocalStorage only — no
 * backend, no auth, no API calls. Sibling to `lib/demo/team.tsx`: that module
 * owns the team roster + task board; this one owns the owner's business view
 * (clients you bill, payments you've collected, and your own tasks/check-ins).
 *
 * Work-in-progress per client is NOT stored here — it's derived in the UI by
 * matching the team board's `task.client` name, so the two demos stay in sync
 * without duplicating task data.
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

export type ClientStatus = "active" | "onboarding" | "paused";
export type Cadence = "monthly" | "one_time";
export type PaymentKind = "retainer" | "one_off";

export type OnboardingStep = { id: string; label: string; done: boolean };

export type Client = {
  id: string;
  name: string;
  company?: string;
  contactEmail?: string;
  retainer: number; // whole dollars
  cadence: Cadence;
  startDate: string; // ISO
  status: ClientStatus;
  avatar: string; // gradient css
  onboarding: OnboardingStep[];
  notes?: string;
};

export type Payment = {
  id: string;
  clientId: string;
  amount: number;
  date: string; // ISO
  kind: PaymentKind;
  note?: string;
};

export type SelfKind = "task" | "checkin";
export type SelfItem = {
  id: string;
  kind: SelfKind;
  title: string;
  done: boolean;
  due?: string; // ISO (tasks only)
  at: string; // ISO created
};

type ClientsState = {
  clients: Client[];
  payments: Payment[];
  self: SelfItem[];
};

/* ------------------------------------------------------------------ utils */

const STORAGE_KEY = "creatorhub-demo-clients-v1";

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

function monthsAgoISO(n: number): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setMonth(d.getMonth() - n);
  return d.toISOString();
}

function defaultOnboarding(allDone = false): OnboardingStep[] {
  return [
    { id: uid("ob"), label: "Kickoff call booked", done: allDone },
    { id: uid("ob"), label: "Contract signed", done: allDone },
    { id: uid("ob"), label: "Brand assets received", done: allDone },
    { id: uid("ob"), label: "Access & logins shared", done: allDone },
    { id: uid("ob"), label: "First deliverable scheduled", done: allDone },
  ];
}

/** Generate the monthly retainer payments a client would have paid from their
 *  start date up to now (inclusive of the current month). */
function retainerPayments(client: Client): Payment[] {
  if (client.cadence !== "monthly" || client.status === "onboarding") return [];
  const out: Payment[] = [];
  const start = new Date(client.startDate);
  const now = new Date();
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1, 12);
  while (cursor <= now) {
    out.push({
      id: uid("pay"),
      clientId: client.id,
      amount: client.retainer,
      date: new Date(cursor.getFullYear(), cursor.getMonth(), 2, 12).toISOString(),
      kind: "retainer",
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return out;
}

/* -------------------------------------------------------------- seed data */

function seedState(): ClientsState {
  const clients: Client[] = [
    {
      id: "c_aria",
      name: "Aria Wellness",
      company: "Aria Wellness Co.",
      contactEmail: "maya@ariawellness.com",
      retainer: 2500,
      cadence: "monthly",
      startDate: monthsAgoISO(5),
      status: "active",
      avatar: AVATARS[4],
      onboarding: defaultOnboarding(true),
    },
    {
      id: "c_fitforge",
      name: "FitForge",
      company: "FitForge Studios",
      contactEmail: "reece@fitforge.io",
      retainer: 1800,
      cadence: "monthly",
      startDate: monthsAgoISO(3),
      status: "active",
      avatar: AVATARS[3],
      onboarding: defaultOnboarding(true),
    },
    {
      id: "c_june",
      name: "June Launch",
      company: "June Co.",
      contactEmail: "hello@june.co",
      retainer: 3200,
      cadence: "monthly",
      startDate: monthsAgoISO(2),
      status: "active",
      avatar: AVATARS[1],
      onboarding: defaultOnboarding(true),
    },
    {
      id: "c_nord",
      name: "Nord Coffee",
      company: "Nord Coffee Roasters",
      contactEmail: "ida@nordcoffee.no",
      retainer: 1500,
      cadence: "monthly",
      startDate: monthsAgoISO(0),
      status: "onboarding",
      avatar: AVATARS[2],
      onboarding: [
        { id: uid("ob"), label: "Kickoff call booked", done: true },
        { id: uid("ob"), label: "Contract signed", done: true },
        { id: uid("ob"), label: "Brand assets received", done: false },
        { id: uid("ob"), label: "Access & logins shared", done: false },
        { id: uid("ob"), label: "First deliverable scheduled", done: false },
      ],
    },
  ];

  const payments: Payment[] = clients.flatMap(retainerPayments);
  // A couple of one-off project fees to make the graph feel real.
  payments.push(
    {
      id: uid("pay"),
      clientId: "c_june",
      amount: 1200,
      date: monthsAgoISO(1),
      kind: "one_off",
      note: "Launch week rush edit",
    },
    {
      id: uid("pay"),
      clientId: "c_aria",
      amount: 800,
      date: monthsAgoISO(2),
      kind: "one_off",
      note: "Extra carousel pack",
    },
  );

  const self: SelfItem[] = [
    { id: uid("s"), kind: "task", title: "Send FitForge the Q3 proposal", done: false, due: monthsAgoISO(0), at: monthsAgoISO(0) },
    { id: uid("s"), kind: "task", title: "Review Nord Coffee brand assets", done: false, due: monthsAgoISO(0), at: monthsAgoISO(0) },
    { id: uid("s"), kind: "task", title: "Invoice Aria for extra carousel pack", done: true, at: monthsAgoISO(0) },
    { id: uid("s"), kind: "checkin", title: "Weekly check-in: 3 launches this week, pipeline healthy.", done: false, at: monthsAgoISO(0) },
  ];

  return { clients, payments, self };
}

/* ------------------------------------------------------------- read/write */

function readState(): ClientsState {
  if (typeof window === "undefined") return seedState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedState();
    const parsed = JSON.parse(raw) as Partial<ClientsState>;
    if (!parsed.clients || !parsed.payments) return seedState();
    return {
      clients: parsed.clients,
      payments: parsed.payments,
      self: parsed.self ?? [],
    };
  } catch {
    return seedState();
  }
}

/* ----------------------------------------------------------- context api */

export type NewClientInput = {
  name: string;
  company?: string;
  contactEmail?: string;
  retainer: number;
  cadence: Cadence;
  startDate: string;
  status: ClientStatus;
};

type ClientsApi = {
  ready: boolean;
  clients: Client[];
  payments: Payment[];
  self: SelfItem[];
  clientById: (id: string) => Client | undefined;
  paymentsForClient: (id: string) => Payment[];
  /* clients */
  addClient: (input: NewClientInput) => string;
  setClientStatus: (id: string, status: ClientStatus) => void;
  toggleOnboardingStep: (clientId: string, stepId: string) => void;
  removeClient: (id: string) => void;
  /* payments */
  logPayment: (p: { clientId: string; amount: number; date: string; note?: string }) => void;
  /* self tasks */
  addSelfTask: (title: string, due?: string) => void;
  addCheckIn: (title: string) => void;
  toggleSelfItem: (id: string) => void;
  removeSelfItem: (id: string) => void;
  resetClients: () => void;
};

const Ctx = createContext<ClientsApi | null>(null);

export function ClientsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ClientsState>(seedState);
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

  const clientById = useCallback(
    (id: string) => state.clients.find((c) => c.id === id),
    [state.clients],
  );
  const paymentsForClient = useCallback(
    (id: string) =>
      state.payments
        .filter((p) => p.clientId === id)
        .sort((a, b) => +new Date(b.date) - +new Date(a.date)),
    [state.payments],
  );

  const addClient = useCallback((input: NewClientInput) => {
    const id = uid("c");
    setState((s) => {
      const client: Client = {
        id,
        name: input.name.trim() || "New client",
        company: input.company?.trim() || undefined,
        contactEmail: input.contactEmail?.trim() || undefined,
        retainer: Math.max(0, Math.round(input.retainer) || 0),
        cadence: input.cadence,
        startDate: input.startDate,
        status: input.status,
        avatar: AVATARS[s.clients.length % AVATARS.length],
        onboarding: defaultOnboarding(input.status === "active"),
      };
      const payments =
        input.status === "active" ? retainerPayments(client) : [];
      return {
        ...s,
        clients: [...s.clients, client],
        payments: [...s.payments, ...payments],
      };
    });
    return id;
  }, []);

  const setClientStatus = useCallback((id: string, status: ClientStatus) => {
    setState((s) => ({
      ...s,
      clients: s.clients.map((c) => (c.id === id ? { ...c, status } : c)),
    }));
  }, []);

  const toggleOnboardingStep = useCallback(
    (clientId: string, stepId: string) => {
      setState((s) => ({
        ...s,
        clients: s.clients.map((c) =>
          c.id === clientId
            ? {
                ...c,
                onboarding: c.onboarding.map((o) =>
                  o.id === stepId ? { ...o, done: !o.done } : o,
                ),
              }
            : c,
        ),
      }));
    },
    [],
  );

  const removeClient = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      clients: s.clients.filter((c) => c.id !== id),
      payments: s.payments.filter((p) => p.clientId !== id),
    }));
  }, []);

  const logPayment = useCallback(
    (p: { clientId: string; amount: number; date: string; note?: string }) => {
      setState((s) => ({
        ...s,
        payments: [
          {
            id: uid("pay"),
            clientId: p.clientId,
            amount: Math.max(0, Math.round(p.amount) || 0),
            date: p.date,
            kind: "one_off",
            note: p.note?.trim() || undefined,
          },
          ...s.payments,
        ],
      }));
    },
    [],
  );

  const addSelfTask = useCallback((title: string, due?: string) => {
    if (!title.trim()) return;
    setState((s) => ({
      ...s,
      self: [
        { id: uid("s"), kind: "task", title: title.trim(), done: false, due, at: new Date().toISOString() },
        ...s.self,
      ],
    }));
  }, []);

  const addCheckIn = useCallback((title: string) => {
    if (!title.trim()) return;
    setState((s) => ({
      ...s,
      self: [
        { id: uid("s"), kind: "checkin", title: title.trim(), done: false, at: new Date().toISOString() },
        ...s.self,
      ],
    }));
  }, []);

  const toggleSelfItem = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      self: s.self.map((i) => (i.id === id ? { ...i, done: !i.done } : i)),
    }));
  }, []);

  const removeSelfItem = useCallback((id: string) => {
    setState((s) => ({ ...s, self: s.self.filter((i) => i.id !== id) }));
  }, []);

  const resetClients = useCallback(() => setState(seedState()), []);

  const api: ClientsApi = {
    ready,
    clients: state.clients,
    payments: state.payments,
    self: state.self,
    clientById,
    paymentsForClient,
    addClient,
    setClientStatus,
    toggleOnboardingStep,
    removeClient,
    logPayment,
    addSelfTask,
    addCheckIn,
    toggleSelfItem,
    removeSelfItem,
    resetClients,
  };

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useClients() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useClients must be used inside ClientsProvider");
  return v;
}

/* ------------------------------------------------------------ selectors */

export const CLIENT_STATUS_LABEL: Record<ClientStatus, string> = {
  active: "Active",
  onboarding: "Onboarding",
  paused: "Paused",
};

export const CLIENT_STATUS_TONE: Record<
  ClientStatus,
  "green" | "blue" | "neutral"
> = {
  active: "green",
  onboarding: "blue",
  paused: "neutral",
};

export function formatMoney(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-US");
}

/** Monthly recurring revenue = sum of active monthly retainers. */
export function mrr(clients: Client[]): number {
  return clients
    .filter((c) => c.status === "active" && c.cadence === "monthly")
    .reduce((sum, c) => sum + c.retainer, 0);
}

export function totalCollected(payments: Payment[]): number {
  return payments.reduce((sum, p) => sum + p.amount, 0);
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}`;
}

export function thisMonthCollected(payments: Payment[]): number {
  const key = monthKey(new Date());
  return payments
    .filter((p) => monthKey(new Date(p.date)) === key)
    .reduce((sum, p) => sum + p.amount, 0);
}

export type RevenuePoint = { x?: string; y: number };

/** Revenue grouped by month for the last `months` months, oldest → newest.
 *  x-labels are short month names; the current month is last. */
export function monthlyRevenueSeries(
  payments: Payment[],
  months = 8,
): RevenuePoint[] {
  const now = new Date();
  const buckets: { label: string; key: string; total: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      label: d.toLocaleDateString("en-US", { month: "short" }),
      key: monthKey(d),
      total: 0,
    });
  }
  const index = new Map(buckets.map((b, i) => [b.key, i]));
  for (const p of payments) {
    const i = index.get(monthKey(new Date(p.date)));
    if (i !== undefined) buckets[i].total += p.amount;
  }
  return buckets.map((b, i) => ({
    x: i === 0 || i === buckets.length - 1 || i % 2 === 0 ? b.label : undefined,
    y: b.total,
  }));
}
