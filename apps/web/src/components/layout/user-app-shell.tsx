"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { useI18n } from "@/components/i18n/i18n-provider";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { SiteFooter } from "@/components/layout/site-footer";

const mainNav = [
  { labelKey: "nav.zones", href: "/zones" },
  { labelKey: "nav.onboarding", href: "/onboarding" },
  { labelKey: "nav.tcl", href: "/tcl" },
  { labelKey: "nav.settings", href: "/settings" },
] as const;

const secondaryNav = [
  { labelKey: "nav.listings", href: "/listings" },
  { labelKey: "nav.messages", href: "/messages" },
  { labelKey: "nav.compare", href: "/compare" },
] as const;

const userRootPaths = [
  "/zones",
  "/onboarding",
  "/tcl",
  "/settings",
  "/compare",
  "/listings",
  "/messages",
  "/agents",
] as const;

const matchesPath = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(`${href}/`);

const shouldRenderShell = (pathname: string) =>
  userRootPaths.some((route) => matchesPath(pathname, route));

export function UserAppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  const { t } = useI18n();

  if (!shouldRenderShell(pathname)) {
    return <>{children}</>;
  }

  return (
    <div id="top" className="min-h-screen pb-20 md:pb-0">
      <header className="sticky top-0 z-40 px-3 py-3 md:px-5">
        <div className="mx-auto flex w-full max-w-[1700px] items-center justify-between gap-4 rounded-[1.75rem] border border-brand-200/80 bg-white/82 px-4 py-3 shadow-panel backdrop-blur md:px-6">
          <Link
            href="/zones"
            className="font-[family-name:var(--font-heading)] text-3xl text-brand-900"
          >
            {t("app.name")}
          </Link>

          <nav className="hidden items-center gap-2 md:flex">
            {mainNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm font-semibold transition",
                  matchesPath(pathname, item.href)
                    ? "bg-brand-700 text-white"
                    : "border border-brand-200 bg-white text-brand-800 hover:bg-brand-100",
                )}
              >
                {t(item.labelKey)}
              </Link>
            ))}
          </nav>

          <nav className="hidden items-center gap-2 lg:flex">
            {secondaryNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm font-semibold transition",
                  matchesPath(pathname, item.href)
                    ? "bg-brand-600 text-white"
                    : "border border-brand-200 bg-white text-brand-800 hover:bg-brand-100",
                )}
              >
                {t(item.labelKey)}
              </Link>
            ))}
          </nav>

          <LanguageSwitcher />
        </div>
      </header>

      {children}

      <SiteFooter compact />

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-brand-200 bg-white/96 px-2 py-2 backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-xl grid-cols-4 gap-2">
          {mainNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-xl px-3 py-2 text-center text-xs font-semibold",
                matchesPath(pathname, item.href)
                  ? "bg-brand-700 text-white"
                  : "border border-brand-200 bg-brand-50 text-brand-800",
              )}
            >
              {t(item.labelKey)}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
