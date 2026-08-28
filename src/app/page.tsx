import { auth } from "@/auth";
import { FirebaseLogin } from "@/components/auth/firebase-login";
import { PublicChrome } from "@/components/layout/public-chrome";
import { CompanyAttribution } from "@/components/brand/company-attribution";
import { firebaseAuthConfigured } from "@/lib/firebase/config";
import { prisma } from "@/lib/db";
import { SITE_NAME, SITE_ORIGIN } from "@/lib/site";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title: `${SITE_NAME} — Test smarter. Discover better apps.`,
  description:
    "A professional platform for discovering and participating in software testing opportunities.",
  alternates: { canonical: `${SITE_ORIGIN}/` },
};

const FEATURES = [
  "Discover active testing opportunities",
  "Join Google Play testing programs",
  "Manage your testing activity",
  "Connect Google Play developer accounts",
];

export default async function LandingPage() {
  const session = await auth();
  if (session?.user?.id) {
    const user = await prisma.user.findFirst({
      where: { id: session.user.id, deletedAt: null, suspendedAt: null },
      select: { profileCompleted: true },
    });
    redirect(user?.profileCompleted ? "/dashboard" : "/profile/complete");
  }

  const signInReady = firebaseAuthConfigured();

  return (
    <PublicChrome>
      <main>
        <section className="border-b border-line">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.85fr)] lg:items-center lg:gap-16 lg:py-16">
            <div className="max-w-xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand">{SITE_NAME}</p>
              <h1 className="mt-3 text-[32px] font-semibold leading-[1.12] tracking-tight text-slate-900 sm:text-[42px]">
                Test smarter. Discover better apps.
              </h1>
              <p className="mt-4 text-base leading-7 text-body sm:text-lg">
                A professional platform for discovering and participating in software testing opportunities.
              </p>
              <ul className="mt-7 space-y-2.5">
                {FEATURES.map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-body">
                    <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-success" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="rounded-card border border-line bg-white p-6 shadow-raised sm:p-7">
                {signInReady ? (
                  <FirebaseLogin />
                ) : (
                  <p className="rounded-control border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
                    Sign-in is not configured on this deployment.
                  </p>
                )}
                <p className="mt-6 border-t border-line pt-4 text-xs leading-5 text-muted">
                  By continuing you agree to our{" "}
                  <Link href="/terms" className="font-medium text-brand hover:underline">
                    Terms
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" className="font-medium text-brand hover:underline">
                    Privacy Policy
                  </Link>
                  .
                </p>
                <div className="mt-5">
                  <CompanyAttribution compact />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </PublicChrome>
  );
}
