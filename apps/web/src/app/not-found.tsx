import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-start justify-center gap-3 px-4 py-8">
      <h1 className="font-[family-name:var(--font-heading)] text-4xl text-brand-900">
        Page not found
      </h1>
      <p className="text-sm text-brand-700">
        The page you requested does not exist.
      </p>
      <Link
        href="/zones"
        className="rounded-xl bg-brand-700 px-4 py-2 text-sm font-semibold text-white"
      >
        Go to zones
      </Link>
    </main>
  );
}
