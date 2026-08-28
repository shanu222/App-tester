import { AlertTriangle } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/auth";
import {
  getPlayConnection,
  listDiscoveredApps,
  safePlayConnection,
} from "@/lib/services/play-connection";
import { PlayConnectionPanel } from "@/components/play/play-connection-panel";
import { PlayAppsPanel } from "@/components/play/play-apps-panel";
import { PlayTestingGuide } from "@/components/play/play-testing-guide";
import { publicErrorMessage, UnauthorizedError } from "@/lib/errors";
import { sleep } from "@/lib/integrations/play-retry";
import { PlayPageRetry } from "@/components/play/play-page-retry";

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
  let user;
  try {
    user = await requireUser();
  } catch (error) {
    if (error instanceof UnauthorizedError) throw error;
    console.error("[testloop][play] session lookup failed, retrying", error);
    await sleep(400);
    user = await requireUser();
  }
  const { play: callbackStatus } = await searchParams;

  let loadError: string | null = null;
  let connectionRow = null;
  let discoveredApps: Awaited<ReturnType<typeof listDiscoveredApps>> = [];
  try {
    [connectionRow, discoveredApps] = await Promise.all([
      getPlayConnection(user.id),
      listDiscoveredApps(user.id),
    ]);
  } catch (error) {
    console.error("[testloop][play] page load failed", error);
    loadError = publicErrorMessage(error);
    try {
      connectionRow = await getPlayConnection(user.id);
    } catch (retryError) {
      console.error("[testloop][play] connection lookup retry failed", retryError);
    }
  }
  const connection = safePlayConnection(connectionRow);
  const notice = callbackStatus ? CALLBACK_NOTICES[callbackStatus] : undefined;

  return (
    <AppShell
      title="Google Play"
      description="Connected Google Play apps and testing configuration."
    >
      {notice ? (
        <div className="mb-6 flex gap-2.5 rounded-card border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
          <p className="text-sm leading-6 text-amber-900">{notice}</p>
        </div>
      ) : null}

      {loadError ? (
        <div className="mb-6 rounded-card border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm leading-6 text-amber-900">
            Google Play details could not be loaded just now. No Google Play data was changed.{" "}
            {loadError}
          </p>
          <div className="mt-3">
            <PlayPageRetry />
          </div>
        </div>
      ) : null}

      <PlayConnectionPanel connection={connection} />

      {connection.connected ? (
        <div className="mt-6 space-y-8">
          <PlayAppsPanel
            apps={discoveredApps}
            lastSyncAt={connection.lastSyncAt || connection.lastVerifiedAt}
          />
          <PlayTestingGuide />
        </div>
      ) : null}
    </AppShell>
  );
}
