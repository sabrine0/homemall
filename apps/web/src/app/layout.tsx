import type { Metadata } from "next";
import { DM_Serif_Display, Space_Grotesk } from "next/font/google";
import { I18nProvider } from "@/components/i18n/i18n-provider";
import { UserAppShell } from "@/components/layout/user-app-shell";
import "./globals.css";

const heading = DM_Serif_Display({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: "400",
});

const body = Space_Grotesk({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "HomeMall",
  description: "AI housing decision platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${heading.variable} ${body.variable} font-[family-name:var(--font-body)] text-accent-ink`}
      >
        <I18nProvider>
          <UserAppShell>{children}</UserAppShell>
        </I18nProvider>
      </body>
    </html>
  );
}
