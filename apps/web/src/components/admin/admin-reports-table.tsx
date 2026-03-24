"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { clientApi } from "@/lib/client-api";

interface ReportRow {
  id: string;
  kind: "analysis" | "listing_report";
  createdAt: string;
  user: {
    id: string;
    email: string;
    role: "USER" | "SUPER_ADMIN" | "MANAGER";
    isActive: boolean;
  };
  zone: {
    id: string;
    name: string;
    city: string;
  };
  listing?: {
    id: string;
    title: string;
    seller: {
      id: string;
      email: string;
    };
  };
  reason?: string;
}

interface ReportsResponse {
  items: ReportRow[];
  total: number;
  page: number;
  pages: number;
  limit: number;
}

export function AdminReportsTable() {
  const [items, setItems] = useState<ReportRow[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyListingId, setBusyListingId] = useState<string | null>(null);

  const query = useMemo(
    () => new URLSearchParams({ page: String(page), limit: "12" }).toString(),
    [page],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await clientApi<ReportsResponse>(
        `/api/admin/reports?${query}`,
      );
      setItems(response.items);
      setPages(response.pages);
      setTotal(response.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reports");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void load();
  }, [load]);

  const moderateListing = async (
    listingId: string,
    status: "paused" | "closed",
  ) => {
    setBusyListingId(listingId);
    setError(null);
    try {
      await clientApi(`/api/admin/listings/${listingId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await load();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to moderate listing",
      );
    } finally {
      setBusyListingId(null);
    }
  };

  return (
    <section className="rounded-2xl border border-brand-200 bg-white/95 p-4 shadow-panel">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold text-brand-900">
            Admin Reports
          </h2>
          <p className="mt-1 text-sm text-brand-700">
            Combined stream of decision reports and listing abuse reports.
          </p>
        </div>
        <a
          href="/api/admin/reports/export"
          className="rounded-xl border border-brand-200 px-3 py-2 text-sm font-semibold text-brand-800 hover:bg-brand-50"
        >
          Export JSON
        </a>
      </div>

      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-brand-200 text-left text-brand-700">
              <th className="px-2 py-2">Created at</th>
              <th className="px-2 py-2">Type</th>
              <th className="px-2 py-2">Reporter</th>
              <th className="px-2 py-2">Role</th>
              <th className="px-2 py-2">Target</th>
              <th className="px-2 py-2">Reason</th>
              <th className="px-2 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-2 py-4 text-brand-700">
                  Loading reports...
                </td>
              </tr>
            ) : null}
            {!loading && !items.length ? (
              <tr>
                <td colSpan={7} className="px-2 py-4 text-brand-700">
                  No report rows found yet.
                </td>
              </tr>
            ) : null}
            {!loading
              ? items.map((item) => (
                  <tr key={item.id} className="border-b border-brand-100">
                    <td className="px-2 py-2 text-brand-700">
                      {new Date(item.createdAt).toLocaleString()}
                    </td>
                    <td className="px-2 py-2 text-brand-700">
                      {item.kind === "listing_report"
                        ? "Listing report"
                        : "Decision report"}
                    </td>
                    <td className="px-2 py-2 font-medium text-brand-900">
                      {item.user.email}
                    </td>
                    <td className="px-2 py-2 text-brand-700">
                      {item.user.role}
                    </td>
                    <td className="px-2 py-2 text-brand-700">
                      {item.kind === "listing_report"
                        ? `${item.listing?.title ?? "Unknown listing"} (${item.zone.name}, ${item.zone.city})`
                        : `${item.zone.name} (${item.zone.city})`}
                    </td>
                    <td className="px-2 py-2 text-brand-700">
                      {item.reason?.trim() || "-"}
                    </td>
                    <td className="px-2 py-2">
                      {item.kind === "listing_report" && item.listing ? (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={busyListingId === item.listing.id}
                            onClick={() =>
                              void moderateListing(item.listing!.id, "paused")
                            }
                            className="rounded-lg border border-brand-200 px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Pause
                          </button>
                          <button
                            type="button"
                            disabled={busyListingId === item.listing.id}
                            onClick={() =>
                              void moderateListing(item.listing!.id, "closed")
                            }
                            className="rounded-lg border border-red-300 px-2 py-1 text-xs text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Close
                          </button>
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))
              : null}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-between text-sm text-brand-700">
        <p>
          {total} total rows • Page {page} of {pages}
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
  );
}
