"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { clientApi } from "@/lib/client-api";

interface AdminLoginResponse {
  user: {
    id: string;
    email: string;
    role: "USER" | "SUPER_ADMIN" | "MANAGER";
  };
  token: string;
}

export function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const returnToRaw = searchParams?.get("returnTo");
  const returnTo =
    returnToRaw && returnToRaw.startsWith("/admin/")
      ? returnToRaw
      : "/admin/dashboard";

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await clientApi<AdminLoginResponse>("/api/admin/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      router.replace(returnTo);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Admin login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block space-y-1">
        <span className="text-sm font-medium text-brand-800">Admin email</span>
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 outline-none ring-brand-300 focus:ring"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium text-brand-800">Password</span>
        <input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 outline-none ring-brand-300 focus:ring"
        />
      </label>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-brand-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-800 disabled:cursor-not-allowed"
      >
        {loading ? "Signing in..." : "Sign in to backoffice"}
      </button>
    </form>
  );
}
