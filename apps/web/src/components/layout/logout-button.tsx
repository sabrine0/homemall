"use client";

import clsx from "clsx";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { clientApi } from "@/lib/client-api";

export function LogoutButton({
  redirectTo = "/login",
  className,
}: {
  redirectTo?: string;
  className?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await clientApi("/api/auth/logout", { method: "POST" });
      router.replace(redirectTo);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className={clsx(
        "w-full rounded-xl border border-brand-200 bg-white/70 px-3 py-2 text-left text-sm font-semibold text-brand-800 transition hover:bg-brand-100 disabled:cursor-not-allowed",
        className,
      )}
    >
      {loading ? "Logging out..." : "Logout"}
    </button>
  );
}
