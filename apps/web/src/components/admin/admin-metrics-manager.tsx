"use client";

import { useEffect, useMemo, useState } from "react";
import { clientApi } from "@/lib/client-api";

interface ZoneItem {
  id: string;
  name: string;
  city: string;
}

interface ZoneListResponse {
  items: Array<ZoneItem>;
  page: number;
  pages: number;
  total: number;
}

interface ZoneMetrics {
  noiseIndex: number;
  greenIndex: number;
  airQualityIndex: number;
  pollenIndex: number;
  floodRiskIndex: number;
  heatIndex: number;
  transitIndex: number;
  walkIndex: number;
  futureValueIndex: number;
  zoningRiskIndex: number;
  createdAt?: string;
  updatedAt?: string;
}

type EditableMetricKey =
  | "noiseIndex"
  | "greenIndex"
  | "airQualityIndex"
  | "pollenIndex"
  | "floodRiskIndex"
  | "heatIndex"
  | "transitIndex"
  | "walkIndex"
  | "futureValueIndex"
  | "zoningRiskIndex";

interface MetricsResponse {
  metrics: ZoneMetrics | null;
}

const metricKeys: EditableMetricKey[] = [
  "noiseIndex",
  "greenIndex",
  "airQualityIndex",
  "pollenIndex",
  "floodRiskIndex",
  "heatIndex",
  "transitIndex",
  "walkIndex",
  "futureValueIndex",
  "zoningRiskIndex",
];

const defaultMetrics: ZoneMetrics = {
  noiseIndex: 50,
  greenIndex: 50,
  airQualityIndex: 50,
  pollenIndex: 50,
  floodRiskIndex: 50,
  heatIndex: 50,
  transitIndex: 50,
  walkIndex: 50,
  futureValueIndex: 50,
  zoningRiskIndex: 50,
  createdAt: undefined,
  updatedAt: undefined,
};

export function AdminMetricsManager({
  initialZoneId,
}: {
  initialZoneId?: string;
}) {
  const [zones, setZones] = useState<ZoneItem[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<string>("");
  const [metrics, setMetrics] = useState<ZoneMetrics>(defaultMetrics);
  const [loadingZones, setLoadingZones] = useState(true);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadZones = async () => {
      setLoadingZones(true);
      setError(null);
      try {
        const response = await clientApi<ZoneListResponse>(
          "/api/admin/zones?page=1&limit=200",
        );
        setZones(response.items);
        const preferredZoneId =
          (initialZoneId &&
            response.items.find((item) => item.id === initialZoneId)?.id) ||
          response.items[0]?.id ||
          "";
        setSelectedZoneId(preferredZoneId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load zones");
      } finally {
        setLoadingZones(false);
      }
    };

    void loadZones();
  }, [initialZoneId]);

  useEffect(() => {
    if (!selectedZoneId) return;

    const loadMetrics = async () => {
      setLoadingMetrics(true);
      setError(null);
      try {
        const response = await clientApi<MetricsResponse>(
          `/api/admin/zones/${selectedZoneId}/metrics`,
        );
        setMetrics(response.metrics ?? defaultMetrics);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load metrics");
      } finally {
        setLoadingMetrics(false);
      }
    };

    void loadMetrics();
  }, [selectedZoneId]);

  const selectedZoneLabel = useMemo(() => {
    const zone = zones.find((item) => item.id === selectedZoneId);
    return zone ? `${zone.name} (${zone.city})` : "";
  }, [selectedZoneId, zones]);

  const saveMetrics = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedZoneId) return;

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await clientApi(`/api/admin/zones/${selectedZoneId}/metrics`, {
        method: "PUT",
        body: JSON.stringify(metrics),
      });
      setMessage("Metrics updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update metrics");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-2xl border border-brand-200 bg-white/95 p-4 shadow-panel">
      <h2 className="text-xl font-semibold text-brand-900">Zone Metrics</h2>
      <p className="mt-1 text-sm text-brand-700">
        Edit scoring metrics per zone. Values are normalized from 0 to 100.
      </p>

      {loadingZones ? (
        <p className="mt-3 text-sm text-brand-700">Loading zones...</p>
      ) : (
        <label className="mt-4 block text-sm">
          Zone
          <select
            value={selectedZoneId}
            onChange={(event) => setSelectedZoneId(event.target.value)}
            className="mt-1 w-full rounded-xl border border-brand-200 px-3 py-2"
          >
            {zones.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.name} ({zone.city})
              </option>
            ))}
          </select>
        </label>
      )}

      {selectedZoneLabel ? (
        <p className="mt-2 text-sm text-brand-700">
          Editing: {selectedZoneLabel}
        </p>
      ) : null}
      {metrics.createdAt ? (
        <p className="mt-1 text-xs text-brand-600">
          Metrics created: {new Date(metrics.createdAt).toLocaleString()} •
          Updated:{" "}
          {metrics.updatedAt
            ? new Date(metrics.updatedAt).toLocaleString()
            : "-"}
        </p>
      ) : null}

      <form onSubmit={saveMetrics} className="mt-4 space-y-3">
        <div className="grid gap-3 md:grid-cols-2">
          {metricKeys.map((key) => (
            <label key={key} className="block text-sm">
              {key}
              <input
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={metrics[key]}
                onChange={(event) =>
                  setMetrics((prev) => ({
                    ...prev,
                    [key]: Number(event.target.value),
                  }))
                }
                className="mt-1 w-full rounded-xl border border-brand-200 px-3 py-2"
                disabled={loadingMetrics}
              />
            </label>
          ))}
        </div>

        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        {message ? <p className="text-sm text-green-700">{message}</p> : null}

        <button
          type="submit"
          disabled={saving || loadingMetrics || !selectedZoneId}
          className="rounded-xl bg-brand-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed"
        >
          {saving ? "Saving..." : "Save metrics"}
        </button>
      </form>
    </section>
  );
}
