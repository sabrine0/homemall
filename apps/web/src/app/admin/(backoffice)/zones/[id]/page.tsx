import { AdminZoneEditForm } from "@/components/admin/admin-zone-edit-form";

export default function AdminZoneEditPage({
  params,
}: {
  params: {
    id: string;
  };
}) {
  return <AdminZoneEditForm zoneId={params.id} />;
}
