import { AppShell } from "@/components/layout/app-shell";
import { StatCard, EmptyState } from "@/components/ui/widgets";
import { requireUser } from "@/auth";
import { getDashboardStats } from "@/lib/services/dashboard";
import { listDeveloperPayments } from "@/lib/services/managed-testing";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TestingTypeBadge } from "@/components/ui/testing-type-badge";
import { SectionLabel } from "@/components/ui/card";
import { AppMark } from "@/components/brand/app-mark";
import { InfoPopover } from "@/components/ui/info-popover";
import { CheckCircle2, Circle } from "lucide-react";

function ModeMark({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className="text-xs text-slate-600">
      {label}{" "}
      <span className={ok ? "font-medium text-emerald-700" : "text-muted"}>{ok ? "✓" : "—"}</span>
    </span>
  );
}

export default async function DashboardPage() {
  const user = await requireUser();
  const [stats, unread, testing, billing] = await Promise.all([
    getDashboardStats(user.id),
    prisma.notification.count({ where: { userId: user.id, readAt: null } }),
    prisma.testingParticipation.findMany({
      where: { testerUserId: user.id, status: { notIn: ["DECLINED"] } },
      include: { campaign: { include: { app: true } } },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    listDeveloperPayments(user.id),
  ]);
  const playConnected = stats.play.connected;
  const steps = [
    { n: 1, label: "Profile", done: user.profileCompleted, href: "/profile" },
    { n: 2, label: "Google Play", done: playConnected, href: "/play" },
    { n: 3, label: "First request", done: stats.activeCampaigns > 0, href: "/campaigns" },
  ];
  const showOnboarding = !user.onboardingCompleted || !playConnected;

  return (
    <AppShell
      title="Dashboard"
      description={`Welcome back, ${user.developerName || user.name || "developer"}.`}
      actions={
        <Link href="/requests">
          <Button variant="secondary">Discover Testing</Button>
        </Link>
      }
    >
      <p className="sr-only">Welcome back, {user.developerName || user.name || "developer"}.</p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Google Play apps" value={stats.playApps} hint={playConnected ? "Connected" : "Not connected"} />
        <StatCard label="Active testing requests" value={stats.activeCampaigns} />
        <StatCard label="Active testers" value={stats.activeTesters} />
        <StatCard label="Pending actions" value={stats.pendingTesters + unread} />
      </div>

      <div className="mt-6 rounded-card border border-line bg-white p-5 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <SectionLabel>Managed Beta Testing</SectionLabel>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-700">
              Purchase a tester package and TestLoop coordinates consenting testing participants for your app.
            </p>
            {billing.activePackage ? (
              <p className="mt-2 text-sm text-slate-600">
                Active package: {billing.activePackage.packageName}. Remaining tester allocation:{" "}
                {billing.allocation.remaining}.
              </p>
            ) : (
              <p className="mt-2 text-sm text-muted">No approved tester package yet.</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/settings">
              <Button variant="secondary">Payments & Packages</Button>
            </Link>
            <Link href="/managed-testing">
              <Button>View packages</Button>
            </Link>
          </div>
        </div>
      </div>

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
                {step.done ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> : <Circle className="h-3.5 w-3.5" aria-hidden />}
                {step.label}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-8 flex items-center gap-1.5">
        <SectionLabel className="mb-0">Recent apps</SectionLabel>
        <InfoPopover title="Google Play apps">
          These are apps discovered from your connected Play Console. TestLoop does not create Play apps.
        </InfoPopover>
      </div>
      <div className="mt-3">
        {!playConnected ? (
          <EmptyState
            title="No apps connected"
            body="Connect Google Play to discover your existing apps."
            action={
              <Link href="/play">
                <Button>Connect Google Play</Button>
              </Link>
            }
          />
        ) : stats.recentApps.length === 0 ? (
          <EmptyState
            title="No apps discovered yet"
            body="Refresh from Google Play to load your existing applications."
            action={
              <Link href="/play">
                <Button variant="secondary">Open Google Play</Button>
              </Link>
            }
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {stats.recentApps.map((app) => (
              <div key={app.name} className="rounded-card border border-line bg-white p-4 shadow-card">
                <div className="flex items-start gap-3">
                  <AppMark name={app.name} src={app.iconUrl} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-slate-900">{app.name}</div>
                    <div className="mt-1 flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" aria-hidden />
                      Google Play connected
                    </div>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
                      <ModeMark ok={app.configuration.internal} label="Internal" />
                      <ModeMark ok={app.configuration.closed} label="Closed" />
                      <ModeMark ok={app.configuration.open} label="Open" />
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <Link href={app.appId ? `/apps/${app.appId}` : "/play"}>
                    <Button size="sm">Manage Testing</Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <SectionLabel className="mb-3 mt-10">My testing</SectionLabel>
      {testing.length === 0 ? (
        <EmptyState
          title="You are not testing any apps yet"
          body="Browse published requests from other developers."
          action={
            <Link href="/requests">
              <Button variant="secondary">Discover Testing</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {testing.map((row) => (
            <Link
              key={row.id}
              href="/testing"
              className="flex items-center justify-between gap-3 rounded-card border border-line bg-white p-4 shadow-card transition-colors hover:border-line-strong"
            >
              <div className="min-w-0">
                <div className="truncate font-medium text-slate-900">{row.campaign.app.name}</div>
                <p className="mt-0.5 text-sm capitalize text-muted">
                  {row.status.replaceAll("_", " ").toLowerCase()}
                </p>
              </div>
              <TestingTypeBadge type={row.campaign.testingType} />
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
