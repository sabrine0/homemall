"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { FutureOutlook } from "@homemall/shared";

type OutlookPoint = {
  horizon: string;
  value: number;
};

type DotProps = {
  cx?: number;
  cy?: number;
  payload?: OutlookPoint;
};

const getPointColor = (value: number, minValue: number, maxValue: number) => {
  if (maxValue === minValue) {
    return "#eab308"; // Yellow when all values are equal.
  }

  if (value === maxValue) {
    return "#00ff5eff"; // Green for best value.
  }

  if (value === minValue) {
    return "#ff0000ff"; // Red for worst value.
  }

  return "#ffbf00ff"; // Yellow for medium value.
};

export function FutureOutlookChart({ outlook }: { outlook: FutureOutlook }) {
  const data: OutlookPoint[] = [
    { horizon: "Now", value: 0 },
    { horizon: "5Y", value: outlook.years5 },
    { horizon: "10Y", value: outlook.years10 },
  ];
  const values = data.map((item) => item.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);

  return (
    <div className="h-64 w-full rounded-2xl border border-brand-200 bg-white/75 p-3">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="4 4" vertical={false} />
          <XAxis dataKey="horizon" />
          <YAxis />
          <Tooltip formatter={(value: number) => `${value}%`} />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#8b5a3c"
            strokeWidth={3}
            dot={(props: unknown) => {
              const point = props as DotProps;
              if (
                point.cx === undefined ||
                point.cy === undefined ||
                point.payload === undefined
              ) {
                return <g />;
              }

              const color = getPointColor(
                point.payload.value,
                minValue,
                maxValue,
              );
              return (
                <circle
                  cx={point.cx}
                  cy={point.cy}
                  r={6}
                  fill={color}
                  stroke="#ffffff"
                  strokeWidth={2}
                />
              );
            }}
            activeDot={(props: unknown) => {
              const point = props as DotProps;
              if (
                point.cx === undefined ||
                point.cy === undefined ||
                point.payload === undefined
              ) {
                return <g />;
              }

              const color = getPointColor(
                point.payload.value,
                minValue,
                maxValue,
              );
              return (
                <circle
                  cx={point.cx}
                  cy={point.cy}
                  r={7}
                  fill={color}
                  stroke="#ffffff"
                  strokeWidth={2}
                />
              );
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
