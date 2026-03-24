import Link from "next/link";
import { LogoutButton } from "./logout-button";

const navItems = [
  { label: "Dashboard", href: "/zones" },
  { label: "Onboarding", href: "/onboarding" },
  { label: "Zones", href: "/zones" },
  { label: "TCL", href: "/tcl" },
  { label: "Listings", href: "/listings" },
  { label: "Messages", href: "/messages" },
  { label: "Compare", href: "/compare" },
  { label: "Profile", href: "/settings" },
];

export function Sidebar() {
  return (
    <aside className="sticky top-5 h-[calc(100vh-2.5rem)] min-w-[220px] rounded-2xl border border-brand-200 bg-white/80 p-4 shadow-panel backdrop-blur">
      <p className="font-[family-name:var(--font-heading)] text-2xl text-brand-900">
        HomeMall
      </p>
      <p className="mt-1 text-xs uppercase tracking-[0.2em] text-brand-600">
        Decision OS
      </p>

      <nav className="mt-6 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block rounded-xl px-3 py-2 text-sm font-medium text-brand-800 transition hover:bg-brand-100"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="mt-8">
        <LogoutButton />
      </div>
    </aside>
  );
}
