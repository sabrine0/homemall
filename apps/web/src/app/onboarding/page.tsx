"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Goal, UserProfileInput } from "@homemall/shared";
import { clientApi } from "@/lib/client-api";
import { isLoggedInClient, redirectToLoginWithReturn } from "@/lib/auth-client";
import { useI18n } from "@/components/i18n/i18n-provider";

const goals: Goal[] = [
  "rent",
  "buy",
  "sell",
  "invest",
  "build",
  "manage_rental",
];
const draftKey = "homemall_onboarding_draft";

export default function OnboardingPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<UserProfileInput>({
    goal: "rent",
    budgetMin: 3000,
    budgetMax: 12000,
    workLat: 33.5731,
    workLng: -7.5898,
    mobilityModes: ["transit", "walk"],
    sensitivities: {
      noise: 2,
      heat: 2,
      allergies: 2,
    },
  });

  const modes = useMemo(() => ["walk", "transit", "car", "bike"], []);

  useEffect(() => {
    const load = async () => {
      const draft = localStorage.getItem(draftKey);
      if (draft) {
        try {
          setForm(JSON.parse(draft) as UserProfileInput);
        } catch {
          localStorage.removeItem(draftKey);
        }
      }

      try {
        const profileRes = await clientApi<{ profile: UserProfileInput }>(
          "/api/profile",
        );
        setForm(profileRes.profile);
      } catch {
        // Guest users do not have a saved profile yet.
      }
    };

    void load();
  }, []);

  useEffect(() => {
    localStorage.setItem(draftKey, JSON.stringify(form));
  }, [form]);

  const updateMobility = (mode: string) => {
    setForm((prev) => {
      const hasMode = prev.mobilityModes.includes(mode);
      const mobilityModes = hasMode
        ? prev.mobilityModes.filter((item) => item !== mode)
        : [...prev.mobilityModes, mode];
      return {
        ...prev,
        mobilityModes: mobilityModes.length ? mobilityModes : ["walk"],
      };
    });
  };

  const submit = async () => {
    setSaving(true);
    setError(null);

    try {
      const isLoggedIn = await isLoggedInClient();
      if (!isLoggedIn) {
        redirectToLoginWithReturn(router, "/onboarding");
        return;
      }

      await clientApi<{ profile: UserProfileInput }>("/api/profile/save", {
        method: "POST",
        body: JSON.stringify(form),
      });

      localStorage.removeItem(draftKey);
      router.push("/zones");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="mx-auto max-w-[960px] space-y-6 px-4 py-6 md:px-6">
      <header className="rounded-3xl border border-brand-200 bg-white/90 p-5 shadow-panel">
        <p className="text-sm uppercase tracking-[0.2em] text-brand-600">
          {t("onboarding.badge")}
        </p>
        <h1 className="font-[family-name:var(--font-heading)] text-4xl text-brand-900">
          {t("onboarding.title")}
        </h1>
        <p className="mt-2 text-sm text-brand-700">
          {t("onboarding.subtitle")}
        </p>
      </header>

      <div className="rounded-2xl border border-brand-200 bg-white/90 p-5">
        <p className="text-sm font-semibold text-brand-700">
          {t("onboarding.step")} {step} {t("onboarding.of")} 3
        </p>

        {step === 1 ? (
          <div className="mt-4 space-y-4">
            <label className="block space-y-1">
              <span className="text-sm font-medium">
                {t("onboarding.primaryGoal")}
              </span>
              <select
                value={form.goal}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    goal: event.target.value as Goal,
                  }))
                }
                className="w-full rounded-xl border border-brand-200 px-3 py-2"
              >
                {goals.map((goal) => (
                  <option key={goal} value={goal}>
                    {t(`goal.${goal}`)}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1">
                <span className="text-sm font-medium">
                  {t("onboarding.budgetMin")}
                </span>
                <input
                  type="number"
                  value={form.budgetMin}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      budgetMin: Number(event.target.value),
                    }))
                  }
                  className="w-full rounded-xl border border-brand-200 px-3 py-2"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium">
                  {t("onboarding.budgetMax")}
                </span>
                <input
                  type="number"
                  value={form.budgetMax}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      budgetMax: Number(event.target.value),
                    }))
                  }
                  className="w-full rounded-xl border border-brand-200 px-3 py-2"
                />
              </label>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="mt-4 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1">
                <span className="text-sm font-medium">
                  {t("onboarding.workLat")}
                </span>
                <input
                  type="number"
                  step="0.0001"
                  value={form.workLat}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      workLat: Number(event.target.value),
                    }))
                  }
                  className="w-full rounded-xl border border-brand-200 px-3 py-2"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium">
                  {t("onboarding.workLng")}
                </span>
                <input
                  type="number"
                  step="0.0001"
                  value={form.workLng}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      workLng: Number(event.target.value),
                    }))
                  }
                  className="w-full rounded-xl border border-brand-200 px-3 py-2"
                />
              </label>
            </div>

            <div>
              <p className="text-sm font-medium">
                {t("onboarding.mobilityModes")}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {modes.map((mode) => {
                  const active = form.mobilityModes.includes(mode);
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => updateMobility(mode)}
                      className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                        active
                          ? "bg-brand-700 text-white"
                          : "bg-brand-100 text-brand-800"
                      }`}
                    >
                      {t(`transport.${mode}`)}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="mt-4 space-y-4">
            {(["noise", "heat", "allergies"] as const).map((key) => (
              <label key={key} className="block space-y-1">
                <span className="text-sm font-medium">
                  {t(`onboarding.${key}`)} sensitivity (0-5)
                </span>
                <input
                  type="range"
                  min={0}
                  max={5}
                  value={form.sensitivities[key]}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      sensitivities: {
                        ...prev.sensitivities,
                        [key]: Number(event.target.value),
                      },
                    }))
                  }
                  className="w-full"
                />
                <span className="text-xs text-brand-700">
                  {t("onboarding.current")}: {form.sensitivities[key]}
                </span>
              </label>
            ))}
          </div>
        ) : null}

        {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={() => setStep((prev) => Math.max(1, prev - 1))}
            disabled={step === 1}
            className="rounded-xl border border-brand-200 px-4 py-2 text-sm font-semibold text-brand-800 disabled:opacity-50"
          >
            {t("action.previous")}
          </button>

          {step < 3 ? (
            <button
              type="button"
              onClick={() => setStep((prev) => Math.min(3, prev + 1))}
              className="rounded-xl bg-brand-700 px-4 py-2 text-sm font-semibold text-white"
            >
              {t("action.continue")}
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={saving}
              className="rounded-xl bg-brand-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed"
            >
              {saving ? t("onboarding.saving") : t("action.finishAndSave")}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
