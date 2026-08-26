import { AppShell } from "@/components/layout/app-shell";
import { StatCard, EmptyState } from "@/components/ui/widgets";
import { requireUser } from "@/auth";
import { getDashboardStats } from "@/lib/services/dashboard";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { percent } from "@/lib/utils";

export default async function DashboardPage() {
  const user = await requireUser();
  const stats = await getDashboardStats(user.id);
  const [apps, play, published] = await Promise.all([
    prisma.app.count({ where: { userId: user.id } }),
    prisma.integration.findFirst({
      where: { userId: user.id, provider: "GOOGLE_PLAY", status: "CONNECTED" },
    }),
    prisma.campaign.count({ where: { userId: user.id, published: true } }),
  ]);
  const steps = [
    { n: 1, label: "Account", done: true },
    { n: 2, label: "Profile", done: user.profileCompleted },
    { n: 3, label: "App", done: apps > 0 },
    { n: 4, label: "Google Play", done: Boolean(play) },
    { n: 5, label: "Testing setup", done: Boolean(play) || apps > 0 },
    { n: 6, label: "First campaign", done: published > 0 },
  ];

  return (
    <AppShell
      title="Home"
      actions={
        <Link href="/requests" className="text-sm text-teal-300">
          Find testing requests
        </Link>
      }
    >
      {!user.onboardingCompleted || apps === 0 ? (
        <div className="mb-6 rounded-2xl border border-teal-500/30 bg-teal-500/10 p-5">
          <h2 className="text-lg font-semibold">Onboarding</h2>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            {steps.map((step) => (
              <span
                key={step.n}
                className={`rounded-full border px-3 py-1 ${step.done ? "border-teal-500/40 text-teal-200" : "border-slate-700 text-slate-400"}`}
              >
                {step.n} {step.done ? "✓" : "○"} {step.label}
              </span>
            ))}
          </div>
          <Link href="/onboarding" className="mt-3 inline-block text-sm text-teal-300">
            Continue setup →
          </Link>
        </div>
      ) : null}

      <h2 className="mb-3 text-sm uppercase tracking-wide text-slate-400">My testing overview</h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="My apps" value={stats.apps} />
        <StatCard label="Active campaigns" value={stats.activeCampaigns} />
        <StatCard label="Testers needed" value={stats.testersNeeded} />
        <StatCard label="Testers received" value={stats.testersReceived} />
        <StatCard label="Testing for others" value={stats.testingForOthers} />
        <StatCard label="Pending requests" value={stats.pendingParticipations} />
        <StatCard label="Completed tests" value={stats.completedTests} />
        <StatCard label="Reciprocal pending" value={stats.pendingReciprocal} />
      </div>

      <div className="mt-8">
        <h2 className="mb-3 text-sm uppercase tracking-wide text-slate-400">Active testing campaigns</h2>
        {stats.campaigns.length === 0 ? (
          <EmptyState
            title="No active campaigns"
            body="Add an Android app, then publish a testing request for other developers."
            action={
              <Link href="/campaigns" className="text-sm text-teal-300">
                Create campaign
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-950/80 text-left text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">App</th>
                  <th className="px-4 py-3 font-medium">Testers needed</th>
                  <th className="px-4 py-3 font-medium">Testers received</th>
                  <th className="px-4 py-3 font-medium">Progress</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {stats.campaigns.map((campaign) => (
                  <tr key={campaign.id} className="border-t border-slate-800">
                    <td className="px-4 py-3">
                      <Link href={`/campaigns/${campaign.id}`} className="text-teal-300">
                        {campaign.app.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{campaign.targetTesters}</td>
                    <td className="px-4 py-3">{campaign.testersReceived}</td>
                    <td className="px-4 py-3">{percent(campaign.testersReceived, campaign.targetTesters)}%</td>
                    <td className="px-4 py-3">
                      <Badge tone={campaign.status === "ACTIVE" ? "good" : "warn"}>{campaign.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
