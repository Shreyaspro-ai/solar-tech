import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DICTS, RTL_LANGS, type Dict, type LangCode } from "./locales";

type I18nValue = {
  lang: LangCode;
  setLang: (l: LangCode) => void;
  dir: "ltr" | "rtl";
  t: (key: keyof Dict, vars?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nValue | null>(null);
const STORAGE_KEY = "ssa.lang";

function interpolate(template: string, vars?: Record<string, string | number>) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`));
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LangCode>("en");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as LangCode | null;
    if (stored && stored in DICTS) setLangState(stored);
  }, []);

  const dir: "ltr" | "rtl" = RTL_LANGS.includes(lang) ? "rtl" : "ltr";

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  const setLang = useCallback((l: LangCode) => {
    setLangState(l);
    try {
      window.localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
  }, []);

  const t = useCallback(
    (key: keyof Dict, vars?: Record<string, string | number>) => interpolate(DICTS[lang][key], vars),
    [lang],
  );

  const value = useMemo(() => ({ lang, setLang, dir, t }), [lang, setLang, dir, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
