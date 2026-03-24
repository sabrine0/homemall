"use client";

import Link from "next/link";
import { useState } from "react";
import { clientApi } from "@/lib/client-api";

interface ForgotPasswordResponse {
  message: string;
  expiresInMinutes: number;
  verificationCodePreview?: string;
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [codeRequested, setCodeRequested] = useState(false);
  const [codeVerified, setCodeVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verificationCodePreview, setVerificationCodePreview] = useState<
    string | null
  >(null);

  const requestCode = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await clientApi<ForgotPasswordResponse>(
        "/api/auth/forgot-password",
        {
          method: "POST",
          body: JSON.stringify({ email }),
        },
      );
      setCodeRequested(true);
      setCodeVerified(false);
      setVerificationCodePreview(result.verificationCodePreview ?? null);
      setSuccess(result.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to request code.");
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await clientApi<{ verified: boolean }>("/api/auth/forgot-password/verify", {
        method: "POST",
        body: JSON.stringify({ email, code }),
      });
      setCodeVerified(true);
      setSuccess("Verification code confirmed. Set your new password.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid verification code.");
    } finally {
      setLoading(false);
    }
  };

  const submitNewPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await clientApi<{ message: string }>("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ email, code, newPassword }),
      });
      setSuccess(result.message);
      setCodeVerified(false);
      setCodeRequested(false);
      setCode("");
      setNewPassword("");
      setVerificationCodePreview(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="mx-auto w-full max-w-md rounded-3xl border border-brand-200 bg-white/90 p-7 shadow-panel">
        <p className="text-sm uppercase tracking-[0.2em] text-brand-600">HomeMall</p>
        <h1 className="mt-2 font-[family-name:var(--font-heading)] text-4xl text-brand-900">
          Reset password
        </h1>
        <p className="mt-2 text-sm text-brand-700">
          Request a verification code, confirm it, then set a new password.
        </p>

        <form className="mt-6 space-y-3" onSubmit={requestCode}>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-brand-800">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 outline-none ring-brand-400 focus:ring"
              required
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-brand-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-800 disabled:cursor-not-allowed"
          >
            {loading ? "Please wait..." : "Send verification code"}
          </button>
        </form>

        {verificationCodePreview ? (
          <p className="mt-3 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-xs text-brand-800">
            Dev code preview: <strong>{verificationCodePreview}</strong>
          </p>
        ) : null}

        {codeRequested ? (
          <form className="mt-4 space-y-3" onSubmit={verifyCode}>
            <label className="block space-y-1">
              <span className="text-sm font-medium text-brand-800">
                Verification code
              </span>
              <input
                type="text"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 outline-none ring-brand-400 focus:ring"
                inputMode="numeric"
                pattern="\d{6}"
                minLength={6}
                maxLength={6}
                required
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl border border-brand-300 bg-white px-4 py-2 text-sm font-semibold text-brand-800 transition hover:bg-brand-50 disabled:cursor-not-allowed"
            >
              {loading ? "Please wait..." : "Verify code"}
            </button>
          </form>
        ) : null}

        {codeVerified ? (
          <form className="mt-4 space-y-3" onSubmit={submitNewPassword}>
            <label className="block space-y-1">
              <span className="text-sm font-medium text-brand-800">New password</span>
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 outline-none ring-brand-400 focus:ring"
                minLength={8}
                required
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-brand-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-800 disabled:cursor-not-allowed"
            >
              {loading ? "Please wait..." : "Reset password"}
            </button>
          </form>
        ) : null}

        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
        {success ? <p className="mt-3 text-sm text-brand-700">{success}</p> : null}

        <p className="mt-4 text-sm text-brand-700">
          Back to{" "}
          <Link href="/login" className="font-semibold text-brand-800 underline">
            login
          </Link>
        </p>
      </div>
    </main>
  );
}
