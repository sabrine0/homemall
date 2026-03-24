"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { clientApi } from "@/lib/client-api";
import { useI18n } from "@/components/i18n/i18n-provider";

interface AuthFormProps {
  mode: "login" | "signup";
}

export function AuthForm({ mode }: AuthFormProps) {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const returnToParam = searchParams?.get("returnTo");
  const returnTo =
    returnToParam && returnToParam.startsWith("/") ? returnToParam : "/zones";

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await clientApi(`/api/auth/${mode}`, {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      router.replace(returnTo);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const switchHref = mode === "login" ? "/signup" : "/login";
  const switchUrl = `${switchHref}${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`;

  return (
    <div className="mx-auto w-full max-w-md rounded-3xl border border-brand-200 bg-white/90 p-7 shadow-panel">
      <p className="text-sm uppercase tracking-[0.2em] text-brand-600">
        HomeMall
      </p>
      <h1 className="mt-2 font-[family-name:var(--font-heading)] text-4xl text-brand-900">
        {mode === "login" ? t("auth.welcomeBack") : t("auth.createAccount")}
      </h1>
      <p className="mt-2 text-sm text-brand-700">
        {mode === "login" ? t("auth.loginSubtitle") : t("auth.signupSubtitle")}
      </p>
      <form className="mt-6 space-y-4" onSubmit={submit}>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-brand-800">
            {t("auth.email")}
          </span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 outline-none ring-brand-400 focus:ring"
            required
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium text-brand-800">
            {t("auth.password")}
          </span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 outline-none ring-brand-400 focus:ring"
            minLength={8}
            required
          />
        </label>

        {error ? <p className="text-sm text-red-700">{error}</p> : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-brand-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-800 disabled:cursor-not-allowed"
        >
          {loading
            ? t("auth.pleaseWait")
            : mode === "login"
              ? t("auth.login")
              : t("auth.signUp")}
        </button>
      </form>

      <p className="mt-4 text-sm text-brand-700">
        {mode === "login" ? t("auth.newHere") : t("auth.haveAccount")}{" "}
        <Link
          href={switchUrl}
          className="font-semibold text-brand-800 underline"
        >
          {mode === "login" ? t("auth.createAccount") : t("auth.login")}
        </Link>
      </p>

      {mode === "login" ? (
        <p className="mt-2 text-sm text-brand-700">
          <Link href="/forgot-password" className="font-semibold text-brand-800 underline">
            Forgot password?
          </Link>
        </p>
      ) : null}

      {mode === "login" ? (
        <p className="mt-2 text-xs text-brand-600">
          {t("auth.adminPrefix")}{" "}
          <Link
            href="/admin/login"
            className="font-semibold text-brand-800 underline"
          >
            /admin/login
          </Link>
          .
        </p>
      ) : null}
    </div>
  );
}
