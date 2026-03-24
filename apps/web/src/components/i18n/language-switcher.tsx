"use client";

import { cn } from "@/lib/cn";
import type { LocaleChoice } from "@/lib/i18n/messages";
import { useI18n } from "./i18n-provider";

const options: LocaleChoice[] = ["device", "en", "fr", "ar"];

export function LanguageSwitcher({ className }: { className?: string }) {
  const { choice, setChoice, t } = useI18n();

  return (
    <label className={cn("relative inline-flex items-center", className)}>
      <span className="sr-only">Language</span>
      <span className="pointer-events-none absolute left-3 inline-flex h-7 w-7 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
        <svg
          viewBox="0 0 20 20"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          aria-hidden="true"
        >
          <path d="M10 2.4c3.9 0 7.1 3.2 7.1 7.1s-3.2 7.1-7.1 7.1-7.1-3.2-7.1-7.1 3.2-7.1 7.1-7.1z" />
          <path d="M3.4 7.2h13.2" strokeLinecap="round" />
          <path d="M3.4 11.8h13.2" strokeLinecap="round" />
          <path d="M10 2.8c1.7 1.9 2.7 4.2 2.7 6.7s-1 4.8-2.7 6.7c-1.7-1.9-2.7-4.2-2.7-6.7s1-4.8 2.7-6.7z" />
        </svg>
      </span>
      <select
        value={choice}
        onChange={(event) => setChoice(event.target.value as LocaleChoice)}
        className="h-11 min-w-[150px] appearance-none rounded-2xl border border-brand-200/80 bg-white/92 pl-12 pr-10 text-sm font-semibold text-brand-900 shadow-[0_8px_22px_rgba(24,38,31,0.08)] outline-none ring-brand-300 transition focus:ring"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option === "device"
              ? t("lang.device")
              : option === "en"
                ? t("lang.english")
                : option === "fr"
                  ? t("lang.french")
                  : t("lang.arabic")}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-3 inline-flex text-brand-600">
        <svg
          viewBox="0 0 20 20"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          aria-hidden="true"
        >
          <path d="M5.5 7.5l4.5 4.5 4.5-4.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </label>
  );
}
