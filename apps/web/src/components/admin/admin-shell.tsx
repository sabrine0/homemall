import Link from "next/link";
import type { AdminPermission, UserRole } from "@homemall/shared";

const navItems: Array<{
  href: string;
  label: string;
  roles?: UserRole[];
  permission?: AdminPermission;
}> = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/listings", label: "Listings", permission: "MANAGE_LISTINGS" },
  { href: "/admin/zones", label: "Zones", permission: "MANAGE_SETTINGS" },
  { href: "/admin/metrics", label: "Metrics", permission: "MANAGE_SETTINGS" },
  { href: "/admin/import", label: "Import", permission: "MANAGE_IMPORTS" },
  { href: "/admin/users", label: "Users", permission: "MANAGE_USERS" },
  {
    href: "/admin/admins",
    label: "Admins",
    roles: ["SUPER_ADMIN"],
    permission: "MANAGE_ADMINS",
  },
  { href: "/admin/reports", label: "Reports", permission: "MODERATE_REPORTS" },
  { href: "/admin/settings", label: "Settings", permission: "MANAGE_SETTINGS" },
];

export function AdminShell({
  user,
  children,
}: {
  user: {
    email: string;
    role: UserRole;
    adminPermissions: AdminPermission[];
  };
  children: React.ReactNode;
}) {
  const visibleNavItems = navItems.filter((item) => {
    if (item.roles && !item.roles.includes(user.role)) {
      return false;
    }
    if (item.permission && !user.adminPermissions.includes(item.permission)) {
      return false;
    }
    return true;
  });

  return (
    <main className="mx-auto max-w-[1500px] px-4 py-5 md:px-6">
      <header className="mb-4 rounded-2xl border border-brand-200 bg-white/90 p-4 shadow-panel">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-brand-600">
              HomeMall Admin
            </p>
            <h1 className="font-[family-name:var(--font-heading)] text-3xl text-brand-900">
              Backoffice
            </h1>
          </div>
          <p className="text-sm text-brand-700">
            {user.email} ({user.role})
          </p>
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <aside className="h-fit rounded-2xl border border-brand-200 bg-white/90 p-3 shadow-panel">
          <nav className="space-y-1">
            {visibleNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-xl px-3 py-2 text-sm font-semibold text-brand-800 transition hover:bg-brand-100"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <div>{children}</div>
      </section>
    </main>
  );
}
