import Link from "next/link";
import { SiteFooter } from "@/components/layout/site-footer";
import { Card } from "@/components/ui/card";

export default function DownloadPage() {
  const primaryButtonClass =
    "inline-flex items-center justify-center rounded-2xl bg-brand-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-800";
  const outlineButtonClass =
    "inline-flex items-center justify-center rounded-2xl border border-brand-300 bg-white px-5 py-3 text-sm font-semibold text-brand-800 transition hover:bg-brand-50";
  const ghostButtonClass =
    "inline-flex items-center justify-center rounded-2xl border border-brand-200 px-5 py-3 text-sm font-semibold text-brand-800 transition hover:bg-brand-50";

  return (
    <div id="top" className="min-h-screen">
      <main className="mx-auto w-full max-w-[1700px] px-4 py-8 md:px-6 md:py-10">
        <section className="rounded-[2rem] border border-brand-200/70 bg-[radial-gradient(circle_at_80%_20%,rgba(58,114,87,0.12),transparent_24%),linear-gradient(135deg,#f0f7f3_0%,#dfece5_100%)] px-6 py-8 md:px-8 md:py-10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">
            HomeMall Mobile
          </p>
          <h1 className="mt-3 font-[family-name:var(--font-heading)] text-5xl text-brand-900">
            Download The App
          </h1>
          <p className="mt-3 max-w-3xl text-sm text-brand-800 md:text-base">
            Use the mobile experience to browse zones, match listings, post offers,
            and contact sellers from one place. Replace these store destinations
            with your real app listing IDs before production launch.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="https://www.apple.com/app-store/"
              target="_blank"
              rel="noreferrer"
              className={primaryButtonClass}
            >
              Open App Store
            </a>
            <a
              href="https://play.google.com/store/"
              target="_blank"
              rel="noreferrer"
              className={outlineButtonClass}
            >
              Open Google Play
            </a>
            <Link href="/zones" className={ghostButtonClass}>
              Explore web experience
            </Link>
          </div>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          <div id="ios">
            <Card className="rounded-[1.75rem] border-brand-200/70 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">
                iOS
              </p>
              <h2 className="mt-3 text-3xl font-semibold text-brand-900">Apple devices</h2>
              <p className="mt-3 text-sm text-brand-700 md:text-base">
                Install the iPhone app to browse listings, chat with sellers, and
                save zones while moving.
              </p>
              <a
                href="https://www.apple.com/app-store/"
                target="_blank"
                rel="noreferrer"
                className={`${primaryButtonClass} mt-5`}
              >
                Continue to App Store
              </a>
            </Card>
          </div>

          <div id="android">
            <Card className="rounded-[1.75rem] border-brand-200/70 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">
                Android
              </p>
              <h2 className="mt-3 text-3xl font-semibold text-brand-900">Google Play</h2>
              <p className="mt-3 text-sm text-brand-700 md:text-base">
                Install the Android app for swiping offers, posting media-rich
                listings, and staying in touch with buyers.
              </p>
              <a
                href="https://play.google.com/store/"
                target="_blank"
                rel="noreferrer"
                className={`${outlineButtonClass} mt-5`}
              >
                Continue to Google Play
              </a>
            </Card>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
