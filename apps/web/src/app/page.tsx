"use client";

import Link from "next/link";
import { useState } from "react";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { useI18n } from "@/components/i18n/i18n-provider";
import { SiteFooter } from "@/components/layout/site-footer";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClassName } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const popularPrompts = [
  "landing.prompt.quietCasablanca",
  "landing.prompt.safeRabat",
  "landing.prompt.lowAllergyParks",
  "landing.prompt.rentCommute",
] as const;

const searchModes = [
  { key: "landing.tab.buy", value: "buy" },
  { key: "landing.tab.rent", value: "rent" },
  { key: "landing.tab.invest", value: "invest" },
  { key: "landing.tab.auction", value: "sell" },
] as const;

const featureCards = [
  {
    titleKey: "landing.card.agentsTitle",
    bodyKey: "landing.card.agentsText",
    href: "/listings",
    tone:
      "bg-[radial-gradient(circle_at_85%_15%,rgba(58,114,87,0.18),transparent_22%),linear-gradient(135deg,#eff7f2_0%,#dcebe1_100%)]",
  },
  {
    titleKey: "landing.card.driveTitle",
    bodyKey: "landing.card.driveText",
    href: "/onboarding",
    tone:
      "bg-[radial-gradient(circle_at_82%_18%,rgba(31,157,85,0.14),transparent_20%),linear-gradient(135deg,#eef5ff_0%,#dce9ff_100%)]",
  },
  {
    titleKey: "landing.card.mapTitle",
    bodyKey: "landing.card.mapText",
    href: "/zones",
    tone:
      "bg-[radial-gradient(circle_at_90%_18%,rgba(245,158,11,0.16),transparent_18%),linear-gradient(135deg,#f5fbff_0%,#d9edf6_100%)]",
  },
] as const;

const insights = [
  {
    titleKey: "landing.insight.aiTitle",
    bodyKey: "landing.insight.aiText",
    href: "/zones",
  },
  {
    titleKey: "landing.insight.agentTitle",
    bodyKey: "landing.insight.agentText",
    href: "/listings",
  },
  {
    titleKey: "landing.insight.marketTitle",
    bodyKey: "landing.insight.marketText",
    href: "/compare",
  },
] as const;

function MoroccoMarketPreview() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[linear-gradient(145deg,#eff5f0_0%,#d9e4ec_52%,#edf4fb_100%)]">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.18)_1px,transparent_1px)] bg-[size:42px_42px] opacity-50" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_24%,rgba(31,157,85,0.12),transparent_18%),radial-gradient(circle_at_82%_20%,rgba(12,139,199,0.1),transparent_22%),radial-gradient(circle_at_65%_72%,rgba(245,158,11,0.1),transparent_18%)]" />

      <svg
        viewBox="0 0 1000 700"
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="moroccoFill" x1="0%" x2="100%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="#dcebe1" />
            <stop offset="100%" stopColor="#bcd2c1" />
          </linearGradient>
          <filter id="mapShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="14" stdDeviation="18" floodColor="#29443a" floodOpacity="0.16" />
          </filter>
        </defs>

        <path
          d="M288 98c37-23 88-24 131-10 36 12 60 38 93 50 36 13 78 12 108 38 28 24 51 65 46 102-5 37-36 66-66 94-25 22-41 51-67 72-39 31-96 49-149 46-62-4-120-34-151-79-24-34-31-75-46-112-12-29-36-53-54-80-18-29-17-70 4-99 31-42 92-48 151-58z"
          fill="url(#moroccoFill)"
          stroke="#8ea99a"
          strokeWidth="9"
          strokeLinejoin="round"
          filter="url(#mapShadow)"
        />

        <path
          d="M326 158c48 26 82 59 111 113"
          stroke="#ffffff"
          strokeWidth="9"
          strokeLinecap="round"
          opacity="0.86"
        />
        <path
          d="M302 218c53 25 89 67 110 118"
          stroke="#bfd0c5"
          strokeWidth="8"
          strokeLinecap="round"
          opacity="0.9"
        />
        <path
          d="M380 162c33 17 64 34 95 68"
          stroke="#ffffff"
          strokeWidth="7"
          strokeLinecap="round"
          opacity="0.82"
        />
        <path
          d="M412 234c54-10 104-2 149 20"
          stroke="#ffffff"
          strokeWidth="7"
          strokeLinecap="round"
          opacity="0.76"
        />
        <path
          d="M428 286c38 20 70 50 93 86"
          stroke="#bfd0c5"
          strokeWidth="6"
          strokeLinecap="round"
          opacity="0.9"
        />

        <path
          d="M262 408c80-20 149-23 228-9"
          stroke="#c4d6e3"
          strokeWidth="6"
          strokeLinecap="round"
          opacity="0.6"
        />
        <path
          d="M520 148c74 8 134 29 199 67"
          stroke="#c4d6e3"
          strokeWidth="5"
          strokeLinecap="round"
          opacity="0.55"
        />

        <circle cx="402" cy="204" r="19" fill="#1f9d55" stroke="#ffffff" strokeWidth="5" />
        <circle cx="470" cy="242" r="16" fill="#f59e0b" stroke="#ffffff" strokeWidth="5" />
        <circle cx="560" cy="286" r="16" fill="#dc2626" stroke="#ffffff" strokeWidth="5" />
        <circle cx="420" cy="312" r="15" fill="#f59e0b" stroke="#ffffff" strokeWidth="5" />
        <circle cx="617" cy="334" r="18" fill="#1f9d55" stroke="#ffffff" strokeWidth="5" />

        <circle cx="402" cy="204" r="4" fill="#ffffff" opacity="0.9" />
        <circle cx="470" cy="242" r="4" fill="#ffffff" opacity="0.9" />
        <circle cx="560" cy="286" r="4" fill="#ffffff" opacity="0.9" />
        <circle cx="420" cy="312" r="4" fill="#ffffff" opacity="0.9" />
        <circle cx="617" cy="334" r="4" fill="#ffffff" opacity="0.9" />
      </svg>

      <div className="absolute bottom-8 left-8 right-8">
        <div className="inline-flex flex-wrap items-center gap-2 rounded-2xl border border-white/70 bg-white/82 px-4 py-3 backdrop-blur">
          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
            Green = best
          </span>
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
            Yellow = medium
          </span>
          <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-800">
            Red = risk watch
          </span>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const { t } = useI18n();
  const [selectedGoal, setSelectedGoal] =
    useState<(typeof searchModes)[number]["value"]>("buy");
  const [searchMode, setSearchMode] = useState<"guided" | "ai">("guided");
  const [query, setQuery] = useState("");

  return (
    <div id="top" className="min-h-screen">
      <div className="border-b border-brand-200/70 bg-white/72">
        <div className="mx-auto flex w-full max-w-[1700px] flex-wrap items-center justify-between gap-3 px-4 py-3 text-xs font-semibold text-brand-700 md:px-6">
          <div className="flex flex-wrap items-center gap-4">
            <LanguageSwitcher className="text-xs" />
            <Link href="/download" className="hover:text-brand-900">
              {t("landing.utility.download")}
            </Link>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <a href="#popular-searches" className="hover:text-brand-900">
              {t("landing.utility.saved")}
            </a>
            <Link href="/login" className="text-brand-900">
              {t("action.signIn")}
            </Link>
          </div>
        </div>
      </div>

      <header className="sticky top-0 z-30 border-b border-brand-200/80 bg-white/88 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1700px] flex-wrap items-center justify-between gap-4 px-4 py-4 md:px-6">
          <Link
            href="/"
            className="font-[family-name:var(--font-heading)] text-4xl text-brand-900"
          >
            {t("app.name")}
          </Link>

          <nav className="hidden items-center gap-5 text-sm font-semibold text-brand-800 lg:flex">
            <Link href="/zones" className="hover:text-brand-900">
              {t("nav.zones")}
            </Link>
            <Link href="/listings" className="hover:text-brand-900">
              {t("nav.listings")}
            </Link>
            <Link href="/messages" className="hover:text-brand-900">
              {t("nav.messages")}
            </Link>
            <Link href="/compare" className="hover:text-brand-900">
              {t("nav.compare")}
            </Link>
          </nav>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/login"
              className={buttonClassName("outline", "md", "rounded-2xl")}
            >
              {t("action.signIn")}
            </Link>
            <Link
              href="/listings"
              className={buttonClassName("primary", "md", "rounded-2xl")}
            >
              {t("action.postListing")}
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1700px] px-4 py-6 md:px-6 md:py-8">
        <section className="relative overflow-hidden rounded-[2rem] border border-brand-200/70">
          <img
            src="https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1800&q=80"
            alt="Modern living room"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(13,19,16,0.68),rgba(13,19,16,0.26),rgba(13,19,16,0.44))]" />

          <div className="relative px-5 py-8 md:px-8 md:py-10 lg:px-12 lg:py-12">
            <div className="max-w-3xl text-white">
              <Badge tone="neutral">{t("landing.badge")}</Badge>
              <h1 className="mt-4 font-[family-name:var(--font-heading)] text-5xl leading-tight text-white md:text-6xl">
                {t("landing.heroTitle")}
              </h1>
              <p className="mt-3 max-w-2xl text-base text-white/86 md:text-lg">
                {t("landing.heroSubtitle")}
              </p>
            </div>

            <div className="mt-8 max-w-5xl rounded-[1.75rem] border border-white/12 bg-white/92 p-4 shadow-panel backdrop-blur md:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  {searchModes.map((mode) => (
                    <button
                      key={mode.key}
                      type="button"
                      onClick={() => setSelectedGoal(mode.value)}
                      className={
                        selectedGoal === mode.value
                          ? "rounded-2xl bg-brand-700 px-4 py-2 text-sm font-semibold text-white"
                          : "rounded-2xl border border-brand-200 bg-white px-4 py-2 text-sm font-semibold text-brand-800"
                      }
                    >
                      {t(mode.key)}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSearchMode("guided")}
                    className={
                      searchMode === "guided"
                        ? "rounded-2xl bg-brand-700 px-4 py-2 text-sm font-semibold text-white"
                        : "rounded-2xl border border-brand-200 bg-white px-4 py-2 text-sm font-semibold text-brand-800"
                    }
                  >
                    {t("landing.mode.guided")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSearchMode("ai")}
                    className={
                      searchMode === "ai"
                        ? "rounded-2xl bg-brand-700 px-4 py-2 text-sm font-semibold text-white"
                        : "rounded-2xl border border-brand-200 bg-white px-4 py-2 text-sm font-semibold text-brand-800"
                    }
                  >
                    {t("landing.mode.ai")}
                  </button>
                </div>
              </div>

              <form
                action="/zones"
                className={
                  searchMode === "ai"
                    ? "mt-4 grid gap-3 lg:grid-cols-[1fr_auto]"
                    : "mt-4 grid gap-3 lg:grid-cols-[1fr_auto]"
                }
              >
                <input type="hidden" name="goal" value={selectedGoal} />
                <div className="space-y-2">
                  <Input
                    name="aiQuery"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={
                      searchMode === "ai"
                        ? t("landing.aiPlaceholder")
                        : t("landing.searchPlaceholder")
                    }
                    className="h-14 rounded-2xl bg-white"
                  />
                  <p className="text-xs font-medium text-brand-700">
                    {searchMode === "ai"
                      ? t("landing.aiHelp")
                      : t("landing.guidedHelp")}
                  </p>
                </div>
                <Button type="submit" size="lg" className="h-14 rounded-2xl">
                  {searchMode === "ai"
                    ? t("action.searchAi")
                    : t("landing.searchButton")}
                </Button>
              </form>

              <div className="mt-4 flex flex-wrap gap-2">
                {popularPrompts.map((key) => (
                  <Link
                    key={key}
                    href={`/zones?aiQuery=${encodeURIComponent(t(key))}`}
                    className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-800 hover:bg-brand-100"
                  >
                    {t(key)}
                  </Link>
                ))}
              </div>

              <div className="mt-4 grid gap-3 border-t border-brand-100 pt-4 md:grid-cols-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-600">
                    {t("landing.stat.zones")}
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-brand-900">147</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-600">
                    {t("landing.stat.agents")}
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-brand-900">38</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-600">
                    {t("landing.stat.liveListings")}
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-brand-900">2,420</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-3">
          {featureCards.map((card) => (
            <Link key={card.titleKey} href={card.href}>
              <Card
                className={`h-full rounded-[1.75rem] border-brand-200/70 p-6 transition hover:-translate-y-0.5 ${card.tone}`}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">
                  {t("landing.featureLabel")}
                </p>
                <h2 className="mt-4 text-3xl font-semibold text-brand-900">
                  {t(card.titleKey)}
                </h2>
                <p className="mt-3 text-sm text-brand-800 md:text-base">
                  {t(card.bodyKey)}
                </p>
                <p className="mt-6 text-sm font-semibold text-brand-900">
                  {t("landing.learnMore")}
                </p>
              </Card>
            </Link>
          ))}
        </section>

        <section className="mt-6 overflow-hidden rounded-[2rem] border border-brand-200/70 bg-[linear-gradient(90deg,#0c8bc7_0%,#4cb7de_38%,#c9eef8_100%)]">
          <div className="grid gap-0 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="px-6 py-8 text-white md:px-8 md:py-10">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                {t("landing.bannerLabel")}
              </p>
              <h2 className="mt-4 font-[family-name:var(--font-heading)] text-4xl text-white md:text-5xl">
                {t("landing.bannerTitle")}
              </h2>
              <p className="mt-3 max-w-xl text-sm text-white/88 md:text-base">
                {t("landing.bannerText")}
              </p>
              <Link
                href="/zones"
                className={buttonClassName("outline", "lg", "mt-6 rounded-2xl border-white/25 bg-white text-brand-900 hover:bg-brand-50")}
              >
                {t("landing.bannerAction")}
              </Link>
            </div>

            <div className="relative min-h-[300px]">
              <img
                src="https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1400&q=80"
                alt="Property tour preview"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-l from-transparent via-[#0c8bc7]/20 to-[#0c8bc7]/35" />
            </div>
          </div>
        </section>

        <section className="mt-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">
                {t("landing.insightsLabel")}
              </p>
              <h2 className="mt-2 font-[family-name:var(--font-heading)] text-4xl text-brand-900">
                {t("landing.insightsTitle")}
              </h2>
            </div>
            <Link
              href="/zones"
              className={buttonClassName("ghost", "md", "rounded-2xl border border-brand-200")}
            >
              {t("action.exploreZones")}
            </Link>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            {insights.map((insight, index) => (
              <Link key={insight.titleKey} href={insight.href}>
                <Card className="h-full rounded-[1.75rem] border-brand-200/70 p-5 transition hover:-translate-y-0.5">
                  <div className="relative mb-5 aspect-[16/9] overflow-hidden rounded-[1.25rem] border border-brand-100">
                    <img
                      src={
                        index === 0
                          ? "https://images.unsplash.com/photo-1460317442991-0ec209397118?auto=format&fit=crop&w=900&q=80"
                          : index === 1
                            ? "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=900&q=80"
                            : "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=900&q=80"
                      }
                      alt={t(insight.titleKey)}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <h3 className="text-2xl font-semibold text-brand-900">
                    {t(insight.titleKey)}
                  </h3>
                  <p className="mt-3 text-sm text-brand-700 md:text-base">
                    {t(insight.bodyKey)}
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        <section
          id="popular-searches"
          className="mt-8 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]"
        >
          <Card className="rounded-[2rem] border-brand-200/70 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">
              {t("landing.popularLabel")}
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-brand-900">
              {t("landing.popularTitle")}
            </h2>
            <div className="mt-5 grid gap-5 md:grid-cols-3">
              <div>
                <p className="text-sm font-semibold text-brand-900">
                  {t("listing.apartment")}
                </p>
                <div className="mt-3 space-y-2 text-sm text-brand-700">
                  <Link href="/zones?aiQuery=apartment+rent+casablanca" className="block hover:text-brand-900">
                    {t("landing.popular.apartment1")}
                  </Link>
                  <Link href="/zones?aiQuery=apartment+buy+rabat" className="block hover:text-brand-900">
                    {t("landing.popular.apartment2")}
                  </Link>
                  <Link href="/zones?aiQuery=apartment+sale+tangier" className="block hover:text-brand-900">
                    {t("landing.popular.apartment3")}
                  </Link>
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-brand-900">
                  {t("listing.villa")}
                </p>
                <div className="mt-3 space-y-2 text-sm text-brand-700">
                  <Link href="/zones?aiQuery=villa+buy+rabat" className="block hover:text-brand-900">
                    {t("landing.popular.villa1")}
                  </Link>
                  <Link href="/zones?aiQuery=villa+rent+marrakech" className="block hover:text-brand-900">
                    {t("landing.popular.villa2")}
                  </Link>
                  <Link href="/zones?aiQuery=villa+invest+agadir" className="block hover:text-brand-900">
                    {t("landing.popular.villa3")}
                  </Link>
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-brand-900">
                  {t("landing.popular.other")}
                </p>
                <div className="mt-3 space-y-2 text-sm text-brand-700">
                  <Link href="/zones?aiQuery=studio+rent+casablanca" className="block hover:text-brand-900">
                    {t("landing.popular.other1")}
                  </Link>
                  <Link href="/zones?aiQuery=land+buy+fes" className="block hover:text-brand-900">
                    {t("landing.popular.other2")}
                  </Link>
                  <Link href="/zones?aiQuery=house+sale+tangier" className="block hover:text-brand-900">
                    {t("landing.popular.other3")}
                  </Link>
                </div>
              </div>
            </div>
          </Card>

          <Card className="rounded-[2rem] border-brand-200/70 p-0 overflow-hidden">
            <div className="relative min-h-[100%]">
              <MoroccoMarketPreview />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(18,29,24,0.08)_0%,rgba(18,29,24,0.18)_36%,rgba(18,29,24,0.78)_100%)]" />
              <div className="relative flex min-h-[360px] items-end p-6 md:p-8">
                <div className="max-w-xl rounded-[1.75rem] border border-white/10 bg-brand-900/58 p-5 text-white shadow-panel backdrop-blur-sm">
                  <Badge tone="success" className="self-start">
                    {t("landing.liveScoring")}
                  </Badge>
                  <h2 className="mt-3 text-3xl font-semibold text-white">
                    {t("landing.mapPanelTitle")}
                  </h2>
                  <p className="mt-3 text-sm text-white/82">
                    {t("landing.mapPanelText")}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Link
                      href="/zones"
                      className={buttonClassName("primary", "md", "rounded-2xl")}
                    >
                      {t("action.exploreZones")}
                    </Link>
                    <Link
                      href="/onboarding"
                      className={buttonClassName(
                        "outline",
                        "md",
                        "rounded-2xl border-white/20 bg-white/10 text-white hover:bg-white/15",
                      )}
                    >
                      {t("action.startOnboarding")}
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
