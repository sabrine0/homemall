"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AdminPermission, UserRole } from "@homemall/shared";
import { clientApi } from "@/lib/client-api";

interface UserRow {
  id: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  adminPermissions: AdminPermission[];
  createdAt: string;
}

interface UsersResponse {
  items: UserRow[];
  total: number;
  page: number;
  pages: number;
  limit: number;
}

const permissionOptions: AdminPermission[] = [
  "MANAGE_USERS",
  "MANAGE_LISTINGS",
  "MODERATE_REPORTS",
  "MANAGE_IMPORTS",
  "MANAGE_SETTINGS",
  "MANAGE_ADMINS",
];

export function AdminUsersTable() {
  const [items, setItems] = useState<UserRow[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [edits, setEdits] = useState<
    Record<
      string,
      {
        role: UserRole;
        isActive: boolean;
        adminPermissions: AdminPermission[];
      }
    >
  >({});

  const query = useMemo(() => {
    const params = new URLSearchParams({
      page: String(page),
      limit: "12",
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
      const response = await clientApi<UsersResponse>(`/api/admin/users?${query}`);
      setItems(response.items);
      setPages(response.pages);
      setTotal(response.total);
      const nextEdits: typeof edits = {};
      response.items.forEach((item) => {
        nextEdits[item.id] = {
          role: item.role,
          isActive: item.isActive,
          adminPermissions: item.adminPermissions,
        };
      });
      setEdits(nextEdits);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void load();
  }, [load]);

  const togglePermission = (current: AdminPermission[], permission: AdminPermission) =>
    current.includes(permission)
      ? current.filter((item) => item !== permission)
      : [...current, permission];

  const saveUser = async (userId: string) => {
    const edit = edits[userId];
    if (!edit) return;

    setBusyId(userId);
    setError(null);
    try {
      await clientApi(`/api/admin/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify(edit),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update user");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="rounded-2xl border border-brand-200 bg-white/95 p-4 shadow-panel">
      <h2 className="text-xl font-semibold text-brand-900">Users</h2>
      <p className="mt-1 text-sm text-brand-700">
        Manage user activation and roles. Managers can moderate standard users,
        while Super Admin can assign admin roles and permissions.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <input
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search email"
          className="min-w-[220px] flex-1 rounded-xl border border-brand-200 px-3 py-2 text-sm"
        />
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

      <div className="mt-4 space-y-3">
        {loading ? (
          <p className="text-sm text-brand-700">Loading users...</p>
        ) : null}
        {!loading && !items.length ? (
          <p className="text-sm text-brand-700">No users found.</p>
        ) : null}
        {!loading
          ? items.map((user) => {
              const edit = edits[user.id];
              if (!edit) return null;
              const isAdminRole = edit.role === "SUPER_ADMIN" || edit.role === "MANAGER";

              return (
                <article
                  key={user.id}
                  className="rounded-xl border border-brand-200 bg-white p-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-brand-900">{user.email}</p>
                      <p className="text-xs text-brand-700">
                        Created {new Date(user.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={busyId === user.id}
                      onClick={() => void saveUser(user.id)}
                      className="rounded-lg border border-brand-200 px-3 py-1 text-xs font-semibold text-brand-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {busyId === user.id ? "Saving..." : "Save"}
                    </button>
                  </div>

                  <div className="mt-3 grid gap-2 md:grid-cols-3">
                    <select
                      value={edit.role}
                      onChange={(event) =>
                        setEdits((prev) => ({
                          ...prev,
                          [user.id]: {
                            ...prev[user.id],
                            role: event.target.value as UserRole,
                          },
                        }))
                      }
                      className="rounded-lg border border-brand-200 px-2 py-1 text-sm"
                    >
                      <option value="USER">USER</option>
                      <option value="MANAGER">MANAGER</option>
                      <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                    </select>
                    <label className="inline-flex items-center gap-2 rounded-lg border border-brand-200 px-2 py-1 text-sm text-brand-800">
                      <input
                        type="checkbox"
                        checked={edit.isActive}
                        onChange={(event) =>
                          setEdits((prev) => ({
                            ...prev,
                            [user.id]: {
                              ...prev[user.id],
                              isActive: event.target.checked,
                            },
                          }))
                        }
                      />
                      Active
                    </label>
                  </div>

                  {isAdminRole ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {permissionOptions.map((permission) => (
                        <label
                          key={`${user.id}-${permission}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-brand-200 px-2 py-1 text-xs"
                        >
                          <input
                            type="checkbox"
                            checked={edit.adminPermissions.includes(permission)}
                            onChange={() =>
                              setEdits((prev) => ({
                                ...prev,
                                [user.id]: {
                                  ...prev[user.id],
                                  adminPermissions: togglePermission(
                                    prev[user.id].adminPermissions,
                                    permission
                                  ),
                                },
                              }))
                            }
                          />
                          {permission}
                        </label>
                      ))}
                    </div>
                  ) : null}
                </article>
              );
            })
          : null}
      </div>

      <div className="mt-3 flex items-center justify-between text-sm text-brand-700">
        <p>
          {total} total users • Page {page} of {pages}
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
