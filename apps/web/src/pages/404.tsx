import Link from "next/link";

export default function Legacy404Page() {
  return (
    <main style={{ padding: 24 }}>
      <h1>404 - Page not found</h1>
      <p>The requested page could not be found.</p>
      <Link href="/zones">Go to zones</Link>
    </main>
  );
}
