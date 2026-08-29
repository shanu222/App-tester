import type { GooglePlayStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { isDemoMode } from "@/lib/env";
import { NotFoundError, AppError } from "@/lib/errors";
import { logActivity } from "@/lib/audit";
import { RESILIENCE_APPS } from "@/lib/catalog/resilience-apps";
import { isValidPackageName, validatePlayStoreUrl } from "@/lib/play-url";
import { campaignStats } from "@/lib/services/campaigns";

const seededWorkspaces = new Set<string>();

export async function ensureCatalogApps(userId: string, email?: string) {
  const allowed = (process.env.SEED_CATALOG_EMAIL || "").trim().toLowerCase();
  if (!allowed) return;
  const userEmail = (email || (await prisma.user.findUnique({ where: { id: userId }, select: { email: true } }))?.email || "").toLowerCase();
  if (userEmail !== allowed) return;
  if (seededWorkspaces.has(userId)) return;
  for (const item of RESILIENCE_APPS) {
    const existing = await prisma.app.findUnique({
      where: { userId_packageName: { userId, packageName: item.packageName } },
    });
    if (existing) {
      const data: Prisma.AppUpdateInput = {};
      if (!existing.playStoreUrl) data.playStoreUrl = item.playStoreUrl;
      if (existing.googlePlayStatus === "NOT_CONFIGURED") {
        data.googlePlayStatus = item.googlePlayStatus;
      }
      if (Object.keys(data).length) {
        await prisma.app.update({ where: { id: existing.id }, data });
      }
      continue;
    }
    const app = await prisma.app.create({
      data: {
        userId,
        name: item.name,
        packageName: item.packageName,
        playStoreUrl: item.playStoreUrl,
        googlePlayStatus: item.googlePlayStatus,
        testingType: item.testingType,
        testerTarget: item.testerTarget,
        isDemo: isDemoMode(),
      },
    });
    if (item.createCampaign) {
      await prisma.campaign.create({
        data: {
          userId,
          appId: app.id,
          name: `${item.name} — Closed Testing`,
          status: "ACTIVE",
          testingType: "CLOSED",
          targetTesters: item.testerTarget,
          requiredTesters: item.testerTarget,
          playStoreUrl: item.playStoreUrl,
          isDemo: isDemoMode(),
        },
      });
    }
  }
  seededWorkspaces.add(userId);
}

export async function createApp(
  userId: string,
  input: {
    name: string;
    packageName?: string | null;
    testingType?: "INTERNAL" | "CLOSED" | "OPEN";
    testingTrack?: string;
    googlePlayUrl?: string;
    testingUrl?: string;
    googlePlayLink?: string;
    iconUrl?: string;
    testerTarget?: number;
    googlePlayStatus?: GooglePlayStatus;
    syncedFromPlay?: boolean;
  },
) {
  const testingType = input.testingType || "CLOSED";
  const packageName = input.packageName?.trim() || "";
  const storeUrl = (input.googlePlayUrl || "").trim();

  if (packageName) {
    if (!isValidPackageName(packageName)) {
      throw new AppError("Package name must look like com.example.app.");
    }
    const existing = await prisma.app.findUnique({
      where: { userId_packageName: { userId, packageName } },
    });
    if (existing) {
      throw new AppError(`${existing.name} is already added to My Apps.`);
    }
  }

  let playStoreUrl: string | undefined;
  if (storeUrl) {
    if (!packageName) {
      throw new AppError("A package name is required when adding a Google Play URL.");
    }
    const validated = validatePlayStoreUrl(packageName, storeUrl);
    if (!validated.ok) throw new AppError(validated.error);
    playStoreUrl = validated.url;
  }

  const testingUrl = (input.testingUrl || input.googlePlayLink || "").trim() || undefined;
  if (testingUrl && /\/store\/apps\/details/i.test(testingUrl)) {
    throw new AppError(
      "The Google Play Store URL and the closed-testing opt-in URL are different. Leave Testing Link empty unless you have a real opt-in URL.",
    );
  }

  const syncedFromPlay = Boolean(input.syncedFromPlay);
  const status =
    input.googlePlayStatus ||
    (syncedFromPlay
      ? testingType === "INTERNAL"
        ? "INTERNAL_TESTING"
        : testingType === "OPEN"
          ? "OPEN_TESTING"
          : "CLOSED_TESTING"
      : "NOT_CONFIGURED");

  const app = await prisma.app.create({
    data: {
      userId,
      name: input.name.trim(),
      packageName: packageName || null,
      testingType,
      googlePlayStatus: status,
      testerTarget: input.testerTarget ?? 12,
      playStoreUrl,
      webOptInUrl: testingUrl,
      iconUrl: input.iconUrl?.trim() || undefined,
      syncedFromPlay,
      isDemo: isDemoMode(),
      tracks: input.testingTrack
        ? {
            create: {
              name: input.testingTrack,
              trackId: input.testingTrack,
              testingType,
              testingLink: testingUrl,
            },
          }
        : undefined,
    },
    include: { tracks: true },
  });
  await logActivity({ userId, action: "APP_CREATED", result: app.name });
  const { ensureMarketplaceCampaignForApp } = await import("@/lib/services/marketplace-campaigns");
  await ensureMarketplaceCampaignForApp(app.id).catch(() => undefined);
  return app;
}

export async function getApp(userId: string, id: string) {
  const app = await prisma.app.findFirst({
    where: { id, userId },
    include: { tracks: true, campaigns: { orderBy: { updatedAt: "desc" } } },
  });
  if (!app) throw new NotFoundError("App not found.");
  return app;
}

/**
 * Remove an app from TestLoop only. Never calls Google Play APIs and never
 * deletes or modifies the application in Google Play Console.
 */
export async function removeAppFromTestLoop(userId: string, id: string) {
  const app = await prisma.app.findFirst({
    where: { id, userId },
    select: { id: true, name: true, campaigns: { select: { id: true } } },
  });
  if (!app) throw new NotFoundError("App not found.");
  const campaignIds = app.campaigns.map((campaign) => campaign.id);

  await prisma.$transaction(
    async (tx) => {
      if (campaignIds.length) {
        await tx.notification.deleteMany({ where: { userId, campaignId: { in: campaignIds } } });
        await tx.activityLog.deleteMany({ where: { userId, campaignId: { in: campaignIds } } });
        await tx.emailEvent.deleteMany({ where: { userId, campaignId: { in: campaignIds } } });
        await tx.message.deleteMany({ where: { userId, campaignId: { in: campaignIds } } });
        await tx.messageTemplate.deleteMany({ where: { userId, campaignId: { in: campaignIds } } });
        await tx.opportunity.deleteMany({ where: { userId, campaignId: { in: campaignIds } } });
        await tx.commentDraft.deleteMany({ where: { userId, campaignId: { in: campaignIds } } });
      }

      await tx.emailEvent.deleteMany({
        where: { userId, eventKey: { startsWith: `play_track:${id}:` } },
      });
      await tx.googlePlayApp.updateMany({
        where: { userId, appId: id },
        data: { appId: null, selected: false },
      });
      await tx.managedTestingCampaign.updateMany({
        where: { userId, appId: id },
        data: { appId: null },
      });
      await tx.app.delete({ where: { id } });
    },
    { timeout: 60_000 },
  );

  await logActivity({ userId, action: "APP_REMOVED", result: app.name });
  return { removed: true as const, id };
}

export async function listAppsWithStats(userId: string) {
  const apps = await prisma.app.findMany({
    where: { userId },
    include: {
      tracks: true,
      campaigns: { orderBy: { updatedAt: "desc" } },
    },
    orderBy: { name: "asc" },
  });

  return Promise.all(
    apps.map(async (app) => {
      const activeCampaign =
        app.campaigns.find((campaign) => campaign.status === "ACTIVE") || app.campaigns[0] || null;
      const stats = activeCampaign
        ? await campaignStats(userId, activeCampaign.id)
        : { added: 0, optedIn: 0, testing: 0, current: 0 };
      return {
        ...app,
        testingUrl: app.webOptInUrl,
        googlePlayUrl: app.playStoreUrl,
        campaign: activeCampaign,
        campaignStatus: activeCampaign?.status || "NONE",
        testersAdded: stats.added,
        optedInTesters: stats.optedIn,
        testingActivity: stats.testing,
        testerCount: stats.current,
        testingTypes: Array.from(
          new Set([app.testingType, ...app.campaigns.map((campaign) => campaign.testingType)]),
        ),
      };
    }),
  );
}

export function statusFromPlayTracks(tracks: Array<{ typeGuess: string }>): GooglePlayStatus | null {
  const types = new Set(tracks.map((track) => track.typeGuess));
  if (types.has("OPEN")) return "OPEN_TESTING";
  if (types.has("CLOSED")) return "CLOSED_TESTING";
  if (types.has("INTERNAL")) return "INTERNAL_TESTING";
  if (types.has("PRODUCTION")) return "PRODUCTION";
  return null;
}
