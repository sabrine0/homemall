import { AdminMetricsManager } from "@/components/admin/admin-metrics-manager";

export default function AdminMetricsPage({
  searchParams,
}: {
  searchParams?: {
    zoneId?: string;
  };
}) {
  return <AdminMetricsManager initialZoneId={searchParams?.zoneId} />;
}
