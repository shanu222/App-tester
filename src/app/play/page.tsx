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
      <div className="mb-6 rounded-xl border border-slate-800 bg-card p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-medium">Status</h2>
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
        <p className="mt-2 text-sm leading-6 text-slate-400">
          TestLoop never asks for your Google password. Connect a Play Console service account using least privilege.
          Developer A cannot access Developer B&apos;s credentials.
        </p>
        {play?.lastError ? <p className="mt-3 text-sm text-amber-200">{play.lastError}</p> : null}
        {connected ? (
          <p className="mt-3 text-sm text-slate-300">
            Developer account: {play?.displayName || "Service account connected"} · Apps in TestLoop: {apps.length} ·
            Testing groups: {groups.length}
          </p>
        ) : (
          <p className="mt-3 text-sm text-slate-400">
            Available actions: paste a Play Console service account JSON and run a live API check. TestLoop will not
            show Connected until that check succeeds.
          </p>
        )}
        <p className="mt-3 text-xs text-slate-500">{PLAY_EMAIL_LIST_LIMITATION}</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <PlayConnectForm />
        <div>
          <h2 className="mb-3 font-medium">Google Groups</h2>
          <p className="mb-3 text-sm text-slate-400">{GROUPS_API_LIMITATION}</p>
          <WorkspaceForm />
        </div>
      </div>
      <h2 className="mb-3 mt-10 text-sm font-medium uppercase tracking-wide text-slate-500">Per-app configuration</h2>
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
            <div key={app.id} className="rounded-xl border border-slate-800 p-4 text-sm">
              <div className="font-medium">{app.name}</div>
              <div className="text-slate-400">{app.packageName}</div>
              <div className="mt-2 text-slate-300">
                Google Play: {connected ? "Connected" : "Not connected"} · Track: {app.testingType} · Group:{" "}
                {app.tracks.map((track) => track.googleGroupEmail).filter(Boolean).join(", ") || "Not configured"}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Store URL and testing/opt-in URL are stored separately. TestLoop will not treat a Play Store listing URL
                as an opt-in link.
              </div>
              <Link href={`/apps/${app.id}`} className="mt-2 inline-block text-emerald-300">
                Manage app
              </Link>
            </div>
          ))}
        </div>
      )}
      <p className="mt-4 text-sm text-slate-500">
        Workspace status: {workspace?.status === "CONNECTED" ? "Groups automation may be available" : "Manual Google Group action required unless Workspace is connected."}
      </p>
    </AppShell>
  );
}
