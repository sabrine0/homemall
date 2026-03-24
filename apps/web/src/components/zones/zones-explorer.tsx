"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  AISearchResponse,
  Goal,
  ListingOffer,
  ListingTypeCounts,
  ListingsResponse,
  UserProfileInput,
  ZoneSummary,
} from "@homemall/shared";
import { clientApi } from "@/lib/client-api";
import { cn } from "@/lib/cn";
import { getScoreRange, getScoreTierInfo, withAlpha } from "@/lib/score-tier";
import { CopilotDrawer } from "@/components/copilot/copilot-drawer";
import { useI18n } from "@/components/i18n/i18n-provider";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClassName } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Input } from "@/components/ui/input";
import { StatCard } from "@/components/ui/stat-card";
import { formatCurrency } from "@/lib/format";
import { getLocalizedCityName, getLocalizedZoneName } from "@/lib/location-labels";

const ZonesMap = dynamic(
  () => import("@/components/map/zones-map").then((mod) => mod.ZonesMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-[50vh] min-h-[320px] rounded-3xl border border-brand-200 bg-brand-50" />
    ),
  },
);

interface ZonesExplorerProps {
  initialZones: ZoneSummary[];
  isAuthenticated: boolean;
  initialAiQuery?: string;
  initialGoal?: Goal;
}

interface AnalyzeResponse {
  recommendations: Array<{
    zoneId: string;
    score: {
      total: number;
    };
  }>;
}

type SortOption = "Score" | "Name" | "City";
type PriorityKey =
  | "quiet"
  | "green"
  | "safe"
  | "lowAllergy"
  | "nearSchools"
  | "nearGym"
  | "shopping"
  | "parks";

interface BudgetRange {
  min: number;
  max: number;
}

const goalOptions: Goal[] = ["rent", "buy", "sell", "invest", "build"];
const sortOptions: SortOption[] = ["Score", "Name", "City"];
const transportOptions = ["walk", "car", "transit"] as const;
const priorities = [
  { key: "quiet", labelKey: "priority.quiet" },
  { key: "green", labelKey: "priority.green" },
  { key: "safe", labelKey: "priority.safe" },
  { key: "lowAllergy", labelKey: "priority.lowAllergy" },
  { key: "nearSchools", labelKey: "priority.nearSchools" },
  { key: "nearGym", labelKey: "priority.nearGym" },
  { key: "shopping", labelKey: "priority.shopping" },
  { key: "parks", labelKey: "priority.parks" },
] as const;

const listingTypeKeys: Array<keyof Omit<ListingTypeCounts, "total">> = [
  "apartment",
  "house",
  "studio",
  "villa",
  "land",
];

const activeListingPurpose = (goal: Goal): "rent" | "buy" | "all" => {
  if (goal === "rent") return "rent";
  if (goal === "buy" || goal === "sell") return "buy";
  return "all";
};

const emptyTypeCounts = (): Omit<ListingTypeCounts, "total"> => ({
  apartment: 0,
  house: 0,
  studio: 0,
  villa: 0,
  land: 0,
});

const getLiveZoneListingCounts = (
  zoneId: string,
  purpose: "rent" | "buy" | "all",
  liveListings?: ListingOffer[],
) => {
  if (!liveListings?.length) {
    return null;
  }

  const counts = emptyTypeCounts();
  let total = 0;

  liveListings.forEach((listing) => {
    if (listing.zoneId !== zoneId) {
      return;
    }

    if (purpose !== "all" && listing.purpose !== purpose) {
      return;
    }

    counts[listing.type] += 1;
    total += 1;
  });

  if (total === 0) {
    return null;
  }

  return { total, counts };
};

const getZoneListingCounts = (
  zone: ZoneSummary,
  purpose: "rent" | "buy" | "all",
  liveListings?: ListingOffer[],
) => {
  const liveCounts = getLiveZoneListingCounts(zone.id, purpose, liveListings);
  if (liveCounts) {
    return liveCounts;
  }

  const inventory = zone.listingInventory;
  if (!inventory) {
    return {
      total: 0,
      counts: emptyTypeCounts(),
    };
  }

  if (purpose === "rent" || purpose === "buy") {
    const selected = inventory[purpose];
    return {
      total: selected.total,
      counts: {
        apartment: selected.apartment,
        house: selected.house,
        studio: selected.studio,
        villa: selected.villa,
        land: selected.land,
      },
    };
  }

  return {
    total: inventory.total,
    counts: {
      apartment: inventory.rent.apartment + inventory.buy.apartment,
      house: inventory.rent.house + inventory.buy.house,
      studio: inventory.rent.studio + inventory.buy.studio,
      villa: inventory.rent.villa + inventory.buy.villa,
      land: inventory.rent.land + inventory.buy.land,
    },
  };
};

const buildGuestProfile = (
  goal: Goal,
  budgetRange: BudgetRange,
  transport: string[],
  selectedPriorities: PriorityKey[],
): UserProfileInput => {
  return {
    goal,
    budgetMin: budgetRange.min,
    budgetMax: budgetRange.max,
    workLat: 33.5731,
    workLng: -7.5898,
    mobilityModes: transport.length ? transport : ["walk"],
    sensitivities: {
      noise: selectedPriorities.includes("quiet") ? 4 : 2,
      heat: selectedPriorities.includes("green") ? 2 : 3,
      allergies: selectedPriorities.includes("lowAllergy") ? 4 : 2,
    },
  };
};

const matchesPriority = (
  zone: ZoneSummary,
  selectedPriorities: PriorityKey[],
) => {
  if (!selectedPriorities.length) {
    return true;
  }

  return selectedPriorities.every((priority) => {
    if (priority === "quiet") return zone.flags.quiet;
    if (priority === "safe") return !zone.flags.floodRiskHigh;
    if (priority === "lowAllergy") return zone.flags.allergyFriendly;
    if (priority === "green")
      return zone.flags.quiet || zone.flags.allergyFriendly;
    if (priority === "nearSchools")
      return zone.flags.transitFriendly || zone.flags.quiet;
    if (priority === "nearGym")
      return zone.flags.transitFriendly || zone.flags.quiet;
    if (priority === "shopping")
      return zone.flags.transitFriendly || zone.flags.quiet;
    if (priority === "parks")
      return zone.flags.transitFriendly || zone.flags.quiet;
    return true;
  });
};

const buildZonePreviewFallback = (zone: ZoneSummary) => {
  const lat = zone.centerLat.toFixed(4);
  const lng = zone.centerLng.toFixed(4);
  return `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=13&size=900x520&markers=${lat},${lng},red-pushpin`;
};

const resolveZonePreviewImage = (zone: ZoneSummary) => {
  if (typeof zone.imageUrl === "string" && zone.imageUrl.trim().length > 0) {
    return zone.imageUrl.trim();
  }
  return buildZonePreviewFallback(zone);
};

export function ZonesExplorer({
  initialZones,
  isAuthenticated,
  initialAiQuery,
  initialGoal,
}: ZonesExplorerProps) {
  const { t, locale } = useI18n();
  const [search, setSearch] = useState("");
  const [goal, setGoal] = useState<Goal>(initialGoal ?? "rent");
  const [sortBy, setSortBy] = useState<SortOption>("Score");
  const [budgetRange, setBudgetRange] = useState<BudgetRange>({
    min: 3000,
    max: 12000,
  });
  const [commuteMax, setCommuteMax] = useState<number>(45);
  const [transport, setTransport] = useState<string[]>(["walk", "transit"]);
  const [selectedPriorities, setSelectedPriorities] = useState<PriorityKey[]>(
    [],
  );
  const [analyzedScores, setAnalyzedScores] = useState<Map<string, number>>(
    new Map(),
  );
  const [selectedZone, setSelectedZone] = useState<ZoneSummary | null>(
    initialZones[0] ?? null,
  );
  const [copilotOpen, setCopilotOpen] = useState(false);

  const [aiQuery, setAiQuery] = useState(initialAiQuery ?? "");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiResponse, setAiResponse] = useState<AISearchResponse | null>(null);
  const [liveListings, setLiveListings] = useState<ListingOffer[]>([]);
  const autoRunRef = useRef(false);
  const listingPurpose = activeListingPurpose(goal);

  const copilotContext = useMemo(
    () => buildGuestProfile(goal, budgetRange, transport, selectedPriorities),
    [goal, budgetRange, transport, selectedPriorities],
  );

  useEffect(() => {
    const timeout = setTimeout(async () => {
      try {
        const profile = buildGuestProfile(
          goal,
          budgetRange,
          transport,
          selectedPriorities,
        );
        const response = await clientApi<AnalyzeResponse>(
          "/api/analyze/zones",
          {
            method: "POST",
            body: JSON.stringify({ profile }),
          },
        );

        const nextScores = new Map<string, number>();
        response.recommendations.forEach((item) => {
          nextScores.set(item.zoneId, item.score.total);
        });
        setAnalyzedScores(nextScores);
      } catch {
        // Keep baseline zone scores when analysis endpoint is unavailable.
      }
    }, 250);

    return () => clearTimeout(timeout);
  }, [goal, budgetRange, transport, selectedPriorities, commuteMax]);

  useEffect(() => {
    let cancelled = false;

    const loadListings = async () => {
      try {
        const params = new URLSearchParams({
          limit: "100",
        });

        if (listingPurpose !== "all") {
          params.set("purpose", listingPurpose);
        }

        const response = await clientApi<ListingsResponse>(
          `/api/listings?${params.toString()}`,
        );

        if (!cancelled) {
          setLiveListings(response.listings);
        }
      } catch {
        if (!cancelled) {
          setLiveListings([]);
        }
      }
    };

    void loadListings();

    return () => {
      cancelled = true;
    };
  }, [listingPurpose]);

  const runAiSearch = async (rawQuery?: string) => {
    const query = (rawQuery ?? aiQuery).trim();
    if (query.length < 2) {
      setAiError(t("results.queryTooShort"));
      return;
    }

    setAiLoading(true);
    setAiError(null);
    try {
      const response = await clientApi<AISearchResponse>("/api/search/ai", {
        method: "POST",
        body: JSON.stringify({
          query,
          constraints: {
            goal,
            budgetMin: budgetRange.min,
            budgetMax: budgetRange.max,
            quiet: selectedPriorities.includes("quiet"),
            safe: selectedPriorities.includes("safe"),
            lowAllergy: selectedPriorities.includes("lowAllergy"),
            maxCommuteMinutes: commuteMax,
            limit: 40,
          },
        }),
      });
      setAiResponse(response);
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "AI search failed.");
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    if (!initialAiQuery || autoRunRef.current) {
      return;
    }
    autoRunRef.current = true;
    void runAiSearch(initialAiQuery);
  }, [initialAiQuery]);

  const aiResultMap = useMemo(
    () =>
      new Map(
        (aiResponse?.results ?? []).map((result) => [
          result.zoneId,
          {
            score: result.score.total,
            reasons: result.reasons,
            tclMonthly: result.tcl.monthlyTotal,
          },
        ]),
      ),
    [aiResponse],
  );

  const zones = useMemo(() => {
    return initialZones.map((zone) => {
      const aiResult = aiResultMap.get(zone.id);
      return {
        ...zone,
        overallScore:
          aiResult?.score ?? analyzedScores.get(zone.id) ?? zone.overallScore,
      };
    });
  }, [aiResultMap, analyzedScores, initialZones]);

  const filteredZones = useMemo(() => {
    const q = search.toLowerCase().trim();
    const nextZones = zones
      .filter((zone) => {
        if (!q) return true;
        return (
          zone.name.toLowerCase().includes(q) ||
          zone.city.toLowerCase().includes(q)
        );
      })
      .filter((zone) => matchesPriority(zone, selectedPriorities));

    if (sortBy === "Name") {
      return nextZones.sort((a, b) => a.name.localeCompare(b.name));
    }
    if (sortBy === "City") {
      return nextZones.sort((a, b) => a.city.localeCompare(b.city));
    }
    return nextZones.sort((a, b) => b.overallScore - a.overallScore);
  }, [zones, search, selectedPriorities, sortBy]);

  const scoreRange = useMemo(
    () => getScoreRange(filteredZones.map((zone) => zone.overallScore)),
    [filteredZones],
  );

  const bestScore = useMemo(() => {
    if (!filteredZones.length) return "--";
    const max = filteredZones.reduce(
      (highest, zone) => Math.max(highest, zone.overallScore),
      filteredZones[0].overallScore,
    );
    return max.toFixed(1);
  }, [filteredZones]);

  const totalVisibleListings = useMemo(
    () =>
      filteredZones.reduce(
        (sum, zone) =>
          sum + getZoneListingCounts(zone, listingPurpose, liveListings).total,
        0,
      ),
    [filteredZones, listingPurpose, liveListings],
  );

  const leadingCity = useMemo(() => {
    if (!filteredZones.length) {
      return "—";
    }

    const counts = new Map<string, number>();
    filteredZones.forEach((zone) => {
      counts.set(zone.city, (counts.get(zone.city) ?? 0) + 1);
    });

    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
  }, [filteredZones]);

  const highMatchCount = useMemo(
    () => filteredZones.filter((zone) => zone.overallScore >= 60).length,
    [filteredZones],
  );

  const isRtl = locale === "ar";

  useEffect(() => {
    if (!filteredZones.length) {
      setSelectedZone(null);
      return;
    }

    const stillVisible =
      selectedZone && filteredZones.some((item) => item.id === selectedZone.id);
    if (!stillVisible) {
      setSelectedZone(filteredZones[0]);
    }
  }, [filteredZones, selectedZone]);

  const toggleTransport = (mode: (typeof transportOptions)[number]) => {
    setTransport((prev) => {
      if (prev.includes(mode)) {
        return prev.filter((item) => item !== mode);
      }
      return [...prev, mode];
    });
  };

  const togglePriority = (priority: PriorityKey) => {
    setSelectedPriorities((prev) =>
      prev.includes(priority)
        ? prev.filter((item) => item !== priority)
        : [...prev, priority],
    );
  };

  const setBudgetMin = (value: number) => {
    setBudgetRange((prev) => ({
      ...prev,
      min: Math.min(value, prev.max - 500),
    }));
  };

  const setBudgetMax = (value: number) => {
    setBudgetRange((prev) => ({
      ...prev,
      max: Math.max(value, prev.min + 500),
    }));
  };

  const selectedTier = selectedZone
    ? getScoreTierInfo(selectedZone.overallScore, scoreRange)
    : null;
  const purposeLabel =
    listingPurpose === "rent"
      ? t("listing.rent")
      : listingPurpose === "buy"
        ? t("listing.sale")
        : t("listing.total");
  const selectedListingCounts = selectedZone
    ? getZoneListingCounts(selectedZone, listingPurpose, liveListings)
    : null;
  const selectedTopTypeSummary = selectedListingCounts
    ? listingTypeKeys
        .map((key) => ({
          key,
          count: selectedListingCounts.counts[key],
        }))
        .filter((item) => item.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, 3)
        .map((item) => `${t(`listing.${item.key}`)} ${item.count}`)
        .join(" · ")
    : "";

  return (
    <div className="space-y-6 pb-8">
      <Card className="rounded-[1.75rem] border-brand-200/80 bg-white/96 p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.18em] text-brand-600">
              {t("results.subtitle")}
            </p>
            <h1 className="mt-2 font-[family-name:var(--font-heading)] text-4xl text-brand-900 md:text-5xl">
              {t("results.title")}
            </h1>
            <p className="mt-2 text-sm text-brand-700 md:text-base">
              {t("results.cockpitSubtitle")}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {!isAuthenticated ? (
              <Link
                href="/login?returnTo=/zones"
                className={buttonClassName("outline", "md", "rounded-2xl")}
              >
                {t("action.signIn")}
              </Link>
            ) : (
              <Link
                href="/messages"
                className={buttonClassName("outline", "md", "rounded-2xl")}
              >
                {t("action.openMessages")}
              </Link>
            )}

            <Link
              href="/listings"
              className={buttonClassName("outline", "md", "rounded-2xl")}
            >
              {t("action.postListing")}
            </Link>
            <Link
              href="/onboarding"
              className={buttonClassName("primary", "md", "rounded-2xl")}
            >
              {t("action.startAnalysis")}
            </Link>
          </div>
        </div>

        <form
          className="mt-5 grid gap-3 xl:grid-cols-[minmax(0,1fr)_220px_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            void runAiSearch();
          }}
        >
          <Input
            value={aiQuery}
            onChange={(event) => setAiQuery(event.target.value)}
            placeholder={t("results.queryPlaceholder")}
            className="h-12 rounded-2xl bg-white"
          />

          <div className="rounded-2xl border border-brand-200 bg-brand-50/75 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-600">
              {t("results.topCity")}
            </p>
            <p className="mt-1 text-base font-semibold text-brand-900">
              {getLocalizedCityName(leadingCity, locale)}
            </p>
          </div>

          <Button type="submit" disabled={aiLoading} className="h-12 rounded-2xl">
            {aiLoading ? t("action.running") : t("action.runAiSearch")}
          </Button>
        </form>

        {aiError ? <p className="mt-3 text-sm text-red-700">{aiError}</p> : null}
        {aiResponse ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge tone="success">
              {aiResponse.results.length} {t("results.rankedZones")}
            </Badge>
            {aiResponse.assumptions.slice(0, 3).map((assumption) => (
              <Badge key={assumption} tone="warning">
                {assumption}
              </Badge>
            ))}
          </div>
        ) : null}

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title={t("results.count")}
            value={String(filteredZones.length)}
            className="rounded-[1.35rem] bg-brand-50/60 shadow-none"
          />
          <StatCard
            title={t("results.bestScore")}
            value={bestScore}
            className="rounded-[1.35rem] bg-brand-50/60 shadow-none"
          />
          <StatCard
            title={t("results.visibleListings")}
            value={String(totalVisibleListings)}
            className="rounded-[1.35rem] bg-brand-50/60 shadow-none"
          />
          <StatCard
            title={t("results.highMatch")}
            value={String(highMatchCount)}
            className="rounded-[1.35rem] bg-brand-50/60 shadow-none"
          />
        </div>
      </Card>

      <Card className="rounded-[1.75rem] border-brand-200/80 bg-white/94 p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-brand-600">
              {t("results.priorities")}
            </p>
            <p className="mt-1 text-sm text-brand-700">
              {t("results.transport")} • {t("results.budget")} • {t("results.commute")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone="neutral">
              {purposeLabel}: {totalVisibleListings}
            </Badge>
            <Badge tone="neutral">
              {filteredZones.length} {t("results.count")}
            </Badge>
          </div>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="rounded-[1.35rem] border border-brand-200 bg-white p-4 text-sm">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-600">
                {t("results.goal")}
              </span>
              <select
                value={goal}
                onChange={(event) => setGoal(event.target.value as Goal)}
                className="mt-3 w-full rounded-2xl border border-brand-200 bg-white px-3 py-2.5"
              >
                {goalOptions.map((item) => (
                  <option key={item} value={item}>
                    {t(`goal.${item}`)}
                  </option>
                ))}
              </select>
            </label>

            <label className="rounded-[1.35rem] border border-brand-200 bg-white p-4 text-sm">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-600">
                {t("results.sort")}
              </span>
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as SortOption)}
                className="mt-3 w-full rounded-2xl border border-brand-200 px-3 py-2.5"
              >
                {sortOptions.map((item) => (
                  <option key={item} value={item}>
                    {t(`sort.${item.toLowerCase()}`)}
                  </option>
                ))}
              </select>
            </label>

            <div className="rounded-[1.35rem] border border-brand-200 bg-white p-4 md:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-600">
                  {t("results.budget")}
                </p>
                <p className="text-sm font-semibold text-brand-900">
                  {formatCurrency(budgetRange.min)} - {formatCurrency(budgetRange.max)}
                </p>
              </div>
              <input
                type="range"
                min={1000}
                max={30000}
                step={250}
                value={budgetRange.min}
                onChange={(event) => setBudgetMin(Number(event.target.value))}
                className="mt-3 w-full"
              />
              <input
                type="range"
                min={1000}
                max={30000}
                step={250}
                value={budgetRange.max}
                onChange={(event) => setBudgetMax(Number(event.target.value))}
                className="mt-1 w-full"
              />
            </div>

            <div className="rounded-[1.35rem] border border-brand-200 bg-white p-4 md:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-600">
                  {t("results.commute")}
                </p>
                <p className="text-sm font-semibold text-brand-900">
                  {commuteMax} min
                </p>
              </div>
              <input
                type="range"
                min={10}
                max={90}
                step={5}
                value={commuteMax}
                onChange={(event) => setCommuteMax(Number(event.target.value))}
                className="mt-3 w-full"
              />
            </div>
          </div>

          <div className="grid gap-3">
            <div className="rounded-[1.35rem] border border-brand-200 bg-brand-50/60 p-4">
              <p className="text-sm font-semibold text-brand-900">
                {t("results.transport")}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {transportOptions.map((mode) => (
                  <Chip
                    key={mode}
                    active={transport.includes(mode)}
                    onClick={() => toggleTransport(mode)}
                  >
                    {t(`transport.${mode}`)}
                  </Chip>
                ))}
              </div>
            </div>

            <div className="rounded-[1.35rem] border border-brand-200 bg-white p-4">
              <p className="text-sm font-semibold text-brand-900">
                {t("results.priorities")}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {priorities.map((priority) => (
                  <Chip
                    key={priority.key}
                    active={selectedPriorities.includes(priority.key)}
                    onClick={() => togglePriority(priority.key)}
                  >
                    {t(priority.labelKey)}
                  </Chip>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card className="rounded-[1.5rem] border-brand-200/80 bg-white/94 p-4 md:p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-start">
          <div>
            <p className="text-sm font-semibold text-brand-900">
              {t("results.edge.explainableTitle")}
            </p>
            <p className="mt-1 text-sm text-brand-700">
              {t("results.edge.explainableText")}
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold text-brand-900">
              {t("results.edge.trueCostTitle")}
            </p>
            <p className="mt-1 text-sm text-brand-700">
              {t("results.edge.trueCostText")}
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold text-brand-900">
              {t("results.edge.contactTitle")}
            </p>
            <p className="mt-1 text-sm text-brand-700">
              {t("results.edge.contactText")}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 lg:justify-end">
            {aiResponse ? <Badge tone="success">{t("results.aiActive")}</Badge> : null}
            <Link
              href="/compare"
              className={buttonClassName("outline", "sm", "rounded-2xl")}
            >
              {t("action.compare")}
            </Link>
          </div>
        </div>
      </Card>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="space-y-4 rounded-[1.75rem] border-brand-200/80 p-3 md:p-4">
          <div className="rounded-[1.5rem] border border-brand-200/70 bg-[linear-gradient(180deg,rgba(243,247,244,0.92),rgba(255,255,255,0.98))] p-3">
            <ZonesMap
              zones={filteredZones}
              liveListings={liveListings}
              selectedZoneId={selectedZone?.id}
              activeGoal={goal}
              onSelectZone={(zone) => setSelectedZone(zone)}
            />
          </div>

          {selectedZone && selectedTier && selectedListingCounts ? (
            <div
              className="overflow-hidden rounded-[1.5rem] border bg-white/98 shadow-panel"
              style={{
                borderColor: withAlpha(selectedTier.color, 0.45),
                background: `linear-gradient(135deg, ${withAlpha(selectedTier.color, 0.07)} 0%, #ffffff 72%)`,
              }}
            >
              <div className="grid gap-0 lg:grid-cols-[180px_minmax(0,1fr)]">
                <div className="relative min-h-[160px] overflow-hidden border-b border-brand-100 lg:border-b-0 lg:border-r">
                  <img
                    src={resolveZonePreviewImage(selectedZone)}
                    alt={`${getLocalizedZoneName(selectedZone.name, selectedZone.city, locale)} preview`}
                    className="absolute inset-0 h-full w-full object-cover"
                    loading="lazy"
                    onError={(event) => {
                      const fallback = buildZonePreviewFallback(selectedZone);
                      if (event.currentTarget.src !== fallback) {
                        event.currentTarget.src = fallback;
                      }
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-brand-900/72 via-brand-900/28 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-3 text-white">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                      {getLocalizedCityName(selectedZone.city, locale)}
                    </p>
                    <h3 className="mt-1 text-xl font-semibold text-white">
                      {getLocalizedZoneName(
                        selectedZone.name,
                        selectedZone.city,
                        locale,
                      )}
                    </h3>
                  </div>
                </div>

                <div className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className={cn("space-y-2", isRtl ? "text-right" : undefined)}>
                      <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white/90 px-3 py-1">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: selectedTier.color }}
                        />
                        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-700">
                          {t(`tier.${selectedTier.tier}`)}
                        </span>
                      </div>
                      <p className="text-sm text-brand-700">
                        {t("common.score")} {selectedZone.overallScore.toFixed(1)}
                      </p>
                      <p className="text-sm font-semibold text-brand-900">
                        {purposeLabel}: {selectedListingCounts.total}
                      </p>
                      {selectedTopTypeSummary ? (
                        <p className="text-xs text-brand-700">
                          {selectedTopTypeSummary}
                        </p>
                      ) : null}
                    </div>

                    <div
                      className="flex h-14 w-14 items-center justify-center rounded-[1rem] text-xl font-bold"
                      style={{
                        backgroundColor: withAlpha(selectedTier.color, 0.14),
                        color: selectedTier.color,
                      }}
                    >
                      {Math.round(selectedZone.overallScore)}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-[1rem] border border-brand-200 bg-white/88 p-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-brand-600">
                        {t("results.marketCoverage")}
                      </p>
                      <p className="mt-1 text-base font-semibold text-brand-900">
                        {getLocalizedCityName(selectedZone.city, locale)}
                      </p>
                    </div>
                    <div className="rounded-[1rem] border border-brand-200 bg-white/88 p-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-brand-600">
                        {t("results.visibleListings")}
                      </p>
                      <p className="mt-1 text-base font-semibold text-brand-900">
                        {selectedListingCounts.total}
                      </p>
                    </div>
                    <div className="rounded-[1rem] border border-brand-200 bg-white/88 p-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-brand-600">
                        {t("results.bestScore")}
                      </p>
                      <p className="mt-1 text-base font-semibold text-brand-900">
                        {selectedZone.overallScore.toFixed(1)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="md"
                      className="rounded-2xl"
                      onClick={() => setSelectedZone(selectedZone)}
                    >
                      {t("action.showOnMap")}
                    </Button>
                    <Link
                      href={`/zones/${selectedZone.id}`}
                      className={buttonClassName("primary", "md", "rounded-2xl")}
                    >
                      {t("action.openDetails")}
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </Card>

        <aside className="space-y-3 xl:max-h-[calc(100vh-13rem)] xl:overflow-y-auto xl:pr-1">
          {filteredZones.map((zone) => {
            const tier = getScoreTierInfo(zone.overallScore, scoreRange);
            const selected = selectedZone?.id === zone.id;
            const ai = aiResultMap.get(zone.id);
            const listingCounts = getZoneListingCounts(
              zone,
              listingPurpose,
              liveListings,
            );
            const topTypeSummary = listingTypeKeys
              .map((key) => ({ key, count: listingCounts.counts[key] }))
              .filter((item) => item.count > 0)
              .sort((a, b) => b.count - a.count)
              .slice(0, 3)
              .map((item) => `${t(`listing.${item.key}`)} ${item.count}`)
              .join(" · ");

            return (
              <article
                key={zone.id}
                className={cn(
                  "group overflow-hidden rounded-[1.5rem] border bg-white/96 shadow-panel transition duration-200 hover:-translate-y-0.5",
                  selected ? "ring-1 ring-brand-300" : undefined,
                )}
                style={{
                  borderColor: withAlpha(tier.color, selected ? 0.6 : 0.3),
                  background: `linear-gradient(135deg, ${withAlpha(tier.color, 0.08)} 0%, #ffffff 82%)`,
                }}
              >
                <div className="grid gap-0 md:grid-cols-[140px_minmax(0,1fr)]">
                  <div className="relative overflow-hidden border-b border-brand-100 bg-brand-100 md:border-b-0 md:border-r">
                    <img
                      src={resolveZonePreviewImage(zone)}
                      alt={`${getLocalizedZoneName(zone.name, zone.city, locale)} preview`}
                      className="h-36 w-full object-cover transition duration-300 group-hover:scale-[1.02] md:h-full"
                      loading="lazy"
                      onError={(event) => {
                        const fallback = buildZonePreviewFallback(zone);
                        if (event.currentTarget.src !== fallback) {
                          event.currentTarget.src = fallback;
                        }
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-brand-900/40 via-transparent to-transparent" />
                    <div
                      className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-[0.9rem] border-2 text-base font-bold backdrop-blur"
                      style={{
                        borderColor: "#ffffff",
                        backgroundColor: withAlpha(tier.color, 0.92),
                        color: tier.tier === "medium" ? "#18261f" : "#ffffff",
                      }}
                    >
                      {Math.round(zone.overallScore)}
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className={isRtl ? "text-right" : undefined}>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-600">
                          {getLocalizedCityName(zone.city, locale)}
                        </p>
                        <CardTitle className="mt-1 text-xl">
                          {getLocalizedZoneName(zone.name, zone.city, locale)}
                        </CardTitle>
                      </div>

                      <Badge
                        className="rounded-full px-3 py-1"
                        tone={
                          tier.tier === "best"
                            ? "success"
                            : tier.tier === "worst"
                              ? "danger"
                              : "warning"
                        }
                      >
                        {t(`tier.${tier.tier}`)}
                      </Badge>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge tone={zone.flags.quiet ? "success" : "warning"}>
                        {t("zone.quiet")}
                      </Badge>
                      <Badge
                        tone={zone.flags.transitFriendly ? "success" : "warning"}
                      >
                        {t("zone.transit")}
                      </Badge>
                      <Badge
                        tone={zone.flags.allergyFriendly ? "success" : "danger"}
                      >
                        {t("zone.allergy")}
                      </Badge>
                    </div>

                    <div className="mt-3 rounded-[1rem] border border-brand-200 bg-white/88 px-3 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-700">
                        {purposeLabel}: {listingCounts.total}
                      </p>
                      {topTypeSummary ? (
                        <p className="mt-1 text-xs text-brand-800">
                          {topTypeSummary}
                        </p>
                      ) : null}
                    </div>

                    {ai ? (
                      <div className="mt-3 rounded-[1rem] border border-brand-200 bg-white/88 p-3">
                        <CardDescription className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-600">
                          {t("results.aiReasons")}
                        </CardDescription>
                        <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-brand-800">
                          {ai.reasons.slice(0, 2).map((reason) => (
                            <li key={reason}>{reason}</li>
                          ))}
                        </ul>
                        <p className="mt-2 text-xs text-brand-700">
                          {t("results.estimatedTcl")}:{" "}
                          {formatCurrency(ai.tclMonthly)}/{t("common.month")}
                        </p>
                      </div>
                    ) : null}

                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-2xl"
                        onClick={() => setSelectedZone(zone)}
                      >
                        {t("action.showOnMap")}
                      </Button>
                      <Link
                        href={`/zones/${zone.id}`}
                        className={buttonClassName(
                          "primary",
                          "sm",
                          "rounded-2xl",
                        )}
                      >
                        {t("action.openDetails")}
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}

          {!filteredZones.length ? (
            <Card>
              <CardDescription>{t("results.empty")}</CardDescription>
            </Card>
          ) : null}
        </aside>
      </section>

      <button
        type="button"
        onClick={() => setCopilotOpen(true)}
        className="fixed bottom-24 right-5 z-40 rounded-full bg-brand-700 px-5 py-3 text-sm font-semibold text-white shadow-panel transition hover:bg-brand-800 md:bottom-6"
      >
        {t("action.copilot")}
      </button>

      <CopilotDrawer
        open={copilotOpen}
        onClose={() => setCopilotOpen(false)}
        context={copilotContext}
      />
    </div>
  );
}
