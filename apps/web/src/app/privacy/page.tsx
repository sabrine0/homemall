import Link from "next/link";
import { SiteFooter } from "@/components/layout/site-footer";
import { Card } from "@/components/ui/card";

export default function PrivacyPage() {
  const primaryButtonClass =
    "inline-flex items-center justify-center rounded-2xl bg-brand-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-800";

  return (
    <div id="top" className="min-h-screen">
      <main className="mx-auto w-full max-w-[1200px] px-4 py-8 md:px-6 md:py-10">
        <section className="rounded-[2rem] border border-brand-200/70 bg-white px-6 py-8 md:px-8 md:py-10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">
            Legal
          </p>
          <h1 className="mt-3 font-[family-name:var(--font-heading)] text-5xl text-brand-900">
            Privacy & Terms
          </h1>
          <p className="mt-3 max-w-3xl text-sm text-brand-700 md:text-base">
            This page is the public legal surface for HomeMall. Replace this
            placeholder copy with your production privacy policy, data retention,
            consent, and marketplace moderation rules before launch.
          </p>
          <Link
            href="/zones"
            className={`${primaryButtonClass} mt-6`}
          >
            Return to zones
          </Link>
        </section>

        <section className="mt-6 grid gap-4">
          <Card className="rounded-[1.75rem] border-brand-200/70 p-6">
            <h2 className="text-2xl font-semibold text-brand-900">1. Data we handle</h2>
            <p className="mt-3 text-sm text-brand-700 md:text-base">
              HomeMall can process account data, listing content, uploaded media,
              zone preferences, and messages between buyers and sellers.
            </p>
          </Card>

          <Card className="rounded-[1.75rem] border-brand-200/70 p-6">
            <h2 className="text-2xl font-semibold text-brand-900">2. Marketplace behavior</h2>
            <p className="mt-3 text-sm text-brand-700 md:text-base">
              Users are responsible for listing accuracy. Fraudulent listings,
              abusive chat, or misleading price claims should be moderated and
              removed under your production compliance process.
            </p>
          </Card>

          <Card className="rounded-[1.75rem] border-brand-200/70 p-6">
            <h2 className="text-2xl font-semibold text-brand-900">3. Contact and support</h2>
            <p className="mt-3 text-sm text-brand-700 md:text-base">
              For privacy requests or data deletion, users should contact
              support@homemall.ma. Update this address and add the final legal
              entity details before release.
            </p>
          </Card>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
