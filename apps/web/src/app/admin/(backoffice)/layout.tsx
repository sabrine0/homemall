import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdminUser } from "@/lib/admin-server";

export default async function AdminBackofficeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdminUser();

  return <AdminShell user={user}>{children}</AdminShell>;
}
