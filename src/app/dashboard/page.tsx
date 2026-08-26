import { AppShell } from "@/components/layout/app-shell";
import { StatCard, EmptyState } from "@/components/ui/widgets";
import { requireUser } from "@/auth";
import { getDashboardStats } from "@/lib/services/dashboard";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export default async function DashboardPage() {
  const user = await requireUser();
  if (!user.onboardingCompleted && user.onboardingStep < 6) {
    // still show dashboard; wizard is linked
  }
  const stats = await getDashboardStats(user.id);
  const integrations = await prisma.integration.findMany({ where: { userId: user.id } });
  const connected = integrations.filter((item) => item.status === "CONNECTED").length;

  return (
    <AppShell
      title="Dashboard"
      actions={
        <Link href="/onboarding" className="text-sm text-teal-300">
          Setup wizard
        </Link>
      }
    >
      {!user.onboardingCompleted && connected === 0 ? (
        <div className="mb-6 rounded-2xl border border-teal-500/30 bg-teal-500/10 p-5">
          <h2 className="text-lg font-semibold">Welcome to TesterBridge</h2>
          <p className="text-sm text-slate-300">Build your tester network faster.</p>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-slate-400">
            <li>Connect Facebook (optional)</li>
            <li>Connect Gmail (optional)</li>
            <li>Connect Google Play (optional)</li>
            <li>Add your Android app</li>
            <li>Create your first testing campaign</li>
            <li>Find tester opportunities</li>
          </ol>
          <Link href="/onboarding" className="mt-3 inline-block text-sm text-teal-300">
            Start guided setup →
          </Link>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active Campaigns" value={stats.activeCampaigns} />
        <StatCard label="Potential Testers" value={stats.potentialTesters} />
        <StatCard label="Emails Received" value={stats.emailsReceived} />
        <StatCard label="Testers Added" value={stats.testersAdded} />
        <StatCard label="Opted In" value={stats.optedIn} hint="Added ≠ opted in" />
        <StatCard label="Currently Testing" value={stats.currentlyTesting} hint="Activity detected, not Play download confirmation" />
        <StatCard label="Feedback Received" value={stats.feedbackReceived} />
        <StatCard label="Tester database" value={stats.testers} />
      </div>

      <div className="mt-8">
        <h2 className="mb-3 text-sm uppercase tracking-wide text-slate-400">Campaigns</h2>
        {stats.campaigns.length === 0 ? (
          <EmptyState
            title="No active campaigns"
            body="Create a campaign, attach a source, and run discovery."
            action={
              <Link href="/campaigns" className="text-sm text-teal-300">
                Create campaign
              </Link>
            }
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {stats.campaigns.map((campaign) => (
              <Link
                key={campaign.id}
                href={`/campaigns/${campaign.id}`}
                className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 hover:border-teal-500/40"
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium">{campaign.name}</div>
                  <Badge tone={campaign.status === "ACTIVE" ? "good" : "warn"}>{campaign.status}</Badge>
                </div>
                <p className="mt-2 text-sm text-slate-400">
                  {campaign.app.name} · {campaign._count.testerCampaigns} testers · target {campaign.targetTesters}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
