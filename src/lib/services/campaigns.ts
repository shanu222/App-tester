import { CampaignStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { NotFoundError, AppError } from "@/lib/errors";
import { logActivity } from "@/lib/audit";
import { isDemoMode } from "@/lib/env";

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
      googleGroup: true,
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
      googleGroup: true,
      testerCampaigns: { include: { tester: true } },
      opportunities: { orderBy: { createdAt: "desc" }, take: 50 },
    },
  });
  if (!campaign) throw new NotFoundError("Campaign not found.");
  return campaign;
}

export async function createCampaign(
  userId: string,
  input: {
    name: string;
    appId: string;
    trackId?: string;
    sourceId?: string;
    googleGroupId?: string;
    targetTesters?: number;
    testingType?: "INTERNAL" | "CLOSED" | "OPEN";
    playStoreUrl?: string;
    webOptInUrl?: string;
    androidOptInUrl?: string;
  },
) {
  const app = await prisma.app.findFirst({ where: { id: input.appId, userId } });
  if (!app) throw new NotFoundError("App not found.");
  const webOptInUrl = input.webOptInUrl || app.webOptInUrl || undefined;
  const campaign = await prisma.campaign.create({
    data: {
      userId,
      appId: app.id,
      trackId: input.trackId,
      sourceId: input.sourceId,
      googleGroupId: input.googleGroupId,
      name: input.name,
      testingType: input.testingType || app.testingType,
      targetTesters: input.targetTesters ?? 12,
      requiredTesters: input.targetTesters ?? 12,
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
