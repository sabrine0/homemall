"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { LocaleChoice, ResolvedLocale } from "@/lib/i18n/messages";
import { localeMessages, resolveLocaleFromDevice } from "@/lib/i18n/messages";

interface I18nContextValue {
  choice: LocaleChoice;
  locale: ResolvedLocale;
  setChoice: (choice: LocaleChoice) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);
const STORAGE_KEY = "homemall_locale_choice";

const readStoredChoice = (): LocaleChoice | null => {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (
      saved === "en" ||
      saved === "fr" ||
      saved === "ar" ||
      saved === "device"
    ) {
      return saved;
    }
  } catch {
    // Ignore storage read failures (e.g. private mode restrictions).
  }
  return null;
};

const persistChoice = (choice: LocaleChoice) => {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, choice);
  } catch {
    // Ignore storage write failures.
  }
};

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const initializedRef = useRef(false);
  const [choice, setChoiceState] = useState<LocaleChoice>("device");
  const [locale, setLocale] = useState<ResolvedLocale>("en");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    let effectiveChoice = choice;
    if (!initializedRef.current) {
      initializedRef.current = true;
      effectiveChoice = readStoredChoice() ?? choice;

      if (effectiveChoice !== choice) {
        setChoiceState(effectiveChoice);
      }
    }

    const deviceLanguage =
      window.navigator.languages?.[0] ?? window.navigator.language;
    const nextLocale =
      effectiveChoice === "device"
        ? resolveLocaleFromDevice(deviceLanguage)
        : effectiveChoice;

    setLocale((current) => (current === nextLocale ? current : nextLocale));
    persistChoice(effectiveChoice);

    document.documentElement.lang = nextLocale;
    document.documentElement.dir = nextLocale === "ar" ? "rtl" : "ltr";
  }, [choice]);

  useEffect(() => {
    if (typeof window === "undefined" || choice !== "device") {
      return;
    }

    const handleLanguageChange = () => {
      const deviceLanguage =
        window.navigator.languages?.[0] ?? window.navigator.language;
      const nextLocale = resolveLocaleFromDevice(deviceLanguage);
      setLocale(nextLocale);
      document.documentElement.lang = nextLocale;
      document.documentElement.dir = nextLocale === "ar" ? "rtl" : "ltr";
    };

    window.addEventListener("languagechange", handleLanguageChange);
    return () =>
      window.removeEventListener("languagechange", handleLanguageChange);
  }, [choice]);

  const setChoice = useCallback((nextChoice: LocaleChoice) => {
    setChoiceState(nextChoice);
  }, []);

  const t = useCallback(
    (key: string): string => {
      return localeMessages[locale][key] ?? localeMessages.en[key] ?? key;
    },
    [locale],
  );

  const value = useMemo<I18nContextValue>(
    () => ({
      choice,
      locale,
      setChoice,
      t,
    }),
    [choice, locale, setChoice, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used inside I18nProvider.");
  }
  return context;
};
