"use client";

import Link from "next/link";
import { useI18n } from "@/components/i18n/i18n-provider";
import { buttonClassName } from "@/components/ui/button";

interface SiteFooterProps {
  compact?: boolean;
}

export function SiteFooter({ compact = false }: SiteFooterProps) {
  const { t } = useI18n();

  return (
    <div className="mt-10">
      {!compact ? (
        <section className="mx-auto w-full max-w-[1700px] overflow-hidden rounded-[2rem] border border-brand-200/70 bg-[radial-gradient(circle_at_75%_20%,rgba(58,114,87,0.12),transparent_26%),linear-gradient(135deg,#e7f1ec_0%,#d9e8e1_48%,#eef5f0_100%)] px-5 py-8 md:px-8">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                {t("footer.downloadTitle")}
              </p>
              <h2 className="mt-3 font-[family-name:var(--font-heading)] text-4xl text-brand-900 md:text-5xl">
                {t("footer.trustTitle")}
              </h2>
              <p className="mt-3 max-w-2xl text-sm text-brand-800 md:text-base">
                {t("footer.downloadText")}
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/download#ios"
                  className={buttonClassName("primary", "md", "rounded-2xl")}
                >
                  {t("footer.appStore")}
                </Link>
                <Link
                  href="/download#android"
                  className={buttonClassName("outline", "md", "rounded-2xl")}
                >
                  {t("footer.googlePlay")}
                </Link>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.5rem] border border-white/70 bg-white/88 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-600">
                  {t("footer.product")}
                </p>
                <p className="mt-2 text-lg font-semibold text-brand-900">
                  {t("footer.trustTitle")}
                </p>
                <p className="mt-1 text-sm text-brand-700">
                  {t("footer.trustText")}
                </p>
              </div>

              <div className="rounded-[1.5rem] border border-white/70 bg-white/88 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-600">
                  {t("footer.country")}
                </p>
                <p className="mt-2 text-lg font-semibold text-brand-900">
                  Morocco
                </p>
                <p className="mt-1 text-sm text-brand-700">
                  Casablanca, Rabat, Tangier, Marrakech, Agadir, Fes and more.
                </p>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <footer className="mt-0 bg-[#0d1310] text-white">
        <div className="mx-auto w-full max-w-[1700px] px-4 py-8 md:px-6 md:py-10">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr]">
            <div>
              <Link
                href="/"
                className="font-[family-name:var(--font-heading)] text-3xl text-white"
              >
                {t("app.name")}
              </Link>
              <p className="mt-3 max-w-md text-sm text-white/72">
                {t("footer.trustText")}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href="/zones"
                  className={buttonClassName(
                    "outline",
                    "sm",
                    "rounded-2xl border-white/20 bg-white/5 text-white hover:bg-white/10",
                  )}
                >
                  {t("nav.zones")}
                </Link>
                <Link
                  href="/listings"
                  className={buttonClassName(
                    "outline",
                    "sm",
                    "rounded-2xl border-white/20 bg-white/5 text-white hover:bg-white/10",
                  )}
                >
                  {t("nav.listings")}
                </Link>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/55">
                {t("footer.product")}
              </p>
              <div className="mt-3 space-y-2 text-sm text-white/80">
                <Link href="/zones" className="block hover:text-white">
                  {t("nav.zones")}
                </Link>
                <Link href="/compare" className="block hover:text-white">
                  {t("nav.compare")}
                </Link>
                <Link href="/tcl" className="block hover:text-white">
                  {t("nav.tcl")}
                </Link>
                <Link href="/listings" className="block hover:text-white">
                  {t("nav.listings")}
                </Link>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/55">
                {t("footer.company")}
              </p>
              <div className="mt-3 space-y-2 text-sm text-white/80">
                <Link href="/messages" className="block hover:text-white">
                  {t("nav.messages")}
                </Link>
                <Link href="/onboarding" className="block hover:text-white">
                  {t("nav.onboarding")}
                </Link>
                <Link href="/settings" className="block hover:text-white">
                  {t("nav.settings")}
                </Link>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/55">
                {t("footer.support")}
              </p>
              <div className="mt-3 space-y-2 text-sm text-white/80">
                <a href="mailto:support@homemall.ma" className="block hover:text-white">
                  support@homemall.ma
                </a>
                <a href="tel:+212600000000" className="block hover:text-white">
                  +212 600 000 000
                </a>
                <Link href="/login" className="block hover:text-white">
                  {t("action.signIn")}
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 border-t border-white/10 pt-5 text-sm text-white/55 md:flex-row md:items-center md:justify-between">
            <p>{t("footer.copy")}</p>
            <div className="flex flex-wrap items-center gap-4">
              <Link href="/privacy" className="hover:text-white">
                {t("footer.privacy")}
              </Link>
              <a href="#top" className="hover:text-white">
                {t("footer.backToTop")}
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
