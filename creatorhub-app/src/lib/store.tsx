"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import type { Profile } from "@/lib/onboarding/types";
import {
  readProfile,
  writeProfile,
  clearProfile as clearProfileStorage,
} from "@/lib/onboarding/persistence";

type Theme = "light" | "dark";

/** Editor "acting as" client context — when set, /content + /calendar
 *  + (in time) other surfaces re-scope to the client's data instead of
 *  the editor's own. Persisted in sessionStorage so refreshes within a
 *  tab keep the active client; cleared when the tab closes. */
export type CurrentClient = {
  /** Relationship row id (NOT the client's user_id — keeping this opaque
   *  forces every API route to re-verify membership server-side). */
  relationshipId: string;
  /** Counterparty display name, cached so the banner renders without
   *  another fetch on every navigation. */
  name: string;
};

type AppState = {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  profile: Profile | null;
  setProfile: (p: Profile) => void;
  clearProfile: () => void;
  toast: { id: number; message: string } | null;
  showToast: (message: string) => void;
  currentClient: CurrentClient | null;
  setCurrentClient: (c: CurrentClient | null) => void;
};

const Ctx = createContext<AppState | null>(null);
const THEME_KEY = "creatorhub-theme";
const CURRENT_CLIENT_KEY = "creatorhub-current-client";

function readInitialTheme(): Theme {
  if (typeof document === "undefined") return "light";
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "dark" || attr === "light") return attr;
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "dark" || stored === "light") return stored;
  } catch {}
  return "light";
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [profile, setProfileState] = useState<Profile | null>(null);
  const [toast, setToast] = useState<{ id: number; message: string } | null>(
    null
  );
  const [currentClient, setCurrentClientState] = useState<CurrentClient | null>(null);

  // Hydrate theme + profile + current client on mount. Theme + profile
  // come from localStorage (cross-session); currentClient from
  // sessionStorage (cleared when tab closes — stale "acting as" state
  // across days would be confusing).
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setThemeState(readInitialTheme());
    setProfileState(readProfile());
    try {
      const raw = sessionStorage.getItem(CURRENT_CLIENT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CurrentClient;
        if (parsed && typeof parsed.relationshipId === "string" && typeof parsed.name === "string") {
          setCurrentClientState(parsed);
        }
      }
    } catch {}
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  /* Authoritative profile lives in Postgres for signed-in users. Fetch
     once on mount; if the server has a profile we overwrite the local
     copy (cross-device consistency). 401 / no profile → keep localStorage
     so unauthenticated visitors still get personalization. */
  useEffect(() => {
    let cancelled = false;
    fetch("/api/profile", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { profile: Profile | null } | null) => {
        if (cancelled || !data?.profile) return;
        setProfileState(data.profile);
        writeProfile(data.profile);
        if (typeof document !== "undefined") {
          document.documentElement.setAttribute("data-onboarded", "true");
        }
      })
      .catch(() => {
        /* offline / network blip — localStorage copy stands. */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", t);
      try {
        localStorage.setItem(THEME_KEY, t);
      } catch {}
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  const setProfile = useCallback((p: Profile) => {
    setProfileState(p);
    writeProfile(p);
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-onboarded", "true");
    }
  }, []);

  const clearProfile = useCallback(() => {
    setProfileState(null);
    clearProfileStorage();
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-onboarded", "false");
    }
  }, []);

  const setCurrentClient = useCallback((c: CurrentClient | null) => {
    setCurrentClientState(c);
    try {
      if (c) sessionStorage.setItem(CURRENT_CLIENT_KEY, JSON.stringify(c));
      else sessionStorage.removeItem(CURRENT_CLIENT_KEY);
    } catch {}
  }, []);

  const showToast = useCallback((message: string) => {
    const id = Date.now();
    setToast({ id, message });
    setTimeout(() => {
      setToast((curr) => (curr?.id === id ? null : curr));
    }, 2800);
  }, []);

  return (
    <Ctx.Provider
      value={{
        theme,
        setTheme,
        toggleTheme,
        profile,
        setProfile,
        clearProfile,
        toast,
        showToast,
        currentClient,
        setCurrentClient,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAppState() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAppState must be used inside AppStateProvider");
  return v;
}
