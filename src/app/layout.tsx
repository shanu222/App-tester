import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { isDemoMode } from "@/lib/env";
import { SITE_NAME, SITE_ORIGIN, SITE_TAGLINE } from "@/lib/site";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_ORIGIN),
  title: `${SITE_NAME} — Developers Testing Developers' Apps`,
  description: `${SITE_TAGLINE}. Publish campaigns, accept tests, share Gmail by consent, and track Google Play closed testing.`,
  openGraph: {
    siteName: SITE_NAME,
    type: "website",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">
        {isDemoMode() ? (
          <div className="bg-amber-500/15 text-amber-200 text-center text-xs py-1.5 tracking-wide">
            DEMO MODE — mock adapters only. Demo records stay isolated from production.
          </div>
        ) : null}
        {children}
      </body>
    </html>
  );
}
