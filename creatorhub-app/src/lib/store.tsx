"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import { Post } from "@/lib/mock/types";
import { Asset } from "@/lib/mock/story";
import type { Profile } from "@/lib/onboarding/types";
import {
  readProfile,
  writeProfile,
  clearProfile as clearProfileStorage,
} from "@/lib/onboarding/persistence";

type Theme = "light" | "dark";

type AppState = {
  connected: boolean;
  setConnected: (v: boolean) => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  extraPosts: Post[];
  appendContentItem: (post: Post) => void;
  extraAssets: Asset[];
  appendAsset: (asset: Asset) => void;
  profile: Profile | null;
  setProfile: (p: Profile) => void;
  clearProfile: () => void;
  toast: { id: number; message: string } | null;
  showToast: (message: string) => void;
};

const Ctx = createContext<AppState | null>(null);
const THEME_KEY = "creatorhub-theme";

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
  const [connected, setConnected] = useState(true);
  const [theme, setThemeState] = useState<Theme>("light");
  const [extraPosts, setExtraPosts] = useState<Post[]>([]);
  const [extraAssets, setExtraAssets] = useState<Asset[]>([]);
  const [profile, setProfileState] = useState<Profile | null>(null);
  const [toast, setToast] = useState<{ id: number; message: string } | null>(
    null
  );

  // Hydrate theme + profile from localStorage on mount. Cannot use useState
  // lazy init: server can't read localStorage, would mismatch.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setThemeState(readInitialTheme());
    setProfileState(readProfile());
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  /* Authoritative profile lives in Postgres for signed-in users. Fetch
     once on mount; if the server has a profile we overwrite the local
     copy (cross-device consistency). 401 / no profile → keep localStorage
     so demo / unauthenticated visitors still get personalization. */
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

  const appendContentItem = useCallback((post: Post) => {
    setExtraPosts((prev) => [post, ...prev]);
  }, []);

  const appendAsset = useCallback((asset: Asset) => {
    setExtraAssets((prev) => [asset, ...prev]);
  }, []);

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
        connected,
        setConnected,
        theme,
        setTheme,
        toggleTheme,
        extraPosts,
        appendContentItem,
        extraAssets,
        appendAsset,
        profile,
        setProfile,
        clearProfile,
        toast,
        showToast,
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
