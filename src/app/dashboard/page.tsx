import { AppShell } from "@/components/layout/app-shell";
import { StatCard, EmptyState } from "@/components/ui/widgets";
import { requireUser } from "@/auth";
import { getDashboardStats } from "@/lib/services/dashboard";
import { developerBadges } from "@/lib/services/network";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { percent } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const user = await requireUser();
  const [stats, badges, play, unread, testing] = await Promise.all([
    getDashboardStats(user.id),
    developerBadges(user.id),
    prisma.integration.findFirst({
      where: { userId: user.id, provider: "GOOGLE_PLAY" },
      select: { status: true, lastError: true, displayName: true },
    }),
    prisma.notification.count({ where: { userId: user.id, readAt: null } }),
    prisma.testingParticipation.findMany({
      where: { testerUserId: user.id, status: { notIn: ["DECLINED"] } },
      include: { campaign: { include: { app: true } } },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
  ]);
  const playConnected = play?.status === "CONNECTED";
  const steps = [
    { n: 1, label: "Account", done: true, href: "/profile" },
    { n: 2, label: "Profile", done: user.profileCompleted, href: "/profile" },
    { n: 3, label: "App", done: stats.apps > 0, href: "/apps" },
    { n: 4, label: "Google Play", done: playConnected, href: "/play" },
    { n: 5, label: "First campaign", done: stats.activeCampaigns > 0, href: "/campaigns" },
  ];
  const showOnboarding = !user.onboardingCompleted || stats.apps === 0;

  return (
    <AppShell
      title="Home"
      actions={
        <Link href="/requests">
          <Button variant="secondary">Find testing requests</Button>
        </Link>
      }
    >
      <section className="rounded-xl border border-slate-800 bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">{user.developerName || user.name || "Developer"}</h2>
            <p className="mt-1 text-sm text-slate-400">{user.company || user.developerType || "Developer account"}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {badges.badges.map((badge) => (
                <Badge key={badge.key} tone={badge.key === "verified" ? "good" : "neutral"}>
                  {badge.label}
                </Badge>
              ))}
            </div>
          </div>
          <div className="text-sm text-slate-400">
            <div>
              Testing score: {badges.score.score ?? "—"}
              {badges.score.score ? " / 5" : ""}
            </div>
            <p className="mt-1 max-w-xs text-xs text-slate-500">{badges.score.label}</p>
            <Link href="/profile" className="mt-2 inline-block text-emerald-300">
              Developer profile
            </Link>
          </div>
        </div>
      </section>

      {showOnboarding ? (
        <div className="mt-6 rounded-xl border border-slate-800 p-5">
          <h2 className="font-medium">Get started</h2>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            {steps.map((step) => (
              <Link
                key={step.n}
                href={step.href}
                className={`rounded-full border px-3 py-1 ${step.done ? "border-emerald-500/40 text-emerald-200" : "border-slate-700 text-slate-400"}`}
              >
                {step.n} {step.done ? "✓" : "○"} {step.label}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        <section className="rounded-xl border border-slate-800 p-5">
          <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">Google Play</h2>
          <div className="mt-3">
            <Badge tone={playConnected ? "good" : "neutral"}>
              {playConnected ? "Connected" : play?.status === "ERROR" ? "Error" : "Not connected"}
            </Badge>
          </div>
          {play?.lastError ? <p className="mt-2 text-sm text-amber-200">{play.lastError}</p> : null}
          <p className="mt-2 text-sm text-slate-400">
            {playConnected
              ? play.displayName || "Service account connected after a live API check."
              : "Connect a Play Console service account to automate tester access where Google APIs allow it."}
          </p>
          <Link href="/play" className="mt-3 inline-block text-sm text-emerald-300">
            Open Google Play
          </Link>
        </section>
        <section className="rounded-xl border border-slate-800 p-5">
          <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">My Apps</h2>
          <p className="mt-3 text-2xl font-semibold tabular-nums">{stats.apps}</p>
          <Link href="/apps" className="mt-3 inline-block text-sm text-emerald-300">
            Manage apps
          </Link>
        </section>
        <section className="rounded-xl border border-slate-800 p-5">
          <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">Messages</h2>
          <p className="mt-3 text-sm text-slate-400">{unread} unread alert{unread === 1 ? "" : "s"}</p>
          <Link href="/messages" className="mt-3 inline-block text-sm text-emerald-300">
            Open messages
          </Link>
        </section>
      </div>

      <h2 className="mb-3 mt-10 text-sm font-medium uppercase tracking-wide text-slate-500">Testing overview</h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active campaigns" value={stats.activeCampaigns} />
        <StatCard label="Testers needed" value={stats.testersNeeded} />
        <StatCard label="Testers received" value={stats.testersReceived} />
        <StatCard label="Testing for others" value={stats.testingForOthers} />
        <StatCard label="Pending incoming" value={stats.pendingParticipations} />
        <StatCard label="Completed tests" value={stats.completedTests} />
        <StatCard label="Reciprocal pending" value={stats.pendingReciprocal} />
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-500">My testing requests</h2>
          {stats.campaigns.length === 0 ? (
            <EmptyState
              title="No testing requests yet"
              body="Publish your first testing request to start finding developers who can test your app."
              action={
                <Link href="/campaigns">
                  <Button>Create testing request</Button>
                </Link>
              }
            />
          ) : (
            <div className="space-y-3">
              {stats.campaigns.map((campaign) => (
                <Link
                  key={campaign.id}
                  href={`/campaigns/${campaign.id}`}
                  className="block rounded-xl border border-slate-800 p-4 hover:border-slate-700"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium">{campaign.app.name}</div>
                    <Badge tone={campaign.status === "ACTIVE" ? "good" : "warn"}>{campaign.status}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-400">
                    {campaign.testersReceived} / {campaign.targetTesters} testers ·{" "}
                    {percent(campaign.testersReceived, campaign.targetTesters)}%
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>
        <section>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-500">My testing activity</h2>
          {testing.length === 0 ? (
            <EmptyState
              title="You are not testing any apps yet"
              body="Accept a published testing request from another developer."
              action={
                <Link href="/requests">
                  <Button variant="secondary">Find testing requests</Button>
                </Link>
              }
            />
          ) : (
            <div className="space-y-3">
              {testing.map((row) => (
                <Link
                  key={row.id}
                  href="/testing"
                  className="block rounded-xl border border-slate-800 p-4 hover:border-slate-700"
                >
                  <div className="font-medium">{row.campaign.app.name}</div>
                  <p className="mt-1 text-sm text-slate-400">{row.status.replaceAll("_", " ")}</p>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
