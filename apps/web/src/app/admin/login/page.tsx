import { Suspense } from "react";
import { AdminLoginForm } from "@/components/admin/admin-login-form";

export default function AdminLoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg items-center px-4 py-8">
      <section className="w-full rounded-3xl border border-brand-200 bg-white/95 p-7 shadow-panel">
        <p className="text-sm uppercase tracking-[0.2em] text-brand-600">
          HomeMall Admin
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-heading)] text-4xl text-brand-900">
          Backoffice Login
        </h1>
        <p className="mt-2 text-sm text-brand-700">
          Admin roles only: <span className="font-semibold">SUPER_ADMIN</span>{" "}
          and <span className="font-semibold">MANAGER</span>.
        </p>
        <div className="mt-6">
          <Suspense
            fallback={<p className="text-sm text-brand-700">Loading form...</p>}
          >
            <AdminLoginForm />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
