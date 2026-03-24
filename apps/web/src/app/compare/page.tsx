"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type {
  CompareResponse,
  UserProfileInput,
  ZoneSummary,
} from "@homemall/shared";
import { clientApi } from "@/lib/client-api";
import { formatCurrency } from "@/lib/format";
import {
  getCompareOffersCart,
  getMaxCompareOffers,
  removeOfferFromCompareCart,
} from "@/lib/offer-interactions";
import { useI18n } from "@/components/i18n/i18n-provider";

interface ZonesResponse {
  zones: ZoneSummary[];
}

interface ProfileResponse {
  profile: UserProfileInput;
}

interface OptionInput {
  label: string;
  zoneId: string;
  housingCostMonthly: number;
  commuteKmMonthly: number;
  energyKwhMonthly: number;
  baselineHealthBudget: number;
}

interface CompareOption extends OptionInput {
  id: string;
  sourceListingId?: string;
  sourceOfferTitle?: string;
}

interface RankedOffer {
  id: string;
  label: string;
  offerName: string;
  sourceListingId?: string;
  zoneId: string;
  zoneName: string;
  score: number;
  tclMonthly: number;
  outlook5y: number;
  outlook10y: number;
  wins: number;
  losses: number;
  matches: number;
  utility: number;
}

const MAX_COMPARE_OPTIONS = getMaxCompareOffers();

const numberFields: Array<
  readonly [labelKey: string, field: keyof Pick<OptionInput, "housingCostMonthly" | "commuteKmMonthly" | "energyKwhMonthly" | "baselineHealthBudget">]
> = [
  ["compare.housingMonthly", "housingCostMonthly"],
  ["compare.commuteMonthly", "commuteKmMonthly"],
  ["compare.energyMonthly", "energyKwhMonthly"],
  ["compare.healthBaseline", "baselineHealthBudget"],
];

const baselineForIndex = (index: number) => {
  if (index === 0) {
    return {
      housingCostMonthly: 1300,
      commuteKmMonthly: 380,
      energyKwhMonthly: 260,
      baselineHealthBudget: 80,
    };
  }

  return {
    housingCostMonthly: 1180,
    commuteKmMonthly: 440,
    energyKwhMonthly: 280,
    baselineHealthBudget: 70,
  };
};

const optionLabel = (index: number) => `Option ${String.fromCharCode(65 + index)}`;

export default function ComparePage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-[1200px] px-4 py-6 md:px-6">
          <p className="text-sm text-brand-700">Loading compare...</p>
        </main>
      }
    >
      <ComparePageContent />
    </Suspense>
  );
}

function ComparePageContent() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const optionIdRef = useRef(0);
  const [zones, setZones] = useState<ZoneSummary[]>([]);
  const [profile, setProfile] = useState<UserProfileInput | null>(null);
  const [result, setResult] = useState<CompareResponse | null>(null);
  const [ranking, setRanking] = useState<RankedOffer[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [options, setOptions] = useState<CompareOption[]>([]);

  const nextOptionId = () => {
    optionIdRef.current += 1;
    return `cmp-option-${optionIdRef.current}`;
  };

  const zoneNameById = useMemo(
    () => new Map(zones.map((zone) => [zone.id, zone.name])),
    [zones],
  );

  const queryZoneIds = useMemo(() => {
    if (!searchParams) {
      return [] as string[];
    }

    const values: string[] = [];
    const push = (raw: string | null) => {
      if (!raw) return;
      const value = raw.trim();
      if (!value) return;
      if (!values.includes(value)) {
        values.push(value);
      }
    };

    push(searchParams.get("zoneA"));
    push(searchParams.get("zoneB"));
    searchParams.getAll("zoneId").forEach((entry) => push(entry));

    const joined = searchParams.get("zones");
    if (joined) {
      joined
        .split(",")
        .map((item) => item.trim())
        .forEach((entry) => push(entry));
    }

    return values;
  }, [searchParams]);

  const buildOption = (index: number, zoneId: string): CompareOption => ({
    id: nextOptionId(),
    label: optionLabel(index),
    zoneId,
    ...baselineForIndex(index),
  });

  const resetComputed = () => {
    setResult(null);
    setRanking(null);
  };

  const toApiOption = (option: CompareOption): OptionInput => ({
    label: option.label,
    zoneId: option.zoneId,
    housingCostMonthly: option.housingCostMonthly,
    commuteKmMonthly: option.commuteKmMonthly,
    energyKwhMonthly: option.energyKwhMonthly,
    baselineHealthBudget: option.baselineHealthBudget,
  });

  useEffect(() => {
    const load = async () => {
      try {
        const zonesRes = await clientApi<ZonesResponse>("/api/zones");
        setZones(zonesRes.zones);

        try {
          const profileRes = await clientApi<ProfileResponse>("/api/profile");
          setProfile(profileRes.profile);
        } catch {
          setProfile(null);
        }

        const availableZoneIds = zonesRes.zones.map((zone) => zone.id);
        const seedOptions: CompareOption[] = [];

        const compareCart = getCompareOffersCart()
          .filter((item) => availableZoneIds.includes(item.zoneId))
          .slice(0, MAX_COMPARE_OPTIONS);

        compareCart.forEach((item, index) => {
          seedOptions.push({
            id: nextOptionId(),
            label: optionLabel(index),
            zoneId: item.zoneId,
            housingCostMonthly: item.housingCostMonthly,
            commuteKmMonthly: item.commuteKmMonthly,
            energyKwhMonthly: item.energyKwhMonthly,
            baselineHealthBudget: item.baselineHealthBudget,
            sourceListingId: item.listingId,
            sourceOfferTitle: item.title,
          });
        });

        if (seedOptions.length < 2) {
          const queryIds = queryZoneIds.filter((zoneId) =>
            availableZoneIds.includes(zoneId),
          );

          const seedZoneIds: string[] = [];
          queryIds.forEach((zoneId) => {
            if (!seedZoneIds.includes(zoneId)) {
              seedZoneIds.push(zoneId);
            }
          });

          availableZoneIds.forEach((zoneId) => {
            if (seedZoneIds.length >= Math.min(availableZoneIds.length, 2)) {
              return;
            }
            if (!seedZoneIds.includes(zoneId)) {
              seedZoneIds.push(zoneId);
            }
          });

          seedZoneIds.forEach((zoneId) => {
            if (seedOptions.length >= 2) {
              return;
            }
            seedOptions.push(buildOption(seedOptions.length, zoneId));
          });
        }

        if (seedOptions.length === 1) {
          seedOptions.push(buildOption(1, seedOptions[0].zoneId));
        }

        if (seedOptions.length === 0) {
          setOptions([]);
        } else {
          setOptions(
            seedOptions.map((option, index) => ({
              ...option,
              label: optionLabel(index),
            })),
          );
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Could not load compare page data",
        );
      }
    };

    void load();
  }, [queryZoneIds]);

  const setOptionField = <K extends keyof OptionInput>(
    id: string,
    field: K,
    value: OptionInput[K],
  ) => {
    setOptions((prev) =>
      prev.map((option) =>
        option.id === id ? { ...option, [field]: value } : option,
      ),
    );
    resetComputed();
  };

  const addOption = () => {
    if (!zones.length || options.length >= MAX_COMPARE_OPTIONS) {
      return;
    }

    const used = new Set(options.map((option) => option.zoneId));
    const nextZoneId =
      zones.find((zone) => !used.has(zone.id))?.id ?? zones[0].id;
    const nextIndex = options.length;

    setOptions((prev) => [...prev, buildOption(nextIndex, nextZoneId)]);
    resetComputed();
  };

  const removeOption = (id: string) => {
    if (options.length <= 2) {
      return;
    }

    const selected = options.find((option) => option.id === id);
    if (selected?.sourceListingId) {
      removeOfferFromCompareCart(selected.sourceListingId);
    }

    setOptions((prev) =>
      prev
        .filter((option) => option.id !== id)
        .map((option, index) => ({ ...option, label: optionLabel(index) })),
    );
    resetComputed();
  };

  const upsertRankRow = (
    map: Map<string, RankedOffer>,
    option: CompareOption,
    payload: CompareResponse["optionA"] | CompareResponse["optionB"],
  ) => {
    const existing = map.get(option.id);
    if (existing) {
      return existing;
    }

    const next: RankedOffer = {
      id: option.id,
      label: option.label,
      offerName: option.sourceOfferTitle ?? option.label,
      sourceListingId: option.sourceListingId,
      zoneId: option.zoneId,
      zoneName: zoneNameById.get(option.zoneId) ?? option.zoneId,
      score: payload.score.total,
      tclMonthly: payload.tcl.monthlyTotal,
      outlook5y: payload.future.years5,
      outlook10y: payload.future.years10,
      wins: 0,
      losses: 0,
      matches: 0,
      utility: payload.score.total - payload.tcl.monthlyTotal / 100,
    };
    map.set(option.id, next);
    return next;
  };

  const runCompare = async () => {
    try {
      if (options.length < 2) {
        return;
      }

      setRunning(true);
      setError(null);

      if (options.length === 2) {
        const payload: {
          profile?: UserProfileInput;
          optionA: OptionInput;
          optionB: OptionInput;
        } = {
          optionA: toApiOption(options[0]),
          optionB: toApiOption(options[1]),
        };
        if (profile) {
          payload.profile = profile;
        }

        const response = await clientApi<CompareResponse>(
          "/api/analyze/compare",
          {
            method: "POST",
            body: JSON.stringify(payload),
          },
        );
        setResult(response);

        const rowA: RankedOffer = {
          id: options[0].id,
          label: response.optionA.label,
          offerName: options[0].sourceOfferTitle ?? response.optionA.label,
          sourceListingId: options[0].sourceListingId,
          zoneId: options[0].zoneId,
          zoneName: zoneNameById.get(options[0].zoneId) ?? options[0].zoneId,
          score: response.optionA.score.total,
          tclMonthly: response.optionA.tcl.monthlyTotal,
          outlook5y: response.optionA.future.years5,
          outlook10y: response.optionA.future.years10,
          wins: response.winner === "A" ? 1 : 0,
          losses: response.winner === "A" ? 0 : 1,
          matches: 1,
          utility:
            response.optionA.score.total -
            response.optionA.tcl.monthlyTotal / 100,
        };

        const rowB: RankedOffer = {
          id: options[1].id,
          label: response.optionB.label,
          offerName: options[1].sourceOfferTitle ?? response.optionB.label,
          sourceListingId: options[1].sourceListingId,
          zoneId: options[1].zoneId,
          zoneName: zoneNameById.get(options[1].zoneId) ?? options[1].zoneId,
          score: response.optionB.score.total,
          tclMonthly: response.optionB.tcl.monthlyTotal,
          outlook5y: response.optionB.future.years5,
          outlook10y: response.optionB.future.years10,
          wins: response.winner === "B" ? 1 : 0,
          losses: response.winner === "B" ? 0 : 1,
          matches: 1,
          utility:
            response.optionB.score.total -
            response.optionB.tcl.monthlyTotal / 100,
        };

        setRanking(
          [rowA, rowB].sort(
            (left, right) =>
              right.wins - left.wins ||
              right.utility - left.utility ||
              left.tclMonthly - right.tclMonthly,
          ),
        );
        return;
      }

      setResult(null);

      const pairs: Array<{ left: CompareOption; right: CompareOption }> = [];
      for (let index = 0; index < options.length; index += 1) {
        for (let nested = index + 1; nested < options.length; nested += 1) {
          pairs.push({
            left: options[index],
            right: options[nested],
          });
        }
      }

      const responses = await Promise.all(
        pairs.map(({ left, right }) => {
          const payload: {
            profile?: UserProfileInput;
            optionA: OptionInput;
            optionB: OptionInput;
          } = {
            optionA: toApiOption(left),
            optionB: toApiOption(right),
          };
          if (profile) {
            payload.profile = profile;
          }

          return clientApi<CompareResponse>("/api/analyze/compare", {
            method: "POST",
            body: JSON.stringify(payload),
          });
        }),
      );

      const rankMap = new Map<string, RankedOffer>();

      responses.forEach((response, index) => {
        const { left, right } = pairs[index];
        const leftRow = upsertRankRow(rankMap, left, response.optionA);
        const rightRow = upsertRankRow(rankMap, right, response.optionB);

        leftRow.matches += 1;
        rightRow.matches += 1;

        if (response.winner === "A") {
          leftRow.wins += 1;
          rightRow.losses += 1;
        } else {
          rightRow.wins += 1;
          leftRow.losses += 1;
        }
      });

      const ordered = Array.from(rankMap.values()).sort(
        (left, right) =>
          right.wins - left.wins ||
          right.utility - left.utility ||
          left.tclMonthly - right.tclMonthly,
      );
      setRanking(ordered);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Comparison failed");
    } finally {
      setRunning(false);
    }
  };

  const canRunCompare =
    options.length >= 2 &&
    options.every((option) => option.zoneId.trim().length > 0) &&
    !running;

  const topRank = ranking?.[0] ?? null;

  return (
    <main className="mx-auto max-w-[1300px] space-y-5 px-4 py-6 md:px-6">
      <header>
        <p className="text-sm uppercase tracking-[0.2em] text-brand-600">
          {t("compare.badge")}
        </p>
        <h1 className="font-[family-name:var(--font-heading)] text-4xl text-brand-900">
          {t("compare.title")}
        </h1>
      </header>

      {error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <section className="rounded-2xl border border-brand-200 bg-white/90 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-brand-900">
              Added offers ({options.length})
            </h2>
            <p className="text-sm text-brand-700">
              You can compare up to {MAX_COMPARE_OPTIONS} offers.
            </p>
          </div>
          <button
            type="button"
            onClick={addOption}
            disabled={options.length >= MAX_COMPARE_OPTIONS || zones.length === 0}
            className="rounded-xl border border-brand-200 px-3 py-1.5 text-sm font-semibold text-brand-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            + Add offer
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {options.map((option) => (
            <span
              key={option.id}
              className="inline-flex items-center rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-800"
            >
              {option.label}:{" "}
              {option.sourceOfferTitle
                ? `${option.sourceOfferTitle} (${zoneNameById.get(option.zoneId) ?? "Select zone"})`
                : zoneNameById.get(option.zoneId) ?? "Select zone"}
            </span>
          ))}
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {options.map((option, index) => (
          <div
            key={option.id}
            className="space-y-3 rounded-2xl border border-brand-200 bg-white/90 p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-brand-900">
                {option.label}
              </h2>
              {options.length > 2 ? (
                <button
                  type="button"
                  onClick={() => removeOption(option.id)}
                  className="rounded-lg border border-brand-200 px-2 py-1 text-xs font-semibold text-brand-700"
                >
                  Remove
                </button>
              ) : null}
            </div>
            <label className="block text-sm">
              {t("compare.zone")}
              <select
                className="mt-1 w-full rounded-xl border border-brand-200 px-3 py-2"
                value={option.zoneId}
                onChange={(event) =>
                  setOptionField(option.id, "zoneId", event.target.value)
                }
              >
                {zones.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.name}
                  </option>
                ))}
              </select>
            </label>
            {numberFields.map(([labelKey, field]) => (
              <label key={field} className="block text-sm">
                {t(labelKey)}
                <input
                  type="number"
                  className="mt-1 w-full rounded-xl border border-brand-200 px-3 py-2"
                  value={option[field]}
                  onChange={(event) =>
                    setOptionField(option.id, field, Number(event.target.value))
                  }
                />
              </label>
            ))}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={runCompare}
        disabled={!canRunCompare}
        className="rounded-xl bg-brand-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {running ? t("action.running") : t("action.runComparison")}
      </button>

      {ranking?.length ? (
        <section className="rounded-2xl border border-brand-200 bg-white/92 p-5">
          <h2 className="text-xl font-semibold text-brand-900">
            {t("compare.winner")}: {topRank?.offerName}
          </h2>
          <p className="mt-1 text-sm text-brand-700">
            {topRank
              ? `${topRank.zoneName} leads with ${topRank.wins} wins out of ${topRank.matches} matches.`
              : ""}
          </p>

          <div className="mt-4 overflow-x-auto rounded-xl border border-brand-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-brand-50">
                <tr>
                  <th className="px-3 py-2 font-semibold text-brand-800">#</th>
                  <th className="px-3 py-2 font-semibold text-brand-800">
                    Offer
                  </th>
                  <th className="px-3 py-2 font-semibold text-brand-800">
                    {t("compare.zone")}
                  </th>
                  <th className="px-3 py-2 font-semibold text-brand-800">W-L</th>
                  <th className="px-3 py-2 font-semibold text-brand-800">
                    {t("compare.scoreLine")}
                  </th>
                  <th className="px-3 py-2 font-semibold text-brand-800">
                    {t("compare.tclLine")}
                  </th>
                  <th className="px-3 py-2 font-semibold text-brand-800">
                    {t("compare.outlook5y")}
                  </th>
                  <th className="px-3 py-2 font-semibold text-brand-800">
                    {t("compare.outlook10y")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((row, index) => (
                  <tr
                    key={row.id}
                    className="border-t border-brand-100 even:bg-brand-50/30"
                  >
                    <td className="px-3 py-2 font-semibold text-brand-900">
                      {index + 1}
                    </td>
                    <td className="px-3 py-2">
                      {row.sourceListingId ? (
                        <Link
                          href={`/listings/${row.sourceListingId}`}
                          className="font-semibold text-brand-800 underline hover:text-brand-900"
                        >
                          {row.offerName}
                        </Link>
                      ) : (
                        row.offerName
                      )}
                    </td>
                    <td className="px-3 py-2">{row.zoneName}</td>
                    <td className="px-3 py-2">
                      {row.wins}-{row.losses}
                    </td>
                    <td className="px-3 py-2">{row.score.toFixed(1)}</td>
                    <td className="px-3 py-2">
                      {formatCurrency(row.tclMonthly)}
                    </td>
                    <td className="px-3 py-2">{row.outlook5y}%</td>
                    <td className="px-3 py-2">{row.outlook10y}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {result ? (
        <section className="rounded-2xl border border-brand-200 bg-white/92 p-5">
          <h2 className="text-xl font-semibold text-brand-900">
            {t("compare.winner")}:{" "}
            {result.winner === "A" ? t("common.optionA") : t("common.optionB")}
          </h2>
          <p className="mt-1 text-sm text-brand-700">{result.reason}</p>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-brand-200 bg-brand-50 p-4 text-sm">
              <p className="font-semibold">{result.optionA.label}</p>
              <p>
                {t("compare.scoreLine")}: {result.optionA.score.total}
              </p>
              <p>
                {t("compare.tclLine")}:{" "}
                {formatCurrency(result.optionA.tcl.monthlyTotal)}
              </p>
              <p>
                {t("compare.outlook5y")}: {result.optionA.future.years5}%
              </p>
              <p>
                {t("compare.outlook10y")}: {result.optionA.future.years10}%
              </p>
            </div>
            <div className="rounded-xl border border-brand-200 bg-brand-50 p-4 text-sm">
              <p className="font-semibold">{result.optionB.label}</p>
              <p>
                {t("compare.scoreLine")}: {result.optionB.score.total}
              </p>
              <p>
                {t("compare.tclLine")}:{" "}
                {formatCurrency(result.optionB.tcl.monthlyTotal)}
              </p>
              <p>
                {t("compare.outlook5y")}: {result.optionB.future.years5}%
              </p>
              <p>
                {t("compare.outlook10y")}: {result.optionB.future.years10}%
              </p>
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}
