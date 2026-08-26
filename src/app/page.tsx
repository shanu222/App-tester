import { auth } from "@/auth";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { BrandLogo } from "@/components/brand/brand-logo";
import { PublicChrome } from "@/components/layout/public-chrome";
import { googleOAuthConfigured } from "@/lib/env";
import { prisma } from "@/lib/db";
import { SITE_NAME, SITE_ORIGIN } from "@/lib/site";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: `${SITE_NAME} — Developers Testing Developers' Apps`,
  description:
    "A developer-only reciprocal testing network for Android closed testing. Post a campaign, accept a test, share Gmail by consent, then track access and feedback.",
  alternates: { canonical: `${SITE_ORIGIN}/` },
};

export default async function LandingPage() {
  const session = await auth();
  if (session?.user?.id) {
    const user = await prisma.user.findFirst({
      where: { id: session.user.id, deletedAt: null, suspendedAt: null },
      select: { profileCompleted: true },
    });
    redirect(user?.profileCompleted ? "/dashboard" : "/profile/complete");
  }

  return (
    <PublicChrome>
      <main className="mx-auto max-w-6xl px-6 py-14 sm:py-20">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-14">
          <BrandLogo size="lg" priority />
          <div>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              Developers testing developers&apos; apps
            </h1>
            <p className="mt-4 text-lg leading-7 text-slate-400">
              A professional network for Android closed testing. Publish a request, accept a test, share Gmail only after
              consent, and track real campaign progress.
            </p>
            <div className="mt-8">
              {googleOAuthConfigured() ? (
                <GoogleSignInButton label="Continue with Google" />
              ) : (
                <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                  Google login is not configured on this deployment.
                </p>
              )}
            </div>
          </div>
        </div>

        <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">
          <li>Google OAuth only</li>
          <li>Consent-based Gmail sharing</li>
          <li>Live Google Play API checks</li>
        </ul>

        <div className="mt-16 grid gap-4 md:grid-cols-3">
          {[
            {
              title: "Need Android testers?",
              body: "Find developers willing to test your app through Google Play testing tracks.",
            },
            {
              title: "Need testers for your app?",
              body: "Create a testing campaign with a real target, duration, and instructions.",
            },
            {
              title: "Want reciprocal testing?",
              body: "Test another developer’s app and request testers for yours in return.",
            },
          ].map((item) => (
            <section key={item.title} className="rounded-xl border border-slate-800 bg-card p-5">
              <h2 className="font-medium">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">{item.body}</p>
            </section>
          ))}
        </div>

        <section className="mt-10 rounded-xl border border-slate-800 p-6">
          <h2 className="text-lg font-semibold">How it works</h2>
          <ol className="mt-4 grid gap-3 text-sm leading-6 text-slate-300 md:grid-cols-2">
            <li>1. Continue with Google — official OAuth, never a password form.</li>
            <li>2. Complete your developer profile.</li>
            <li>3. Add an Android app and optional Google Play integration.</li>
            <li>4. Publish a testing request.</li>
            <li>5. Another developer accepts and consents to share Gmail.</li>
            <li>6. {SITE_NAME} processes Play / Google Group access when configured, or shows a manual fallback.</li>
            <li>7. Feedback and reciprocal tests build a reputation score from real activity.</li>
          </ol>
        </section>
      </main>
    </PublicChrome>
  );
}
