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
  const [toast, setToast] = useState<{ id: number; message: string } | null>(
    null
  );

  // Hydrate theme from <html data-theme> set by the pre-paint script.
  // Cannot use useState lazy init: server can't read localStorage, would mismatch.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setThemeState(readInitialTheme());
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
