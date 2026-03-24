"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ListingOffer, ListingStatus } from "@homemall/shared";
import { clientApi } from "@/lib/client-api";

interface ListingsResponse {
  items: ListingOffer[];
  total: number;
  page: number;
  pages: number;
  limit: number;
}

const statusOptions: ListingStatus[] = ["active", "paused", "closed"];

export function AdminListingsTable() {
  const [items, setItems] = useState<ListingOffer[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | ListingStatus>("all");
  const [isExternal, setIsExternal] = useState<"all" | "true" | "false">("all");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const query = useMemo(() => {
    const params = new URLSearchParams({
      page: String(page),
      limit: "20"
    });
    if (search.trim()) {
      params.set("search", search.trim());
    }
    if (status !== "all") {
      params.set("status", status);
    }
    if (isExternal !== "all") {
      params.set("isExternal", isExternal);
    }
    return params.toString();
  }, [isExternal, page, search, status]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await clientApi<ListingsResponse>(
        `/api/admin/listings?${query}`
      );
      setItems(response.items);
      setPages(response.pages);
      setTotal(response.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load listings");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateStatus = async (listingId: string, nextStatus: ListingStatus) => {
    setBusyId(listingId);
    setError(null);
    try {
      await clientApi(`/api/admin/listings/${listingId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus })
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setBusyId(null);
    }
  };

  const deleteListing = async (listingId: string) => {
    const confirmed = window.confirm("Delete this listing?");
    if (!confirmed) return;
    setBusyId(listingId);
    setError(null);
    try {
      await clientApi(`/api/admin/listings/${listingId}`, {
        method: "DELETE"
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete listing");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="rounded-2xl border border-brand-200 bg-white/95 p-4 shadow-panel">
      <h2 className="text-xl font-semibold text-brand-900">Listings</h2>
      <p className="mt-1 text-sm text-brand-700">
        Manage all listings, including imported Avito/Mubawab content.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <input
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search title, city, seller..."
          className="min-w-[220px] flex-1 rounded-xl border border-brand-200 px-3 py-2 text-sm"
        />
        <select
          value={status}
          onChange={(event) => {
            setPage(1);
            setStatus(event.target.value as "all" | ListingStatus);
          }}
          className="rounded-xl border border-brand-200 px-3 py-2 text-sm"
        >
          <option value="all">All status</option>
          {statusOptions.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <select
          value={isExternal}
          onChange={(event) => {
            setPage(1);
            setIsExternal(event.target.value as "all" | "true" | "false");
          }}
          className="rounded-xl border border-brand-200 px-3 py-2 text-sm"
        >
          <option value="all">All sources</option>
          <option value="true">External only</option>
          <option value="false">Manual only</option>
        </select>
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
      </div>

      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-brand-200 text-left text-brand-700">
              <th className="px-2 py-2">Listing</th>
              <th className="px-2 py-2">Zone</th>
              <th className="px-2 py-2">Source</th>
              <th className="px-2 py-2">Status</th>
              <th className="px-2 py-2">Updated</th>
              <th className="px-2 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-2 py-4 text-brand-700" colSpan={6}>
                  Loading listings...
                </td>
              </tr>
            ) : null}
            {!loading && !items.length ? (
              <tr>
                <td className="px-2 py-4 text-brand-700" colSpan={6}>
                  No listings found.
                </td>
              </tr>
            ) : null}
            {!loading
              ? items.map((item) => (
                  <tr key={item.id} className="border-b border-brand-100 align-top">
                    <td className="px-2 py-2 text-brand-900">
                      <p className="font-medium">{item.title}</p>
                      <p className="text-xs text-brand-700">
                        {item.purpose} • {item.type}
                      </p>
                    </td>
                    <td className="px-2 py-2 text-brand-700">
                      {item.zoneName ?? "-"}
                      {item.zoneCity ? ` (${item.zoneCity})` : ""}
                    </td>
                    <td className="px-2 py-2 text-brand-700">
                      {item.sourcePlatform ?? "manual"}
                    </td>
                    <td className="px-2 py-2 text-brand-700">{item.status}</td>
                    <td className="px-2 py-2 text-brand-700">
                      {new Date(item.updatedAt).toLocaleString()}
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex flex-wrap gap-2">
                        {statusOptions.map((nextStatus) => (
                          <button
                            key={nextStatus}
                            type="button"
                            disabled={busyId === item.id || item.status === nextStatus}
                            onClick={() => void updateStatus(item.id, nextStatus)}
                            className="rounded-lg border border-brand-200 px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {nextStatus}
                          </button>
                        ))}
                        <button
                          type="button"
                          disabled={busyId === item.id}
                          onClick={() => void deleteListing(item.id)}
                          className="rounded-lg border border-red-300 px-2 py-1 text-xs text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
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
          {total} total listings • Page {page} of {pages}
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
