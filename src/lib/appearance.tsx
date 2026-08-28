import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type ThemeMode = "light" | "dark";
export type Intensity = "vibrant" | "calm";

type AppearanceValue = {
  theme: ThemeMode;
  setTheme: (t: ThemeMode) => void;
  intensity: Intensity;
  setIntensity: (i: Intensity) => void;
  colorBlind: boolean;
  setColorBlind: (v: boolean) => void;
};

const AppearanceContext = createContext<AppearanceValue | null>(null);
const KEY = "ssa.appearance";

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>("light");
  const [intensity, setIntensityState] = useState<Intensity>("vibrant");
  const [colorBlind, setColorBlindState] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) {
        const p = JSON.parse(raw) as Partial<AppearanceValue>;
        if (p.theme === "dark" || p.theme === "light") setThemeState(p.theme);
        if (p.intensity === "calm" || p.intensity === "vibrant") setIntensityState(p.intensity);
        if (typeof p.colorBlind === "boolean") setColorBlindState(p.colorBlind);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const el = document.documentElement;
    el.classList.toggle("dark", theme === "dark");
    el.classList.toggle("calm", intensity === "calm");
    el.classList.toggle("cb-safe", colorBlind);
    try {
      window.localStorage.setItem(KEY, JSON.stringify({ theme, intensity, colorBlind }));
    } catch {
      /* ignore */
    }
  }, [theme, intensity, colorBlind]);

  const value = useMemo(
    () => ({
      theme,
      setTheme: setThemeState,
      intensity,
      setIntensity: setIntensityState,
      colorBlind,
      setColorBlind: setColorBlindState,
    }),
    [theme, intensity, colorBlind],
  );

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

export function useAppearance(): AppearanceValue {
  const ctx = useContext(AppearanceContext);
  if (!ctx) throw new Error("useAppearance must be used inside AppearanceProvider");
  return ctx;
}

/** Small helper so components can react to appearance without prop drilling. */
export function useIsColorBlind(): boolean {
  return useAppearance().colorBlind;
}

export const noop = useCallback;
