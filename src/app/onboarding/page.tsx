import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";
import { googleOAuthConfigured } from "@/lib/env";
import { firebaseAuthConfigured } from "@/lib/firebase/config";
import { JsonButton } from "@/components/ui/json-button";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

export default async function OnboardingPage() {
  const user = await requireUser();
  const apps = await prisma.app.count({ where: { userId: user.id } });
  const campaigns = await prisma.campaign.count({ where: { userId: user.id } });
  const published = await prisma.campaign.count({ where: { userId: user.id, published: true } });
  const playConnection = await prisma.googlePlayConnection.findUnique({
    where: { userId: user.id },
    select: { status: true },
  });
  const selectedPlayApps = await prisma.googlePlayApp.count({
    where: { userId: user.id, selected: true },
  });
  const playConnected = playConnection?.status === "CONNECTED";

  const steps = [
    { n: 1, title: "Account", done: true, href: "/dashboard" },
    { n: 2, title: "Developer profile", done: user.profileCompleted, href: "/profile/complete" },
    { n: 3, title: "Add first Android app", done: apps > 0, href: "/apps" },
    { n: 4, title: "Connect Google Play (optional)", done: playConnected, href: "/play" },
    { n: 5, title: "Select a Play Console app (optional)", done: selectedPlayApps > 0, href: "/play" },
    { n: 6, title: "Create first testing campaign", done: campaigns > 0 || published > 0, href: "/campaigns" },
  ];

  return (
    <AppShell title="Developer onboarding">
      <p className="mb-6 max-w-2xl text-muted">
        TestLoop is a developer-to-developer testing network. Official Google OAuth and Play APIs only — never
        passwords, and never fake success states.
      </p>
      <div className="space-y-3">
        {steps.map((step) => (
          <Link
            key={step.n}
            href={step.href}
            className="flex items-center justify-between gap-4 rounded-card border border-line bg-white px-5 py-4 shadow-card transition-colors hover:border-line-strong hover:bg-surface"
          >
            <div>
              <div className="text-xs font-medium text-muted">Step {step.n}</div>
              <div className="mt-0.5 font-medium text-slate-900">{step.title}</div>
            </div>
            {step.done ? (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-success">
                <CheckCircle2 className="h-4.5 w-4.5" aria-hidden />
                Done
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-brand">
                Continue
                <ArrowRight className="h-4 w-4" aria-hidden />
              </span>
            )}
          </Link>
        ))}
      </div>
      <p className="mt-6 text-sm text-muted">
        Sign-in configured: {firebaseAuthConfigured() ? "yes" : "no"} · Google API access for Gmail
        and Play: {googleOAuthConfigured() ? "yes" : "no"}
      </p>
      <div className="mt-4">
        <JsonButton
          url="/api/onboarding"
          body={{ step: 10, completed: true }}
          label="Mark setup complete"
          variant="secondary"
        />
      </div>
    </AppShell>
  );
}
