import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";

export default function SignupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <Suspense
        fallback={<div className="text-sm text-brand-700">Loading...</div>}
      >
        <AuthForm mode="signup" />
      </Suspense>
    </main>
  );
}
