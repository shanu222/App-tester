import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import "./globals.css";
import { isDemoMode } from "@/lib/env";
import { SITE_NAME, SITE_ORIGIN, SITE_TAGLINE } from "@/lib/site";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

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
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-white font-sans text-body antialiased">
        {isDemoMode() ? (
          <div className="border-b border-amber-200 bg-amber-50 py-2 text-center text-xs font-medium text-amber-800">
            Demo mode — mock adapters only. Demo records stay isolated from production.
          </div>
        ) : null}
        {children}
      </body>
    </html>
  );
}
