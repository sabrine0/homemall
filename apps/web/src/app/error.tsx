"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-start justify-center gap-3 px-4 py-8">
      <h1 className="font-[family-name:var(--font-heading)] text-4xl text-brand-900">
        Something went wrong
      </h1>
      <p className="text-sm text-brand-700">
        {error.message ||
          "An unexpected error happened while loading this page."}
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-xl bg-brand-700 px-4 py-2 text-sm font-semibold text-white"
      >
        Try again
      </button>
    </main>
  );
}
