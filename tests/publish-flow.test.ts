import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function source(file: string) {
  return readFileSync(resolve(file), "utf8");
}

describe("publish / add / Play sync flow", () => {
  it("takes Publish App straight into publishing without the Manual vs Play chooser", () => {
    const campaignsPage = source("src/app/campaigns/page.tsx");
    const wizard = source("src/components/apps/add-app-wizard.tsx");
    expect(campaignsPage).toContain('flow="publish"');
    expect(campaignsPage).toContain("syncedFromPlay ? (\"play\" as const) : (\"manual\" as const)");
    expect(campaignsPage).not.toContain("syncedFromPlay: false");
    expect(wizard).toContain('if (flow === "publish") return "play"');
    expect(wizard).toContain('flow?: "add" | "publish"');
  });

  it("keeps the source chooser on Add App and still tracks Manual vs Google Play", () => {
    const workspace = source("src/components/apps/my-apps-workspace.tsx");
    const wizard = source("src/components/apps/add-app-wizard.tsx");
    expect(workspace).toContain("Add app");
    expect(workspace).not.toContain('flow="publish"');
    expect(wizard).toContain('title="Add your app"');
    expect(wizard).toContain("Connect Google Play");
    expect(wizard).toContain("Add manually");
    expect(workspace).toContain("syncedFromPlay");
    expect(workspace).toContain("connectionLabel(app.syncedFromPlay)");
  });

  it("publishes an already-added app without another Google Play sync", () => {
    const wizard = source("src/components/apps/add-app-wizard.tsx");
    const submit = wizard.slice(wizard.indexOf("async function onSubmit"), wizard.indexOf("const savedPlayApps"));
    expect(submit).toContain("skipPlayRefresh: true");
    expect(submit).not.toContain("await refreshFromPlay");
    const campaigns = source("src/lib/services/campaigns.ts");
    expect(campaigns).toContain("loadStoredPlayTracks");
    expect(campaigns).toContain("if (input.refresh && !input.skipPlayRefresh)");
  });

  it("saves Play Console imports in My Apps and imports new apps on Sync", () => {
    const syncRoute = source("src/app/api/google/play/apps/route.ts");
    expect(syncRoute).toContain("persistImportedPlayApp");
    expect(syncRoute).toContain("const importAllNew = addSet.size === 0");
    expect(syncRoute).toContain("if (importAllNew || addSet.has(playApp.packageName))");
    const play = source("src/lib/services/play-connection.ts");
    expect(play).toContain("export async function persistImportedPlayApp");
    expect(play).toContain("tracksSnapshot:");
    expect(play).toContain("selected: true");
  });

  it("starts publishing a specific My Apps row instead of redirecting to Add App", () => {
    const workspace = source("src/components/apps/my-apps-workspace.tsx");
    expect(workspace).toContain("livePublished");
    expect(workspace).toContain("`/campaigns?appId=${app.id}`");
    expect(workspace).toContain('livePublished ? "Manage testing" : "Publish testing"');
    const appDetail = source("src/app/apps/[id]/page.tsx");
    expect(appDetail).toContain("`/campaigns?appId=${app.id}`");
  });

  it("does not auto-publish and keeps duplicate-publishing protection", () => {
    const wizard = source("src/components/apps/add-app-wizard.tsx");
    expect(wizard).toContain('{pending ? "Publishing…" : "Publish testing request"}');
    expect(wizard).toContain("This app is already published for Closed Testing.");
    const marketplace = source("src/lib/services/marketplace-campaigns.ts");
    const ensure = marketplace.slice(
      marketplace.indexOf("export async function ensureMarketplaceCampaignForApp"),
      marketplace.indexOf("async function afterPublishedSafe"),
    );
    expect(ensure).not.toContain("prisma.campaign.create");
    expect(ensure).toContain('skipped: "needs-publish"');
  });
});
