import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";
import { PlayConnectForm } from "@/components/integrations/play-connect-form";
import { WorkspaceForm } from "@/components/integrations/workspace-form";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/widgets";
import { PLAY_EMAIL_LIST_LIMITATION, GROUPS_API_LIMITATION } from "@/lib/integrations/capabilities";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function PlayPage() {
  const user = await requireUser();
  const [play, workspace, apps, groups] = await Promise.all([
    prisma.integration.findFirst({ where: { userId: user.id, provider: "GOOGLE_PLAY" } }),
    prisma.integration.findFirst({ where: { userId: user.id, provider: "GOOGLE_WORKSPACE" } }),
    prisma.app.findMany({ where: { userId: user.id }, include: { tracks: true } }),
    prisma.googleGroup.findMany({ where: { userId: user.id } }),
  ]);
  const connected = play?.status === "CONNECTED";
  const statusLabel =
    play?.status === "CONNECTED"
      ? "Connected"
      : play?.status === "ERROR"
        ? "Error"
        : play?.status === "EXPIRED"
          ? "Expired"
          : play?.status === "CONNECTING"
            ? "Connecting"
            : "Not connected";

  return (
    <AppShell title="Google Play">
      <div className="mb-6 rounded-card border border-line bg-white p-5 shadow-card">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[15px] font-semibold text-slate-900">Status</h2>
          <Badge
            tone={
              connected
                ? "good"
                : play?.status === "ERROR" || play?.status === "EXPIRED"
                  ? "bad"
                  : play?.status === "CONNECTING"
                    ? "warn"
                    : "neutral"
            }
          >
            {statusLabel}
          </Badge>
        </div>
        <p className="mt-2 text-sm leading-6 text-muted">
          TestLoop never asks for your Google password. Connect a Play Console service account using least privilege.
          Developer A cannot access Developer B&apos;s credentials.
        </p>
        {play?.lastError ? (
          <p className="mt-3 rounded-control border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-800">
            {play.lastError}
          </p>
        ) : null}
        {connected ? (
          <p className="mt-3 text-sm text-body">
            Developer account: {play?.displayName || "Service account connected"} · Apps in TestLoop: {apps.length} ·
            Testing groups: {groups.length}
          </p>
        ) : (
          <p className="mt-3 text-sm text-muted">
            Available actions: paste a Play Console service account JSON and run a live API check. TestLoop will not
            show Connected until that check succeeds.
          </p>
        )}
        <p className="mt-3 border-t border-line pt-3 text-xs leading-5 text-muted">
          {PLAY_EMAIL_LIST_LIMITATION}
        </p>
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <PlayConnectForm />
        <div>
          <h2 className="text-[15px] font-semibold text-slate-900">Google Groups</h2>
          <p className="mb-3 mt-1 text-sm leading-6 text-muted">{GROUPS_API_LIMITATION}</p>
          <WorkspaceForm />
        </div>
      </div>
      <h2 className="mb-3 mt-10 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">Per-app configuration</h2>
      {apps.length === 0 ? (
        <EmptyState
          title="No apps yet"
          body="Add an Android app before configuring a Google Play testing track or group."
          action={
            <Link href="/apps">
              <Button>Add an app</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {apps.map((app) => (
            <div key={app.id} className="rounded-card border border-line bg-white p-4 shadow-card sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium text-slate-900">{app.name}</div>
                  <div className="mt-0.5 font-mono text-xs text-muted">{app.packageName}</div>
                </div>
                <Badge tone={connected ? "good" : "neutral"}>
                  {connected ? "Play connected" : "Play not connected"}
                </Badge>
              </div>

              <dl className="mt-4 grid gap-3 border-t border-line pt-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-muted">Track</dt>
                  <dd className="mt-0.5 font-medium text-slate-900">{app.testingType}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-xs text-muted">Google Group</dt>
                  <dd className="mt-0.5 truncate font-medium text-slate-900">
                    {app.tracks.map((track) => track.googleGroupEmail).filter(Boolean).join(", ") ||
                      "Not configured"}
                  </dd>
                </div>
              </dl>

              <p className="mt-3 text-xs leading-5 text-muted">
                Store URL and testing/opt-in URL are stored separately. TestLoop will not treat a Play Store
                listing URL as an opt-in link.
              </p>
              <Link
                href={`/apps/${app.id}`}
                className="mt-3 inline-block text-sm font-medium text-brand hover:underline"
              >
                Manage app
              </Link>
            </div>
          ))}
        </div>
      )}
      <p className="mt-4 text-sm text-muted">
        Workspace status: {workspace?.status === "CONNECTED" ? "Groups automation may be available" : "Manual Google Group action required unless Workspace is connected."}
      </p>
    </AppShell>
  );
}
