import type { Metadata } from "next";
import { I18nProvider } from "@/components/i18n/i18n-provider";
import { UserAppShell } from "@/components/layout/user-app-shell";
import "./globals.css";

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
      <body className="font-[family-name:var(--font-body)] text-accent-ink">
        <I18nProvider>
          <UserAppShell>{children}</UserAppShell>
        </I18nProvider>
      </body>
    </html>
  );
}
