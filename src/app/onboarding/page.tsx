import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";
import { googleOAuthConfigured } from "@/lib/env";
import { JsonButton } from "@/components/ui/json-button";
import Link from "next/link";

export default async function OnboardingPage() {
  const user = await requireUser();
  const integrations = await prisma.integration.findMany({ where: { userId: user.id } });
  const apps = await prisma.app.count({ where: { userId: user.id } });
  const campaigns = await prisma.campaign.count({ where: { userId: user.id } });
  const published = await prisma.campaign.count({ where: { userId: user.id, published: true } });
  const groups = await prisma.googleGroup.count({ where: { userId: user.id } });
  const status = (provider: string) =>
    integrations.find((item) => item.provider === provider)?.status || "NOT_CONNECTED";

  const steps = [
    { n: 1, title: "Account", done: true, href: "/dashboard" },
    { n: 2, title: "Developer profile", done: user.profileCompleted, href: "/profile/complete" },
    { n: 3, title: "Add first Android app", done: apps > 0, href: "/apps" },
    { n: 4, title: "Connect Google Play", done: status("GOOGLE_PLAY") === "CONNECTED", href: "/play" },
    { n: 5, title: "Configure testing track / Google Group", done: groups > 0 || status("GOOGLE_PLAY") === "CONNECTED", href: "/play" },
    { n: 6, title: "Create first testing campaign", done: campaigns > 0 || published > 0, href: "/campaigns" },
  ];

  return (
    <AppShell title="Developer onboarding">
      <p className="mb-6 max-w-2xl text-slate-400">
        TestLoop is a developer-to-developer testing network. Official Google OAuth and Play APIs only — never
        passwords, and never fake success states.
      </p>
      <div className="space-y-3">
        {steps.map((step) => (
          <Link
            key={step.n}
            href={step.href}
            className="flex items-center justify-between rounded-xl border border-slate-800 bg-card px-5 py-4 hover:border-slate-700"
          >
            <div>
              <div className="text-xs text-slate-500">Step {step.n}</div>
              <div className="font-medium">{step.title}</div>
            </div>
            <span className={step.done ? "text-emerald-300" : "text-slate-500"}>
              {step.done ? "✓ Done" : "○ Continue"}
            </span>
          </Link>
        ))}
      </div>
      <p className="mt-6 text-sm text-slate-400">
        Google login configured: {googleOAuthConfigured() ? "yes" : "no"}
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
