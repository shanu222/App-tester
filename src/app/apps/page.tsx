import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/auth";
import { listAppsWithStats } from "@/lib/services/apps";
import { MyAppsWorkspace } from "@/components/apps/my-apps-workspace";

export default async function AppsPage() {
  const user = await requireUser();
  const apps = await listAppsWithStats(user.id);
  return (
    <AppShell title="My Apps" description="Android apps you own, their tracks, and tester progress.">
      <MyAppsWorkspace
        apps={apps.map((app) => ({
          id: app.id,
          name: app.name,
          packageName: app.packageName,
          playStoreUrl: app.playStoreUrl,
          webOptInUrl: app.webOptInUrl,
          iconUrl: app.iconUrl,
          googlePlayStatus: app.googlePlayStatus,
          testingType: app.testingType,
          testerTarget: app.testerTarget,
          playConflictNote: app.playConflictNote,
          syncedFromPlay: app.syncedFromPlay,
          campaignStatus: app.campaignStatus,
          testersAdded: app.testersAdded,
          testersRegistered: app.testerCount,
          testingActivity: app.testingActivity,
          tracks: app.tracks.map((track) => ({
            id: track.id,
            name: track.name,
            testingType: track.testingType,
          })),
          campaign: app.campaign
            ? { id: app.campaign.id, name: app.campaign.name, status: app.campaign.status }
            : null,
        }))}
      />
    </AppShell>
  );
}
