import type { Metadata } from "next";
import "./globals.css";
import { isDemoMode } from "@/lib/env";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "TesterBridge — Developers Testing Developers' Apps",
  description:
    "Developer-to-developer Android testing network: publish campaigns, accept tests, share Gmail by consent, and track Google Play closed testing.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
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
