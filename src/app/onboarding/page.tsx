import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";
import { facebookConfigured } from "@/lib/integrations/facebook";
import { googleLoginConfigured } from "@/lib/env";
import { JsonButton } from "@/components/ui/json-button";
import Link from "next/link";

export default async function OnboardingPage() {
  const user = await requireUser();
  const integrations = await prisma.integration.findMany({ where: { userId: user.id } });
  const apps = await prisma.app.count({ where: { userId: user.id } });
  const campaigns = await prisma.campaign.count({ where: { userId: user.id } });
  const status = (provider: string) =>
    integrations.find((item) => item.provider === provider)?.status || "NOT_CONNECTED";

  const steps = [
    { n: 1, title: "Create profile", done: Boolean(user.name && user.developerName), href: "/settings" },
    { n: 2, title: "Connect Facebook", done: status("FACEBOOK") === "CONNECTED", href: "/integrations" },
    { n: 3, title: "Connect Google / Gmail", done: status("GOOGLE") === "CONNECTED" || status("GMAIL") === "CONNECTED", href: "/integrations" },
    { n: 4, title: "Connect Google Play", done: status("GOOGLE_PLAY") === "CONNECTED", href: "/integrations" },
    { n: 5, title: "Add your Android app", done: apps > 0, href: "/apps" },
    { n: 6, title: "Create a campaign", done: campaigns > 0, href: "/campaigns" },
    { n: 7, title: "Select a testing source", done: false, href: "/discovery" },
    { n: 8, title: "Run first discovery", done: false, href: "/discovery" },
  ];

  return (
    <AppShell title="Welcome to TesterBridge">
      <p className="mb-6 max-w-2xl text-slate-400">
        Build your tester network faster. Official OAuth only — never passwords. Facebook Groups cannot be crawled;
        import posts or connect Pages you manage.
      </p>
      <div className="space-y-3">
        {steps.map((step) => (
          <Link
            key={step.n}
            href={step.href}
            className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/70 px-5 py-4"
          >
            <div>
              <div className="text-xs text-slate-500">Step {step.n}</div>
              <div className="font-medium">{step.title}</div>
            </div>
            <span className={step.done ? "text-teal-300" : "text-slate-500"}>
              {step.done ? "Done" : "Continue"}
            </span>
          </Link>
        ))}
      </div>
      <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-400">
        <span>Facebook app configured: {facebookConfigured() ? "yes" : "no"}</span>
        <span>Google OAuth configured: {googleLoginConfigured() ? "yes" : "no"}</span>
      </div>
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
