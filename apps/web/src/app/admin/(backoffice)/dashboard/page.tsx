import Link from "next/link";
import { StatCard } from "@/components/ui/stat-card";
import { serverApi } from "@/lib/server-api";

interface DashboardResponse {
  zonesCount: number;
  usersCount: number;
  analysesCount: number;
  listingsCount: number;
  reportsCount: number;
  adminsCount: number;
}

export default async function AdminDashboardPage() {
  const stats = await serverApi<DashboardResponse>("/api/admin/dashboard");

  return (
    <section className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          title="Zones"
          value={String(stats.zonesCount)}
          subtitle="Configured and available for scoring"
        />
        <StatCard
          title="Listings"
          value={String(stats.listingsCount)}
          subtitle="Active + moderated marketplace inventory"
        />
        <StatCard
          title="Users"
          value={String(stats.usersCount)}
          subtitle="Registered platform accounts"
        />
        <StatCard
          title="Admins"
          value={String(stats.adminsCount)}
          subtitle="Super admins and managers"
        />
        <StatCard
          title="Analyses"
          value={String(stats.analysesCount)}
          subtitle="Saved analysis records"
        />
        <StatCard
          title="Reports"
          value={String(stats.reportsCount)}
          subtitle="User-submitted content reports"
        />
      </div>

      <div className="rounded-2xl border border-brand-200 bg-white/95 p-4 shadow-panel">
        <p className="text-xs uppercase tracking-[0.2em] text-brand-600">
          Quick Actions
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/admin/listings"
            className="rounded-xl border border-brand-200 px-3 py-2 text-sm font-semibold text-brand-800"
          >
            Moderate listings
          </Link>
          <Link
            href="/admin/zones"
            className="rounded-xl border border-brand-200 px-3 py-2 text-sm font-semibold text-brand-800"
          >
            Manage zones
          </Link>
          <Link
            href="/admin/metrics"
            className="rounded-xl border border-brand-200 px-3 py-2 text-sm font-semibold text-brand-800"
          >
            Edit metrics
          </Link>
          <Link
            href="/admin/import"
            className="rounded-xl border border-brand-200 px-3 py-2 text-sm font-semibold text-brand-800"
          >
            Refresh marketplace
          </Link>
          <Link
            href="/admin/admins"
            className="rounded-xl border border-brand-200 px-3 py-2 text-sm font-semibold text-brand-800"
          >
            Manage admins
          </Link>
          <Link
            href="/admin/settings"
            className="rounded-xl border border-brand-200 px-3 py-2 text-sm font-semibold text-brand-800"
          >
            System settings
          </Link>
          <Link
            href="/admin/reports"
            className="rounded-xl border border-brand-200 px-3 py-2 text-sm font-semibold text-brand-800"
          >
            Review reports
          </Link>
        </div>
      </div>
    </section>
  );
}
