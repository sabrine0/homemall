"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { clientApi } from "@/lib/client-api";

interface AdminZone {
  id: string;
  name: string;
  city: string;
  centerLat: number;
  centerLng: number;
  metaJson: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  metrics?: {
    id: string;
    createdAt: string;
    updatedAt: string;
  } | null;
}

interface AdminZonesResponse {
  items: AdminZone[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

interface ZoneDraft {
  name: string;
  city: string;
  centerLat: string;
  centerLng: string;
  parks: string;
  schools: string;
  hospitals: string;
  gyms: string;
  metaJsonText: string;
}

const defaultDraft: ZoneDraft = {
  name: "",
  city: "",
  centerLat: "33.5731",
  centerLng: "-7.5898",
  parks: "",
  schools: "",
  hospitals: "",
  gyms: "",
  metaJsonText: "{}",
};

export function AdminZonesManager() {
  const [zones, setZones] = useState<AdminZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [draft, setDraft] = useState<ZoneDraft>(defaultDraft);

  const query = useMemo(() => {
    const params = new URLSearchParams({
      page: String(page),
      limit: "10",
    });
    if (search.trim()) {
      params.set("search", search.trim());
    }
    return params.toString();
  }, [page, search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await clientApi<AdminZonesResponse>(
        `/api/admin/zones?${query}`,
      );
      setZones(response.items);
      setTotal(response.total);
      setPages(response.pages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load zones");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void load();
  }, [load]);

  const submitCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const parsedMeta = JSON.parse(draft.metaJsonText || "{}") as Record<
        string,
        unknown
      >;
      const metaJson: Record<string, unknown> = { ...parsedMeta };
      (["parks", "schools", "hospitals", "gyms"] as const).forEach((key) => {
        const raw = draft[key].trim();
        if (!raw) return;
        const value = Number(raw);
        if (Number.isFinite(value)) {
          metaJson[key] = value;
        }
      });
      await clientApi<{ zone: AdminZone }>("/api/admin/zones", {
        method: "POST",
        body: JSON.stringify({
          name: draft.name,
          city: draft.city,
          centerLat: Number(draft.centerLat),
          centerLng: Number(draft.centerLng),
          metaJson,
        }),
      });
      setDraft(defaultDraft);
      setPage(1);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create zone");
    } finally {
      setSubmitting(false);
    }
  };

  const deleteZone = async (zoneId: string) => {
    const shouldDelete = window.confirm("Delete this zone?");
    if (!shouldDelete) return;

    try {
      await clientApi(`/api/admin/zones/${zoneId}`, {
        method: "DELETE",
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete zone");
    }
  };

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-brand-200 bg-white/95 p-4 shadow-panel">
        <h2 className="text-lg font-semibold text-brand-900">Create Zone</h2>
        <p className="mt-1 text-sm text-brand-700">
          Create a new zone record. Metrics can be added in the metrics page.
        </p>
        <form onSubmit={submitCreate} className="mt-4 space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block space-y-1 text-sm">
              Name
              <input
                required
                value={draft.name}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, name: event.target.value }))
                }
                className="w-full rounded-xl border border-brand-200 px-3 py-2"
              />
            </label>
            <label className="block space-y-1 text-sm">
              City
              <input
                required
                value={draft.city}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, city: event.target.value }))
                }
                className="w-full rounded-xl border border-brand-200 px-3 py-2"
              />
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="block space-y-1 text-sm">
              Center latitude
              <input
                required
                type="number"
                step="0.0001"
                value={draft.centerLat}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    centerLat: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-brand-200 px-3 py-2"
              />
            </label>
            <label className="block space-y-1 text-sm">
              Center longitude
              <input
                required
                type="number"
                step="0.0001"
                value={draft.centerLng}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    centerLng: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-brand-200 px-3 py-2"
              />
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <label className="block space-y-1 text-sm">
              Parks
              <input
                type="number"
                min={0}
                value={draft.parks}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, parks: event.target.value }))
                }
                className="w-full rounded-xl border border-brand-200 px-3 py-2"
                placeholder="e.g. 9"
              />
            </label>
            <label className="block space-y-1 text-sm">
              Schools
              <input
                type="number"
                min={0}
                value={draft.schools}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, schools: event.target.value }))
                }
                className="w-full rounded-xl border border-brand-200 px-3 py-2"
                placeholder="e.g. 11"
              />
            </label>
            <label className="block space-y-1 text-sm">
              Hospitals
              <input
                type="number"
                min={0}
                value={draft.hospitals}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    hospitals: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-brand-200 px-3 py-2"
                placeholder="e.g. 2"
              />
            </label>
            <label className="block space-y-1 text-sm">
              Gyms
              <input
                type="number"
                min={0}
                value={draft.gyms}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, gyms: event.target.value }))
                }
                className="w-full rounded-xl border border-brand-200 px-3 py-2"
                placeholder="e.g. 4"
              />
            </label>
          </div>

          <details className="rounded-xl border border-brand-200 bg-brand-50/40 p-3">
            <summary className="cursor-pointer text-sm font-semibold text-brand-800">
              Advanced JSON (optional)
            </summary>
            <label className="mt-2 block space-y-1 text-sm">
              Extra data (`metaJson`)
              <textarea
                rows={4}
                value={draft.metaJsonText}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    metaJsonText: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-brand-200 px-3 py-2 font-mono text-xs"
              />
            </label>
          </details>

          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-brand-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed"
          >
            {submitting ? "Creating..." : "Create zone"}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-brand-200 bg-white/95 p-4 shadow-panel">
        <div className="flex flex-wrap items-end gap-2">
          <label className="min-w-[220px] flex-1 text-sm">
            Search
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Zone name or city"
              className="mt-1 w-full rounded-xl border border-brand-200 px-3 py-2"
            />
          </label>
          <button
            type="button"
            onClick={() => {
              setPage(1);
              setSearch(searchInput);
            }}
            className="rounded-xl border border-brand-200 px-4 py-2 text-sm font-semibold text-brand-800"
          >
            Search
          </button>
          <button
            type="button"
            onClick={() => {
              setSearchInput("");
              setSearch("");
              setPage(1);
            }}
            className="rounded-xl border border-brand-200 px-4 py-2 text-sm font-semibold text-brand-800"
          >
            Clear
          </button>
        </div>

        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-brand-200 text-left text-brand-700">
                <th className="px-2 py-2">Name</th>
                <th className="px-2 py-2">City</th>
                <th className="px-2 py-2">Coordinates</th>
                <th className="px-2 py-2">Metrics</th>
                <th className="px-2 py-2">Audit</th>
                <th className="px-2 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-2 py-4 text-brand-700">
                    Loading zones...
                  </td>
                </tr>
              ) : null}

              {!loading && !zones.length ? (
                <tr>
                  <td colSpan={6} className="px-2 py-4 text-brand-700">
                    No zones found.
                  </td>
                </tr>
              ) : null}

              {!loading
                ? zones.map((zone) => (
                    <tr key={zone.id} className="border-b border-brand-100">
                      <td className="px-2 py-2 font-medium text-brand-900">
                        {zone.name}
                      </td>
                      <td className="px-2 py-2 text-brand-800">{zone.city}</td>
                      <td className="px-2 py-2 text-brand-700">
                        {zone.centerLat.toFixed(4)}, {zone.centerLng.toFixed(4)}
                      </td>
                      <td className="px-2 py-2 text-brand-700">
                        {zone.metrics ? "Configured" : "Missing"}
                      </td>
                      <td className="px-2 py-2 text-brand-700">
                        <p>
                          Created:{" "}
                          {new Date(zone.createdAt).toLocaleDateString()}
                        </p>
                        <p>
                          Updated:{" "}
                          {new Date(zone.updatedAt).toLocaleDateString()}
                        </p>
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/admin/zones/${zone.id}`}
                            className="rounded-lg border border-brand-200 px-2 py-1 text-xs font-semibold text-brand-800"
                          >
                            Edit
                          </Link>
                          <button
                            type="button"
                            onClick={() => deleteZone(zone.id)}
                            className="rounded-lg border border-red-200 px-2 py-1 text-xs font-semibold text-red-700"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                : null}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex items-center justify-between text-sm text-brand-700">
          <p>
            {total} total results • Page {page} of {pages}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              className="rounded-lg border border-brand-200 px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= pages}
              onClick={() => setPage((prev) => Math.min(pages, prev + 1))}
              className="rounded-lg border border-brand-200 px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
