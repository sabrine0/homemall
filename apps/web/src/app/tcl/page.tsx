"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { useSearchParams } from "next/navigation";
import type { UserProfileInput, ZoneSummary } from "@homemall/shared";
import { clientApi } from "@/lib/client-api";
import { formatCurrency } from "@/lib/format";
import { useI18n } from "@/components/i18n/i18n-provider";

interface ZonesResponse {
  zones: ZoneSummary[];
}

interface ProfileResponse {
  profile: UserProfileInput;
}

interface TclResponse {
  optionA: {
    label: string;
    zoneName: string;
    tcl: {
      monthlyTotal: number;
      components: {
        housing: number;
        commute: number;
        energy: number;
        health: number;
        riskPenalty: number;
      };
    };
  };
  optionB: {
    label: string;
    zoneName: string;
    tcl: {
      monthlyTotal: number;
      components: {
        housing: number;
        commute: number;
        energy: number;
        health: number;
        riskPenalty: number;
      };
    };
  };
  cheaper: "A" | "B";
  deltaMonthly: number;
}

interface OptionInput {
  label: string;
  zoneId: string;
  housingCostMonthly: number;
  commuteKmMonthly: number;
  energyKwhMonthly: number;
  baselineHealthBudget: number;
}

const createInitialOption = (label: string): OptionInput => ({
  label,
  zoneId: "",
  housingCostMonthly: 7000,
  commuteKmMonthly: 360,
  energyKwhMonthly: 230,
  baselineHealthBudget: 350,
});

function TclPageContent() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const zoneAParam = searchParams?.get("zoneA");
  const zoneBParam = searchParams?.get("zoneB");
  const [zones, setZones] = useState<ZoneSummary[]>([]);
  const [profile, setProfile] = useState<UserProfileInput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TclResponse | null>(null);
  const [running, setRunning] = useState(false);
  const [optionA, setOptionA] = useState<OptionInput>(
    createInitialOption("Option A"),
  );
  const [optionB, setOptionB] = useState<OptionInput>(
    createInitialOption("Option B"),
  );

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

        if (zonesRes.zones.length > 1) {
          const zoneA =
            (zoneAParam &&
              zonesRes.zones.find((zone) => zone.id === zoneAParam)?.id) ??
            zonesRes.zones[0].id;
          const zoneB =
            (zoneBParam &&
              zonesRes.zones.find((zone) => zone.id === zoneBParam)?.id) ??
            zonesRes.zones.find((zone) => zone.id !== zoneA)?.id ??
            zonesRes.zones[1].id;

          setOptionA((prev) => ({ ...prev, zoneId: zoneA }));
          setOptionB((prev) => ({ ...prev, zoneId: zoneB }));
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Could not load zone data",
        );
      }
    };

    void load();
  }, [zoneAParam, zoneBParam]);

  const runTcl = async () => {
    setRunning(true);
    setError(null);

    try {
      const payload: {
        profile?: UserProfileInput;
        optionA: OptionInput;
        optionB: OptionInput;
      } = {
        optionA,
        optionB,
      };
      if (profile) {
        payload.profile = profile;
      }

      const response = await clientApi<TclResponse>("/api/analyze/tcl", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "TCL analysis failed");
    } finally {
      setRunning(false);
    }
  };

  const renderOptionEditor = (
    title: string,
    option: OptionInput,
    setOption: Dispatch<SetStateAction<OptionInput>>,
  ) => (
    <div className="space-y-3 rounded-2xl border border-brand-200 bg-white/90 p-4">
      <h2 className="text-lg font-semibold text-brand-900">{title}</h2>
      <label className="block text-sm">
        {t("tcl.zone")}
        <select
          className="mt-1 w-full rounded-xl border border-brand-200 px-3 py-2"
          value={option.zoneId}
          onChange={(event) =>
            setOption((prev) => ({ ...prev, zoneId: event.target.value }))
          }
        >
          {zones.map((zone) => (
            <option key={zone.id} value={zone.id}>
              {zone.name} ({zone.city})
            </option>
          ))}
        </select>
      </label>

      {(
        [
          [t("tcl.housing"), "housingCostMonthly"],
          [t("tcl.commute"), "commuteKmMonthly"],
          [t("tcl.energy"), "energyKwhMonthly"],
          [t("tcl.health"), "baselineHealthBudget"],
        ] as const
      ).map(([label, key]) => (
        <label key={key} className="block text-sm">
          {label}
          <input
            type="number"
            className="mt-1 w-full rounded-xl border border-brand-200 px-3 py-2"
            value={option[key]}
            onChange={(event) =>
              setOption((prev) => ({
                ...prev,
                [key]: Number(event.target.value),
              }))
            }
          />
        </label>
      ))}
    </div>
  );

  const verdictText = result
    ? `${result.cheaper === "A" ? t("common.optionA") : t("common.optionB")} costs ${formatCurrency(result.deltaMonthly)} less per month.`
    : null;

  return (
    <main className="mx-auto max-w-[1300px] space-y-5 px-4 py-6 md:px-6">
      <header className="rounded-3xl border border-brand-200 bg-white/90 p-4 shadow-panel">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-brand-600">
              {t("tcl.badge")}
            </p>
            <h1 className="font-[family-name:var(--font-heading)] text-4xl text-brand-900">
              {t("tcl.title")}
            </h1>
          </div>
          <Link
            href="/zones"
            className="rounded-full border border-brand-300 px-4 py-2 text-sm font-semibold text-brand-800"
          >
            {t("common.backToExplorer")}
          </Link>
        </div>
      </header>

      {error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-2">
        {renderOptionEditor(t("common.optionA"), optionA, setOptionA)}
        {renderOptionEditor(t("common.optionB"), optionB, setOptionB)}
      </section>

      <button
        type="button"
        onClick={runTcl}
        disabled={
          running || !zones.length || !optionA.zoneId || !optionB.zoneId
        }
        className="rounded-xl bg-brand-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed"
      >
        {running ? t("common.loading") : t("action.runTcl")}
      </button>

      {result ? (
        <section className="rounded-2xl border border-brand-200 bg-white/92 p-5">
          <h2 className="text-xl font-semibold text-brand-900">
            {t("tcl.verdict")}
          </h2>
          <p className="mt-1 text-base text-brand-800">{verdictText}</p>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-brand-200 text-left text-brand-700">
                  <th className="px-2 py-2">{t("tcl.costComponent")}</th>
                  <th className="px-2 py-2">{t("common.optionA")}</th>
                  <th className="px-2 py-2">{t("common.optionB")}</th>
                </tr>
              </thead>
              <tbody>
                {(
                  [
                    [t("tcl.rentMortgage"), "housing"],
                    [t("tcl.commuteCost"), "commute"],
                    [t("tcl.energyCost"), "energy"],
                    [t("tcl.healthAllergy"), "health"],
                    [t("tcl.riskPenalty"), "riskPenalty"],
                  ] as const
                ).map(([label, key]) => (
                  <tr key={key} className="border-b border-brand-100">
                    <td className="px-2 py-2">{label}</td>
                    <td className="px-2 py-2">
                      {formatCurrency(result.optionA.tcl.components[key])}
                    </td>
                    <td className="px-2 py-2">
                      {formatCurrency(result.optionB.tcl.components[key])}
                    </td>
                  </tr>
                ))}
                <tr className="font-semibold">
                  <td className="px-2 py-2">{t("tcl.totalMonthly")}</td>
                  <td className="px-2 py-2">
                    {formatCurrency(result.optionA.tcl.monthlyTotal)}
                  </td>
                  <td className="px-2 py-2">
                    {formatCurrency(result.optionB.tcl.monthlyTotal)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </main>
  );
}

export default function TclPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-[1300px] px-4 py-6 text-sm text-brand-700">
          Loading TCL...
        </main>
      }
    >
      <TclPageContent />
    </Suspense>
  );
}
