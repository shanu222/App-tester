import Link from "next/link";
import { AlertTriangle, Info } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/auth";
import { Card, CardHeader, SectionLabel } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/widgets";
import { prisma } from "@/lib/db";
import {
  getPlayConnection,
  listDiscoveredApps,
  safePlayConnection,
} from "@/lib/services/play-connection";
import { PLAY_OPEN_TRACK_NOTE, PLAY_TESTER_API_LIMITATION } from "@/lib/integrations/play-testers";
import { PlayConnectionPanel } from "@/components/play/play-connection-panel";
import { PlayAppsPanel } from "@/components/play/play-apps-panel";

/** Short status codes set by the OAuth callback redirect. */
const CALLBACK_NOTICES: Record<string, string> = {
  denied: "You cancelled the Google authorisation, so nothing was connected.",
  invalid: "Google's response was incomplete. Start the connection again.",
  state:
    "The authorisation could not be matched to your session. Start the connection again from this page.",
  expired: "The authorisation request timed out. Start the connection again.",
  error: "The authorisation could not be completed. Try again, or connect with a service account.",
  unverified:
    "Google authorised TestLoop, but the Play API check did not pass. The reason is shown below.",
};

export default async function PlayPage({
  searchParams,
}: {
  searchParams: Promise<{ play?: string }>;
}) {
  const user = await requireUser();
  const { play: callbackStatus } = await searchParams;

  const [connectionRow, discoveredApps, campaignCount] = await Promise.all([
    getPlayConnection(user.id),
    listDiscoveredApps(user.id),
    prisma.campaign.count({ where: { userId: user.id } }),
  ]);
  const connection = safePlayConnection(connectionRow);
  const managed = discoveredApps.filter((app) => app.selected);
  const notice = callbackStatus ? CALLBACK_NOTICES[callbackStatus] : undefined;

  return (
    <AppShell
      title="Google Play"
      description="Manage testing for your real Play Console apps through Google's official Play Developer API."
    >
      {notice ? (
        <div className="mb-6 flex gap-2.5 rounded-card border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
          <p className="text-sm leading-6 text-amber-900">{notice}</p>
        </div>
      ) : null}

      <PlayConnectionPanel connection={connection} />

      {connection.connected ? (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <StatCard label="Apps discovered" value={discoveredApps.length} />
            <StatCard label="Apps managed by TestLoop" value={managed.length} />
            <StatCard label="Testing campaigns" value={campaignCount} />
          </div>

          <div className="mt-6">
            <PlayAppsPanel apps={discoveredApps} />
          </div>

          <SectionLabel className="mb-3 mt-10">How testers get access</SectionLabel>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title="Open testing" />
              <p className="mt-3 text-sm leading-6 text-body">{PLAY_OPEN_TRACK_NOTE}</p>
            </Card>
            <Card>
              <CardHeader title="Internal and closed testing" />
              <p className="mt-3 text-sm leading-6 text-body">{PLAY_TESTER_API_LIMITATION}</p>
            </Card>
          </div>

          <div className="mt-4 flex gap-2.5 rounded-card border border-line bg-surface p-4">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden />
            <p className="text-sm leading-6 text-body">
              TestLoop reports exactly what the Play API returns. When an operation is not supported
              or your account lacks permission, you will see Google&apos;s own reason rather than a
              success message.
            </p>
          </div>

          {managed.length > 0 ? (
            <div className="mt-6">
              <Link href="/campaigns">
                <Button>Create a testing campaign</Button>
              </Link>
            </div>
          ) : null}
        </>
      ) : null}
    </AppShell>
  );
}
