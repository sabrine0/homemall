"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clientApi } from "@/lib/client-api";

interface ZonePayload {
  id: string;
  name: string;
  city: string;
  centerLat: number;
  centerLng: number;
  metaJson: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

interface ZoneResponse {
  zone: ZonePayload;
}

interface ZoneForm {
  name: string;
  city: string;
  centerLat: string;
  centerLng: string;
  metaJsonText: string;
}

interface ZoneAmenitiesForm {
  parks: string;
  schools: string;
  hospitals: string;
  gyms: string;
}

const toCount = (value: unknown): string => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return "";
};

export function AdminZoneEditForm({ zoneId }: { zoneId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<ZoneForm>({
    name: "",
    city: "",
    centerLat: "",
    centerLng: "",
    metaJsonText: "{}",
  });
  const [amenities, setAmenities] = useState<ZoneAmenitiesForm>({
    parks: "",
    schools: "",
    hospitals: "",
    gyms: "",
  });
  const [audit, setAudit] = useState<{
    createdAt: string;
    updatedAt: string;
  } | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await clientApi<ZoneResponse>(
          `/api/admin/zones/${zoneId}`,
        );
        const zone = response.zone;
        setForm({
          name: zone.name,
          city: zone.city,
          centerLat: String(zone.centerLat),
          centerLng: String(zone.centerLng),
          metaJsonText: JSON.stringify(zone.metaJson ?? {}, null, 2),
        });
        setAmenities({
          parks: toCount(zone.metaJson?.parks),
          schools: toCount(zone.metaJson?.schools),
          hospitals: toCount(zone.metaJson?.hospitals),
          gyms: toCount(zone.metaJson?.gyms),
        });
        setAudit({
          createdAt: zone.createdAt,
          updatedAt: zone.updatedAt,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load zone");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [zoneId]);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const metaJson = JSON.parse(form.metaJsonText || "{}") as Record<
        string,
        unknown
      >;
      (["parks", "schools", "hospitals", "gyms"] as const).forEach((key) => {
        const raw = amenities[key].trim();
        if (!raw) return;
        const value = Number(raw);
        if (Number.isFinite(value)) {
          metaJson[key] = value;
        }
      });
      await clientApi<ZoneResponse>(`/api/admin/zones/${zoneId}`, {
        method: "PUT",
        body: JSON.stringify({
          name: form.name,
          city: form.city,
          centerLat: Number(form.centerLat),
          centerLng: Number(form.centerLng),
          metaJson,
        }),
      });
      router.push("/admin/zones");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update zone");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    const shouldDelete = window.confirm("Delete this zone?");
    if (!shouldDelete) return;
    try {
      await clientApi(`/api/admin/zones/${zoneId}`, { method: "DELETE" });
      router.push("/admin/zones");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete zone");
    }
  };

  if (loading) {
    return <p className="text-sm text-brand-700">Loading zone...</p>;
  }

  return (
    <section className="rounded-2xl border border-brand-200 bg-white/95 p-4 shadow-panel">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm text-brand-600">Zone editor</p>
          <h2 className="text-xl font-semibold text-brand-900">Edit zone</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/admin/metrics?zoneId=${zoneId}`}
            className="rounded-xl border border-brand-200 px-3 py-2 text-sm font-semibold text-brand-800"
          >
            Edit metrics
          </Link>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-700"
          >
            Delete
          </button>
        </div>
      </div>

      {audit ? (
        <p className="mt-3 text-xs text-brand-600">
          Created: {new Date(audit.createdAt).toLocaleString()} • Updated:{" "}
          {new Date(audit.updatedAt).toLocaleString()}
        </p>
      ) : null}

      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="block space-y-1 text-sm">
            Name
            <input
              required
              value={form.name}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, name: event.target.value }))
              }
              className="w-full rounded-xl border border-brand-200 px-3 py-2"
            />
          </label>
          <label className="block space-y-1 text-sm">
            City
            <input
              required
              value={form.city}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, city: event.target.value }))
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
              value={form.centerLat}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, centerLat: event.target.value }))
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
              value={form.centerLng}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, centerLng: event.target.value }))
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
              value={amenities.parks}
              onChange={(event) =>
                setAmenities((prev) => ({ ...prev, parks: event.target.value }))
              }
              className="w-full rounded-xl border border-brand-200 px-3 py-2"
            />
          </label>
          <label className="block space-y-1 text-sm">
            Schools
            <input
              type="number"
              min={0}
              value={amenities.schools}
              onChange={(event) =>
                setAmenities((prev) => ({
                  ...prev,
                  schools: event.target.value,
                }))
              }
              className="w-full rounded-xl border border-brand-200 px-3 py-2"
            />
          </label>
          <label className="block space-y-1 text-sm">
            Hospitals
            <input
              type="number"
              min={0}
              value={amenities.hospitals}
              onChange={(event) =>
                setAmenities((prev) => ({
                  ...prev,
                  hospitals: event.target.value,
                }))
              }
              className="w-full rounded-xl border border-brand-200 px-3 py-2"
            />
          </label>
          <label className="block space-y-1 text-sm">
            Gyms
            <input
              type="number"
              min={0}
              value={amenities.gyms}
              onChange={(event) =>
                setAmenities((prev) => ({ ...prev, gyms: event.target.value }))
              }
              className="w-full rounded-xl border border-brand-200 px-3 py-2"
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
              rows={8}
              value={form.metaJsonText}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  metaJsonText: event.target.value,
                }))
              }
              className="w-full rounded-xl border border-brand-200 px-3 py-2 font-mono text-xs"
            />
          </label>
        </details>

        {error ? <p className="text-sm text-red-700">{error}</p> : null}

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-brand-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
          <Link
            href="/admin/zones"
            className="rounded-xl border border-brand-200 px-4 py-2 text-sm font-semibold text-brand-800"
          >
            Cancel
          </Link>
        </div>
      </form>
    </section>
  );
}
