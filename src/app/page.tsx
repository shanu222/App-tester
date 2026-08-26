import { auth } from "@/auth";
import { FirebaseLogin } from "@/components/auth/firebase-login";
import { PublicChrome } from "@/components/layout/public-chrome";
import { firebaseAuthConfigured } from "@/lib/firebase/config";
import { prisma } from "@/lib/db";
import { SITE_NAME, SITE_ORIGIN } from "@/lib/site";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { CheckCircle2, LineChart, Repeat2, ShieldCheck, Users } from "lucide-react";

export const metadata: Metadata = {
  title: `${SITE_NAME} — Developers Testing Developers' Apps`,
  description:
    "A developer-only reciprocal testing network for Android closed testing. Post a campaign, accept a test, share Gmail by consent, then track access and feedback.",
  alternates: { canonical: `${SITE_ORIGIN}/` },
};

const VALUE_PROPS = [
  {
    icon: Users,
    title: "Need Android testers?",
    body: "Find verified developers willing to test your app through Google Play testing tracks.",
  },
  {
    icon: LineChart,
    title: "Running a closed test?",
    body: "Publish a testing request with a real tester target, duration, and clear instructions.",
  },
  {
    icon: Repeat2,
    title: "Want reciprocal testing?",
    body: "Test another developer's app and receive testers for your own release in return.",
  },
];

const STEPS = [
  "Sign in with Google or an email address — one account, one sign-in.",
  "Complete your developer profile so others know who they are testing with.",
  "Add an Android app and connect Google Play if you want automated access.",
  "Publish a testing request with your target tester count and duration.",
  "Another developer accepts the request and consents to share their Gmail.",
  `${SITE_NAME} processes Play or Google Group access, or shows a manual fallback.`,
  "Feedback and reciprocal tests build a reputation score from real activity.",
];

const TRUST = [
  "Google sign-in, never a Google password form",
  "Consent-based Gmail sharing",
  "Live Google Play API checks",
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
        {/* Hero */}
        <section className="border-b border-line">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-16 lg:py-20">
            <div className="max-w-xl">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-slate-600">
                <ShieldCheck className="h-3.5 w-3.5 text-brand" aria-hidden />
                Developer-only testing network
              </span>

              <h1 className="mt-5 text-[34px] font-semibold leading-[1.12] tracking-tight text-slate-900 sm:text-[44px]">
                Developers testing developers&apos; apps
              </h1>

              <p className="mt-5 text-lg leading-8 text-body">
                A professional network for Android closed testing. Publish a request, accept a test, share
                Gmail only after consent, and track real campaign progress.
              </p>

              <ul className="mt-7 space-y-2.5">
                {TRUST.map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-body">
                    <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-success" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Sign-in panel */}
            <div className="lg:pt-2">
              <div className="rounded-card border border-line bg-white p-6 shadow-raised">
                <h2 className="text-lg font-semibold text-slate-900">Get started</h2>
                <p className="mt-1.5 text-sm leading-6 text-muted">
                  Sign in with your developer account. {SITE_NAME} never asks for a Google password.
                </p>

                <div className="mt-6">
                  {signInReady ? (
                    <FirebaseLogin />
                  ) : (
                    <p className="rounded-control border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
                      Sign-in is not configured on this deployment. Set the Firebase web
                      environment variables to enable it.
                    </p>
                  )}
                </div>

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
              </div>
            </div>
          </div>
        </section>

        {/* Value props */}
        <section className="border-b border-line bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-16">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              Built for real closed-testing work
            </h2>
            <p className="mt-2 max-w-2xl text-base leading-7 text-muted">
              Whether you need testers, are running a release, or want to trade testing time,
              {" "}
              {SITE_NAME} keeps every side accountable.
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {VALUE_PROPS.map((item) => (
                <div key={item.title} className="rounded-card border border-line bg-white p-5 shadow-card">
                  <span className="flex h-9 w-9 items-center justify-center rounded-control bg-brand-soft text-brand">
                    <item.icon className="h-4.5 w-4.5" aria-hidden />
                  </span>
                  <h3 className="mt-4 text-[15px] font-semibold text-slate-900">{item.title}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-muted">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section>
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-16">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">How it works</h2>
            <p className="mt-2 text-base leading-7 text-muted">Seven steps from sign-in to verified feedback.</p>

            <ol className="mt-8 grid gap-x-8 gap-y-5 md:grid-cols-2">
              {STEPS.map((step, index) => (
                <li key={step} className="flex gap-3.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-[13px] font-semibold text-slate-700">
                    {index + 1}
                  </span>
                  <p className="pt-1 text-sm leading-6 text-body">{step}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </main>
    </PublicChrome>
  );
}
