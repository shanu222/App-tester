import { AppShell } from "@/components/layout/app-shell";
import { StatCard, EmptyState } from "@/components/ui/widgets";
import { requireUser } from "@/auth";
import { getDashboardStats } from "@/lib/services/dashboard";
import { developerBadges } from "@/lib/services/network";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { percent, timeAgo } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SectionLabel } from "@/components/ui/card";
import { CheckCircle2, Circle } from "lucide-react";

export default async function DashboardPage() {
  const user = await requireUser();
  const [stats, badges, unread, testing] = await Promise.all([
    getDashboardStats(user.id),
    developerBadges(user.id),
    prisma.notification.count({ where: { userId: user.id, readAt: null } }),
    prisma.testingParticipation.findMany({
      where: { testerUserId: user.id, status: { notIn: ["DECLINED"] } },
      include: { campaign: { include: { app: true } } },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
  ]);
  const playConnected = stats.play.connected;
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
      <section className="rounded-card border border-line bg-white p-5 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="flex min-w-0 items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-soft text-base font-semibold text-brand">
              {(user.developerName || user.name || "D").charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-slate-900">
                {user.developerName || user.name || "Developer"}
              </h2>
              <p className="mt-0.5 text-sm text-muted">
                {user.company || user.developerType || "Developer account"}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {badges.badges.map((badge) => (
                  <Badge key={badge.key} tone={badge.key === "verified" ? "good" : "neutral"}>
                    {badge.label}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <div className="min-w-48 rounded-control border border-line bg-surface p-4">
            <div className="text-xs font-medium text-muted">Testing score</div>
            <div className="mt-1 text-2xl font-semibold leading-none text-slate-900 tabular-nums">
              {badges.score.score ?? "—"}
              {badges.score.score ? <span className="text-base text-muted"> / 5</span> : null}
            </div>
            <p className="mt-2 max-w-xs text-xs leading-5 text-muted">{badges.score.label}</p>
            <Link
              href="/profile"
              className="mt-2 inline-block text-xs font-medium text-brand hover:underline"
            >
              Developer profile
            </Link>
          </div>
        </div>
      </section>

      {showOnboarding ? (
        <div className="mt-6 rounded-card border border-line bg-white p-5 shadow-card">
          <SectionLabel>Get started</SectionLabel>
          <div className="mt-3 flex flex-wrap gap-2">
            {steps.map((step) => (
              <Link
                key={step.n}
                href={step.href}
                className={
                  step.done
                    ? "inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[13px] font-medium text-emerald-700"
                    : "inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-white px-3 py-1 text-[13px] font-medium text-slate-600 transition-colors hover:border-brand hover:text-brand"
                }
              >
                {step.done ? (
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                ) : (
                  <Circle className="h-3.5 w-3.5" aria-hidden />
                )}
                {step.label}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <SectionLabel className="mb-3 mt-8">Google Play</SectionLabel>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Connection"
          value={playConnected ? "Connected" : "Not connected"}
          hint={stats.play.accountEmail || undefined}
        />
        <StatCard label="Play apps" value={stats.playApps} />
        <StatCard label="Testing configured" value={stats.testingConfigured} />
        <StatCard label="TestLoop testers" value={stats.totalTesters} />
        <StatCard label="Pending Play Console" value={stats.pendingTesters} />
      </div>
      <p className="mt-3 text-sm text-muted">
        Open {stats.openApps} · Closed {stats.closedApps} · Internal {stats.internalApps} ·{" "}
        <Link href="/play" className="font-medium text-brand hover:underline">
          Open Google Play
        </Link>
      </p>

      <SectionLabel className="mb-3 mt-10">TestLoop activity</SectionLabel>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active campaigns" value={stats.activeCampaigns} />
        <StatCard label="Testers needed" value={stats.testersNeeded} />
        <StatCard label="Active testers" value={stats.activeTesters} />
        <StatCard label="Unread alerts" value={unread} />
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <section>
          <SectionLabel className="mb-3">Recent apps</SectionLabel>
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
                  className="block rounded-card border border-line bg-white p-4 shadow-card transition-colors hover:border-line-strong hover:bg-surface"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="truncate font-medium text-slate-900">{campaign.app.name}</div>
                    <Badge tone={campaign.status === "ACTIVE" ? "good" : "warn"}>{campaign.status}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted">
                    {campaign.testersReceived} of {campaign.targetTesters} testers ·{" "}
                    {percent(campaign.testersReceived, campaign.targetTesters)}%
                  </p>
                  <div
                    className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-strong"
                    role="progressbar"
                    aria-valuenow={percent(campaign.testersReceived, campaign.targetTesters)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <span
                      className="block h-full rounded-full bg-brand"
                      style={{
                        width: `${Math.min(100, percent(campaign.testersReceived, campaign.targetTesters))}%`,
                      }}
                    />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
        <section>
          <SectionLabel className="mb-3">Recent tester activity</SectionLabel>
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
                  className="block rounded-card border border-line bg-white p-4 shadow-card transition-colors hover:border-line-strong hover:bg-surface"
                >
                  <div className="truncate font-medium text-slate-900">{row.campaign.app.name}</div>
                  <p className="mt-1 text-sm capitalize text-muted">
                    {row.status.replaceAll("_", " ").toLowerCase()}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      <SectionLabel className="mb-3 mt-10">Testing activity</SectionLabel>
      {stats.recentPlayActivity.length === 0 ? (
        <EmptyState
          title="No Google Play testing activity yet"
          body="When testers join a campaign, their status appears here."
        />
      ) : (
        <ul className="space-y-2">
          {stats.recentPlayActivity.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-start justify-between gap-3 rounded-card border border-line bg-white px-4 py-3 shadow-card"
            >
              <div className="min-w-0">
                <div className="text-sm font-medium text-slate-900">
                  {row.action.replaceAll("_", " ")}
                </div>
                {row.result ? (
                  <p className="mt-0.5 truncate text-sm text-muted">{row.result}</p>
                ) : null}
              </div>
              <span className="shrink-0 text-xs text-muted">{timeAgo(row.createdAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
