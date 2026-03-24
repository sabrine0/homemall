"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-start justify-center gap-3 px-4 py-8">
          <h1 className="font-[family-name:var(--font-heading)] text-4xl text-brand-900">
            Application error
          </h1>
          <p className="text-sm text-brand-700">
            {error.message ||
              "A global error occurred while rendering the app."}
          </p>
          <button
            type="button"
            onClick={reset}
            className="rounded-xl bg-brand-700 px-4 py-2 text-sm font-semibold text-white"
          >
            Retry
          </button>
        </main>
      </body>
    </html>
  );
}
