"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ScoreBreakdown } from "@homemall/shared";
import { useI18n } from "@/components/i18n/i18n-provider";

export function ScoreBreakdownChart({
  breakdown,
}: {
  breakdown: ScoreBreakdown;
}) {
  const { t } = useI18n();
  const data = [
    { name: t("score.life"), value: breakdown.qualityOfLife },
    { name: t("score.mobility"), value: breakdown.mobility },
    { name: t("score.health"), value: breakdown.health },
    { name: t("score.climate"), value: breakdown.climateRisk },
    { name: t("score.services"), value: breakdown.services },
    { name: t("score.future"), value: breakdown.futureValue },
  ];

  return (
    <div className="h-72 w-full rounded-2xl border border-brand-200 bg-white/75 p-3">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="4 4" vertical={false} />
          <XAxis dataKey="name" />
          <YAxis domain={[0, 100]} />
          <Tooltip />
          <Bar dataKey="value" fill="#3a7257" radius={4} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
