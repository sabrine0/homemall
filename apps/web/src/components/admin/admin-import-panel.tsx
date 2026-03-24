"use client";

import { useMemo, useState } from "react";
import { clientApi } from "@/lib/client-api";

interface ImportResult {
  parsed: number;
  source: "generic" | "avito" | "mubawab";
  createdZones: number;
  updatedZones: number;
  createdListings: number;
  updatedListings: number;
  metricsUpdated: number;
  staleListingsPaused: number;
  errors: Array<{
    row: number;
    message: string;
  }>;
}

type ImportFormat = "csv" | "json";
type ImportSource = "generic" | "avito" | "mubawab";
type RefreshSource = "all" | "avito" | "mubawab";

interface RefreshResult {
  refreshedAt: string;
  avito?: ImportResult;
  mubawab?: ImportResult;
}

export function AdminImportPanel() {
  const [format, setFormat] = useState<ImportFormat>("csv");
  const [source, setSource] = useState<ImportSource>("generic");
  const [content, setContent] = useState("");
  const [deactivateMissing, setDeactivateMissing] = useState(true);
  const [fileName, setFileName] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [refreshSource, setRefreshSource] = useState<RefreshSource>("all");
  const [refreshing, setRefreshing] = useState(false);
  const [refreshResult, setRefreshResult] = useState<RefreshResult | null>(null);

  const previewRows = useMemo(() => {
    if (!content.trim()) return [];

    if (format === "csv") {
      return content
        .split(/\r?\n/)
        .filter((line) => line.trim())
        .slice(0, 6);
    }

    try {
      const parsed = JSON.parse(content) as unknown;
      const rows = Array.isArray(parsed)
        ? parsed
        : parsed &&
            typeof parsed === "object" &&
            Array.isArray((parsed as { rows?: unknown[] }).rows)
          ? (parsed as { rows: unknown[] }).rows
          : [];
      return rows.slice(0, 5).map((row) => JSON.stringify(row));
    } catch {
      return ["Invalid JSON preview"];
    }
  }, [content, format]);

  const readFile = async (file: File) => {
    const text = await file.text();
    setFileName(file.name);
    setContent(text);
    if (file.name.toLowerCase().endsWith(".json")) {
      setFormat("json");
    } else {
      setFormat("csv");
    }
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const response = await clientApi<ImportResult>("/api/admin/import", {
        method: "POST",
        body: JSON.stringify({
          source,
          format,
          content,
          deactivateMissing,
        }),
      });
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setSubmitting(false);
    }
  };

  const runMarketplaceRefresh = async () => {
    setRefreshing(true);
    setError(null);
    setRefreshResult(null);
    try {
      const response = await clientApi<RefreshResult>("/api/admin/import/refresh", {
        method: "POST",
        body: JSON.stringify({
          source: refreshSource,
          deactivateMissing,
        }),
      });
      setRefreshResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Live refresh failed");
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <section className="rounded-2xl border border-brand-200 bg-white/95 p-4 shadow-panel">
      <h2 className="text-xl font-semibold text-brand-900">
        Import Zones / Metrics
      </h2>
      <p className="mt-1 text-sm text-brand-700">
        Upload CSV or JSON and import real listings. Zones are upserted by
        `name+city`, listings are upserted by source listing id.
      </p>

      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <div className="rounded-xl border border-brand-200 bg-brand-50 p-3">
          <p className="text-sm font-semibold text-brand-900">
            Live marketplace refresh
          </p>
          <p className="mt-1 text-xs text-brand-700">
            Crawl Avito/Mubawab directly and upsert listings into database.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <select
              value={refreshSource}
              onChange={(event) =>
                setRefreshSource(event.target.value as RefreshSource)
              }
              className="rounded-lg border border-brand-200 px-2 py-1 text-sm"
            >
              <option value="all">All marketplaces</option>
              <option value="avito">Avito only</option>
              <option value="mubawab">Mubawab only</option>
            </select>
            <button
              type="button"
              disabled={refreshing}
              onClick={() => void runMarketplaceRefresh()}
              className="rounded-lg border border-brand-200 px-3 py-1.5 text-sm font-semibold text-brand-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {refreshing ? "Refreshing..." : "Run live refresh"}
            </button>
          </div>
          {refreshResult ? (
            <div className="mt-2 text-xs text-brand-800">
              <p>Refreshed at: {new Date(refreshResult.refreshedAt).toLocaleString()}</p>
              {refreshResult.avito ? (
                <p>
                  Avito: +{refreshResult.avito.createdListings} created,{" "}
                  {refreshResult.avito.updatedListings} updated
                </p>
              ) : null}
              {refreshResult.mubawab ? (
                <p>
                  Mubawab: +{refreshResult.mubawab.createdListings} created,{" "}
                  {refreshResult.mubawab.updatedListings} updated
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input
            type="file"
            accept=".csv,.json,text/csv,application/json"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              void readFile(file);
            }}
            className="text-sm"
          />

          <label className="text-sm">
            Source
            <select
              value={source}
              onChange={(event) =>
                setSource(event.target.value as ImportSource)
              }
              className="ml-2 rounded-lg border border-brand-200 px-2 py-1"
            >
              <option value="generic">Generic</option>
              <option value="avito">Avito</option>
              <option value="mubawab">Mubawab</option>
            </select>
          </label>

          <label className="text-sm">
            Format
            <select
              value={format}
              onChange={(event) =>
                setFormat(event.target.value as ImportFormat)
              }
              className="ml-2 rounded-lg border border-brand-200 px-2 py-1"
            >
              <option value="csv">CSV</option>
              <option value="json">JSON</option>
            </select>
          </label>
        </div>

        {fileName ? (
          <p className="text-sm text-brand-700">Loaded file: {fileName}</p>
        ) : null}

        <label className="block text-sm">
          Raw content
          <textarea
            rows={10}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            className="mt-1 w-full rounded-xl border border-brand-200 px-3 py-2 font-mono text-xs"
            placeholder={
              format === "csv"
                ? "name,city,centerLat,centerLng,noiseIndex,..."
                : "[{...}]"
            }
          />
        </label>

        {source !== "generic" ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
            <p className="font-semibold">Marketplace import fields</p>
            <p className="mt-1 text-xs">
              Suggested columns:
              `name,city,lat,lng,title,url,imageUrl,listingPurpose,listingType,price,areaM2,bedrooms,bathrooms`.
            </p>
            <p className="mt-1 text-xs">
              If scoring metrics are missing, HomeMall generates fallback
              metrics so imported listings still become searchable on map.
            </p>
          </div>
        ) : null}

        <label className="inline-flex items-center gap-2 text-sm text-brand-800">
          <input
            type="checkbox"
            checked={deactivateMissing}
            onChange={(event) => setDeactivateMissing(event.target.checked)}
          />
          Pause stale external listings that were not seen in this import run
        </label>

        <div className="rounded-xl border border-brand-100 bg-brand-50 p-3">
          <p className="text-xs uppercase tracking-[0.15em] text-brand-700">
            Preview
          </p>
          {previewRows.length ? (
            <ul className="mt-2 space-y-1 font-mono text-xs text-brand-800">
              {previewRows.map((row, index) => (
                <li key={`${row}_${index}`}>{row}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-brand-700">
              No preview available yet.
            </p>
          )}
        </div>

        {error ? <p className="text-sm text-red-700">{error}</p> : null}

        <button
          type="submit"
          disabled={submitting || !content.trim()}
          className="rounded-xl bg-brand-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed"
        >
          {submitting ? "Importing..." : "Confirm import"}
        </button>
      </form>

      {result ? (
        <div className="mt-4 rounded-xl border border-brand-200 bg-white p-3 text-sm">
          <p className="font-semibold text-brand-900">Import summary</p>
          {result.source ? (
            <p className="mt-1 text-brand-700">Source: {result.source}</p>
          ) : null}
          <p className="mt-1 text-brand-700">Rows parsed: {result.parsed}</p>
          <p className="text-brand-700">Zones created: {result.createdZones}</p>
          <p className="text-brand-700">Zones updated: {result.updatedZones}</p>
          <p className="text-brand-700">
            Listings created: {result.createdListings}
          </p>
          <p className="text-brand-700">
            Listings updated: {result.updatedListings}
          </p>
          <p className="text-brand-700">
            Metrics updated: {result.metricsUpdated}
          </p>
          <p className="text-brand-700">
            Stale listings paused: {result.staleListingsPaused}
          </p>

          {result.errors.length ? (
            <div className="mt-3">
              <p className="font-semibold text-red-700">Row errors</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-red-700">
                {result.errors.map((item) => (
                  <li key={`${item.row}-${item.message}`}>
                    Row {item.row}: {item.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
