import type { Metadata } from "next";
import "./globals.css";
import { isDemoMode } from "@/lib/env";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "TesterBridge — Find Real Testers. Exchange Testing. Track Every Test.",
  description:
    "Professional reciprocal Android testing operations: discover opportunities, approve outreach, and track testers through Google Play closed testing.",
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
