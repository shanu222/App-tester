import { auth } from "@/auth";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { PublicChrome } from "@/components/layout/public-chrome";
import { googleOAuthConfigured } from "@/lib/env";
import { prisma } from "@/lib/db";
import { SITE_NAME } from "@/lib/site";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: `${SITE_NAME} — Developers Testing Developers' Apps`,
  description:
    "A developer-only reciprocal testing network for Android closed testing. Post a campaign, accept a test, share Gmail by consent, then track access and feedback.",
  alternates: { canonical: "https://testloop.org/" },
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
      <main className="mx-auto max-w-5xl px-6 py-16">
        <p className="text-sm uppercase tracking-[0.2em] text-teal-300">{SITE_NAME}</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
          Developers testing developers&apos; apps
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-slate-400">
          A developer-only reciprocal testing network for Android closed testing. Post a campaign, accept a test,
          share Gmail by consent, then track access, feedback, and reputation — without Facebook groups or
          spreadsheets.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          {googleOAuthConfigured() ? (
            <GoogleSignInButton label="Join as developer" />
          ) : (
            <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              Google login is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and AUTH_SECRET.
            </p>
          )}
        </div>

        <div className="mt-16 grid gap-5 md:grid-cols-3">
          {[
            {
              title: "Need Android testers?",
              body: "Find developers willing to test your app through Google Play testing tracks.",
            },
            {
              title: "Need testers for your app?",
              body: "Create a testing campaign with a real target, duration, and testing instructions.",
            },
            {
              title: "Want reciprocal testing?",
              body: "Test another developer’s app and request testers for yours in return.",
            },
          ].map((item) => (
            <section key={item.title} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <h2 className="font-medium">{item.title}</h2>
              <p className="mt-2 text-sm text-slate-400">{item.body}</p>
            </section>
          ))}
        </div>

        <section className="mt-12 rounded-2xl border border-slate-800 p-6">
          <h2 className="text-lg font-semibold">How it works</h2>
          <ol className="mt-4 grid gap-3 text-sm text-slate-300 md:grid-cols-2">
            <li>1. Continue with Google — official OAuth, never a password form.</li>
            <li>2. Complete your developer profile.</li>
            <li>3. Add an Android app and optional Google Play integration.</li>
            <li>4. Publish a testing request.</li>
            <li>5. Another developer accepts and consents to share Gmail.</li>
            <li>6. {SITE_NAME} processes Play / Google Group access when configured, or shows a manual fallback.</li>
            <li>7. Feedback and reciprocal tests build a real reputation score.</li>
          </ol>
          <ul className="mt-6 flex flex-wrap gap-2 text-xs text-slate-400">
            {[
              "Developer-only network",
              "Google Play integration",
              "Automated tester management",
              "Reciprocal testing",
              "Testing campaigns",
              "Tester reputation",
              "Feedback",
              "Analytics",
            ].map((item) => (
              <li key={item} className="rounded-full border border-slate-800 px-3 py-1">
                {item}
              </li>
            ))}
          </ul>
        </section>
      </main>
    </PublicChrome>
  );
}
