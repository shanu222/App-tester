import { CampaignStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { NotFoundError, AppError } from "@/lib/errors";
import { logActivity } from "@/lib/audit";
import { notifyRequestLifecycle } from "@/lib/services/notifications";
import { isDemoMode } from "@/lib/env";
import { campaignTestingUrl } from "@/lib/integrations/play-testers";
import { campaignAccessFields, detectTrackAccess } from "@/lib/integrations/play-access";
import { uniqueSlug } from "@/lib/slug";
import { env } from "@/lib/env";
import { PLAY_NOT_CONNECTED_FIRST } from "@/lib/play-disconnect";
import {
  detectTestingConfiguration,
  parseTracksSnapshot,
  playTrackFingerprint,
  preferDetectedTrack,
} from "@/lib/integrations/play-config";
import type { PlayTrackRecord } from "@/lib/integrations/types";

/**
 * Reserve the public /test/{slug} path for a campaign. Slugs are global because
 * the testing page is public and unauthenticated, so the app name is used as
 * the basis and a numeric suffix resolves collisions between developers.
 */
export async function allocateCampaignSlug(desired: string) {
  return uniqueSlug(desired, async (candidate) => {
    const existing = await prisma.campaign.findUnique({
      where: { publicSlug: candidate },
      select: { id: true },
    });
    return Boolean(existing);
  });
}

async function requirePlayConnectionForPost(userId: string) {
  const play = await prisma.googlePlayConnection.findUnique({
    where: { userId },
    select: { status: true, encryptedCredentials: true },
  });
  if (play?.status !== "CONNECTED" || !play.encryptedCredentials) {
    throw new AppError(PLAY_NOT_CONNECTED_FIRST, 409, "PLAY_NOT_CONNECTED");
  }
}

const ALLOWED_CAMPAIGN: Record<CampaignStatus, CampaignStatus[]> = {
  DRAFT: ["ACTIVE", "ARCHIVED"],
  ACTIVE: ["PAUSED", "COMPLETED"],
  PAUSED: ["ACTIVE", "COMPLETED", "ARCHIVED"],
  COMPLETED: ["ARCHIVED"],
  ARCHIVED: [],
};

export async function listCampaigns(userId: string) {
  return prisma.campaign.findMany({
    where: { userId },
    include: {
      app: true,
      source: true,
      _count: { select: { testerCampaigns: true, opportunities: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getCampaign(userId: string, id: string) {
  const campaign = await prisma.campaign.findFirst({
    where: { id, userId },
    include: {
      app: { include: { tracks: true } },
      track: true,
      source: true,
      testerCampaigns: { include: { tester: true } },
      participations: {
        include: {
          tester: {
            select: { id: true, name: true, developerName: true, image: true, country: true },
          },
        },
      },
      opportunities: { orderBy: { createdAt: "desc" }, take: 50 },
    },
  });
  if (!campaign) throw new NotFoundError("Campaign not found.");
  return ensureCampaignPublicFields(campaign);
}

/**
 * Older campaigns may predate publicSlug / testingUrl. Fill them in on read
 * so every campaign detail page can share a real TestLoop testing URL.
 */
export async function ensureCampaignPublicFields<
  T extends {
    id: string;
    name: string;
    testingType: "INTERNAL" | "CLOSED" | "OPEN";
    publicSlug: string | null;
    testingUrl: string | null;
    webOptInUrl: string | null;
    app: { name: string; packageName: string };
  },
>(campaign: T): Promise<T> {
  const data: { publicSlug?: string; testingUrl?: string } = {};
  if (!campaign.publicSlug) {
    data.publicSlug = await allocateCampaignSlug(campaign.app.name || campaign.name);
  }
  if (!campaign.testingUrl) {
    const resolved = campaignTestingUrl({
      testingType: campaign.testingType,
      packageName: campaign.app.packageName,
      configuredUrl: campaign.webOptInUrl,
    });
    if (resolved.url) data.testingUrl = resolved.url;
  }
  if (!Object.keys(data).length) return campaign;
  const updated = await prisma.campaign.update({
    where: { id: campaign.id },
    data,
    select: { publicSlug: true, testingUrl: true },
  });
  return { ...campaign, publicSlug: updated.publicSlug, testingUrl: updated.testingUrl };
}

export function campaignShareUrl(slug: string | null | undefined) {
  if (!slug) return null;
  return `${env.appUrl.replace(/\/$/, "")}/test/${slug}`;
}

const PLAY_CONFIG_CHANGED =
  "Google Play configuration changed. TestLoop refreshed the testing configuration. Please review the updated information.";

function playConfigChangedDetails(track: PlayTrackRecord | null) {
  return {
    preferredTrack: track?.track,
    testingType: track && track.typeGuess !== "PRODUCTION" ? track.typeGuess : undefined,
    fingerprint: track ? playTrackFingerprint(track) : undefined,
  };
}

async function loadPlayAppSnapshot(userId: string, packageName: string) {
  return prisma.googlePlayApp.findFirst({
    where: { userId, packageName },
  });
}

async function resolvePlayTestingTrack(input: {
  userId: string;
  packageName: string;
  playTrack?: string;
  fingerprint?: string;
  refresh: boolean;
  skipPlayRefresh?: boolean;
}) {
  if (input.refresh && !input.skipPlayRefresh) {
    const { syncPackageTracks } = await import("@/lib/services/play-connection");
    await syncPackageTracks({ userId: input.userId, packageName: input.packageName });
  }

  const playApp = await loadPlayAppSnapshot(input.userId, input.packageName);
  if (!playApp) {
    throw new AppError(
      "This application is not in the apps discovered from Google Play Console. Connect Google Play and refresh apps first.",
      409,
      "PLAY_APP_REQUIRED",
    );
  }

  const tracks = parseTracksSnapshot(playApp.tracksSnapshot);
  const config = detectTestingConfiguration(tracks);
  const preferred = preferDetectedTrack(config);
  if (!preferred) {
    throw new AppError(
      "No active testing track found. Create your testing track in Google Play Console first. TestLoop will not create one automatically.",
      409,
      "PLAY_NO_TESTING",
    );
  }

  const requested =
    (input.playTrack
      ? tracks.find((track) => track.track === input.playTrack && track.typeGuess !== "PRODUCTION")
      : null) || preferred.track;

  if (requested.typeGuess === "PRODUCTION") {
    throw new AppError(
      "Production is separate from testing. TestLoop will not publish a testing request for the production track.",
      409,
      "PLAY_PRODUCTION_TRACK",
    );
  }

  if (input.refresh && input.playTrack && requested.track !== input.playTrack) {
    throw new AppError(PLAY_CONFIG_CHANGED, 409, "PLAY_CONFIG_CHANGED", playConfigChangedDetails(preferred.track));
  }

  if (input.refresh && input.fingerprint && playTrackFingerprint(requested) !== input.fingerprint) {
    throw new AppError(PLAY_CONFIG_CHANGED, 409, "PLAY_CONFIG_CHANGED", playConfigChangedDetails(requested));
  }

  return { playApp, tracks, preferred, requested };
}

export async function createCampaign(
  userId: string,
  input: {
    name: string;
    appId?: string;
    packageName?: string;
    trackId?: string;
    /** Real Play Console track name, e.g. "internal" or "alpha". */
    playTrack?: string;
    playFingerprint?: string;
    sourceId?: string;
    targetTesters?: number;
    testingType?: "INTERNAL" | "CLOSED" | "OPEN";
    playStoreUrl?: string;
    webOptInUrl?: string;
    androidOptInUrl?: string;
    durationDays?: number;
    description?: string;
    testingInstructions?: string;
    reciprocalOpen?: boolean;
    published?: boolean;
    /** Internal: skip a second Play API round-trip when the caller just synced. */
    skipPlayRefresh?: boolean;
  },
) {
  await requirePlayConnectionForPost(userId);

  let app = input.appId
    ? await prisma.app.findFirst({ where: { id: input.appId, userId } })
    : null;
  const packageName = input.packageName || app?.packageName;
  if (!packageName) throw new NotFoundError("App not found.");

  if (!app) {
    const { selectPlayApp } = await import("@/lib/services/play-connection");
    const selected = await selectPlayApp({ userId, packageName });
    app = selected.app;
  }

  const { requested } = await resolvePlayTestingTrack({
    userId,
    packageName: app.packageName,
    playTrack: input.playTrack,
    fingerprint: input.playFingerprint,
    refresh: Boolean(input.published),
    skipPlayRefresh: input.skipPlayRefresh,
  });

  const testingType = requested.typeGuess as "INTERNAL" | "CLOSED" | "OPEN";
  let trackId = input.trackId;
  if (trackId) {
    const owned = await prisma.testingTrack.findFirst({
      where: { id: trackId, appId: app.id, trackId: requested.track },
    });
    if (!owned) trackId = undefined;
  }
  if (!trackId) {
    const linked = await prisma.testingTrack.findFirst({
      where: { appId: app.id, trackId: requested.track },
    });
    trackId = linked?.id;
  }

  const webOptInUrl = input.webOptInUrl || app.webOptInUrl || undefined;
  if (input.published) {
    const duplicate = await prisma.campaign.findFirst({
      where: {
        userId,
        appId: app.id,
        published: true,
        status: "ACTIVE",
        playTrack: requested.track,
        testingType,
      },
    });
    if (duplicate) {
      throw new AppError(
        "An active testing request already exists for this application and testing track.",
        409,
        "CAMPAIGN_DUPLICATE",
        { existingCampaignId: duplicate.id },
      );
    }
  }

  const publicSlug = await allocateCampaignSlug(app.name || input.name);
  const testingUrl = campaignTestingUrl({
    testingType,
    packageName: app.packageName,
    configuredUrl: webOptInUrl,
  }).url;
  const access = detectTrackAccess(testingType, requested);
  const campaign = await prisma.campaign.create({
    data: {
      userId,
      appId: app.id,
      trackId,
      playTrack: requested.track,
      publicSlug,
      testingUrl,
      sourceId: input.sourceId,
      name: input.name,
      testingType,
      ...campaignAccessFields(access),
      targetTesters: input.targetTesters ?? 12,
      requiredTesters: input.targetTesters ?? 12,
      durationDays: input.durationDays ?? 14,
      requiredActiveDays: input.durationDays ?? 14,
      description: input.description,
      testingInstructions: input.testingInstructions,
      reciprocalOpen: input.reciprocalOpen ?? true,
      published: Boolean(input.published),
      publishedAt: input.published ? new Date() : null,
      status: input.published ? "ACTIVE" : "DRAFT",
      startedAt: input.published ? new Date() : null,
      playStoreUrl: input.playStoreUrl || app.playStoreUrl,
      webOptInUrl,
      androidOptInUrl: input.androidOptInUrl || app.androidOptInUrl,
      isDemo: isDemoMode(),
    },
  });
  await logActivity({
    userId,
    campaignId: campaign.id,
    action: "CAMPAIGN_CREATED",
    result: campaign.name,
  });
  return campaign;
}

export async function publishCampaign(userId: string, id: string) {
  const campaign = await prisma.campaign.findFirst({
    where: { id, userId },
    include: { app: true },
  });
  if (!campaign) throw new NotFoundError("Campaign not found.");
  if (campaign.status === "ARCHIVED" || campaign.status === "COMPLETED") {
    throw new AppError("This campaign cannot be published.");
  }
  await requirePlayConnectionForPost(userId);
  const { requested } = await resolvePlayTestingTrack({
    userId,
    packageName: campaign.app.packageName,
    playTrack: campaign.playTrack || undefined,
    refresh: true,
  });
  const testingType = requested.typeGuess as "INTERNAL" | "CLOSED" | "OPEN";
  const duplicate = await prisma.campaign.findFirst({
    where: {
      userId,
      appId: campaign.appId,
      published: true,
      status: "ACTIVE",
      playTrack: requested.track,
      testingType,
      id: { not: id },
    },
  });
  if (duplicate) {
    throw new AppError(
      "An active testing request already exists for this application and testing track.",
      409,
      "CAMPAIGN_DUPLICATE",
      { existingCampaignId: duplicate.id },
    );
  }
  const testingUrl = campaignTestingUrl({
    testingType,
    packageName: campaign.app.packageName,
    configuredUrl: campaign.webOptInUrl,
  }).url;
  const updated = await prisma.campaign.update({
    where: { id },
    data: {
      published: true,
      publishedAt: campaign.publishedAt ?? new Date(),
      status: campaign.status === "DRAFT" || campaign.status === "PAUSED" ? "ACTIVE" : campaign.status,
      startedAt: campaign.startedAt ?? new Date(),
      playTrack: requested.track,
      testingType,
      testingUrl: testingUrl || campaign.testingUrl,
      ...campaignAccessFields(detectTrackAccess(testingType, requested)),
    },
  });
  await logActivity({ userId, campaignId: id, action: "CAMPAIGN_PUBLISHED", result: updated.name });
  return updated;
}

export async function removeTestingPost(userId: string, id: string) {
  const campaign = await prisma.campaign.findFirst({ where: { id, userId } });
  if (!campaign) throw new NotFoundError("Campaign not found.");
  const updated = await prisma.campaign.update({
    where: { id },
    data: {
      published: false,
      status: campaign.status === "COMPLETED" ? "COMPLETED" : "ARCHIVED",
    },
  });
  await logActivity({
    userId,
    campaignId: id,
    action: "CAMPAIGN_REMOVED",
    result: updated.name,
  });
  if (updated.status === "ARCHIVED") {
    await notifyRequestLifecycle({
      userId,
      campaignId: id,
      appName: updated.name,
      kind: "archived",
    }).catch(() => undefined);
  }
  return updated;
}

export async function stopTestingRequest(userId: string, id: string) {
  const campaign = await prisma.campaign.findFirst({ where: { id, userId } });
  if (!campaign) throw new NotFoundError("Campaign not found.");
  if (campaign.status === "ARCHIVED" || campaign.status === "COMPLETED") {
    throw new AppError("This testing request has already been closed.");
  }
  const updated = await prisma.campaign.update({
    where: { id },
    data: {
      published: false,
      status: "PAUSED",
      pausedAt: new Date(),
    },
  });
  await logActivity({
    userId,
    campaignId: id,
    action: "CAMPAIGN_STOPPED",
    result: updated.name,
  });
  return updated;
}

export async function deleteTestingPost(userId: string, id: string) {
  const campaign = await prisma.campaign.findFirst({ where: { id, userId } });
  if (!campaign) throw new NotFoundError("Campaign not found.");
  if (campaign.status !== "ARCHIVED" && campaign.status !== "COMPLETED") {
    throw new AppError("Archive this testing request before deleting it permanently.");
  }
  await prisma.campaign.delete({ where: { id } });
  await logActivity({
    userId,
    action: "CAMPAIGN_DELETED",
    result: campaign.name,
  });
  return { id, deleted: true as const };
}

export async function transitionCampaign(
  userId: string,
  id: string,
  to: CampaignStatus,
) {
  const campaign = await prisma.campaign.findFirst({ where: { id, userId } });
  if (!campaign) throw new NotFoundError("Campaign not found.");
  if (!ALLOWED_CAMPAIGN[campaign.status].includes(to)) {
    throw new AppError(`Cannot change campaign from ${campaign.status} to ${to}.`);
  }
  const data: Prisma.CampaignUpdateInput = { status: to };
  if (to === "ACTIVE") data.startedAt = campaign.startedAt ?? new Date();
  if (to === "PAUSED") data.pausedAt = new Date();
  if (to === "COMPLETED") data.completedAt = new Date();
  const updated = await prisma.campaign.update({ where: { id }, data });
  await logActivity({
    userId,
    campaignId: id,
    action: `CAMPAIGN_${to}`,
    result: updated.name,
  });
  if (to === "ARCHIVED" || to === "COMPLETED") {
    await notifyRequestLifecycle({
      userId,
      campaignId: id,
      appName: updated.name,
      kind: to === "ARCHIVED" ? "archived" : "completed",
    }).catch(() => undefined);
  }
  return updated;
}

export async function campaignStats(userId: string, campaignId: string) {
  const testers = await prisma.testerCampaign.findMany({
    where: { userId, campaignId },
  });
  const opportunities = await prisma.opportunity.count({ where: { userId, campaignId } });
  const comments = await prisma.commentDraft.count({
    where: { userId, campaignId, status: { in: ["POSTED", "MANUAL_COPY"] } },
  });
  const replies = testers.filter((row) => row.dateReplied).length;
  const emails = testers.filter((row) => row.detectedEmail).length;
  const added = testers.filter((row) => row.accessAdded).length;
  const optedIn = testers.filter((row) => row.optedIn).length;
  const testing = testers.filter((row) =>
    ["TESTING", "FEEDBACK_REQUESTED", "FEEDBACK_RECEIVED", "COMPLETED"].includes(row.status),
  ).length;
  const feedback = testers.filter((row) => row.dateFeedback).length;
  return {
    opportunities,
    comments,
    replies,
    emails,
    added,
    optedIn,
    testing,
    feedback,
    current: testers.length,
  };
}
