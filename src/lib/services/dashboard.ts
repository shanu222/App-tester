import { prisma } from "@/lib/db";
import { countReceivedTesters } from "@/lib/services/network";

export async function getDashboardStats(userId: string) {
  const [
    apps,
    activeCampaigns,
    publishedCampaigns,
    testingForOthers,
    pendingParticipations,
    completedTests,
    pendingReciprocal,
    campaigns,
  ] = await Promise.all([
    prisma.app.count({ where: { userId } }),
    prisma.campaign.count({ where: { userId, status: "ACTIVE" } }),
    prisma.campaign.findMany({
      where: { userId, status: { in: ["ACTIVE", "PAUSED"] } },
      include: { app: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.testingParticipation.count({
      where: { testerUserId: userId, status: { notIn: ["DECLINED", "COMPLETED"] } },
    }),
    prisma.testingParticipation.count({
      where: { ownerUserId: userId, status: { in: ["ACCEPTED", "GMAIL_CONFIRMED", "ACCESS_PROCESSING", "MANUAL_REQUIRED"] } },
    }),
    prisma.testingParticipation.count({
      where: { testerUserId: userId, status: "COMPLETED" },
    }),
    prisma.reciprocalTest.count({
      where: { targetId: userId, status: "PENDING" },
    }),
    prisma.campaign.findMany({
      where: { userId, status: { in: ["ACTIVE", "PAUSED"] } },
      include: { app: true, _count: { select: { testerCampaigns: true, participations: true } } },
      take: 8,
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const campaignCards = await Promise.all(
    campaigns.map(async (campaign) => {
      const received = await countReceivedTesters(campaign.id);
      return {
        ...campaign,
        testersReceived: received,
        remaining: Math.max(0, campaign.targetTesters - received),
        progress: campaign.targetTesters ? Math.round((received / campaign.targetTesters) * 100) : 0,
      };
    }),
  );

  let testersNeeded = 0;
  let testersReceived = 0;
  for (const campaign of publishedCampaigns) {
    const received = await countReceivedTesters(campaign.id);
    testersReceived += received;
    testersNeeded += Math.max(0, campaign.targetTesters - received);
  }

  return {
    apps,
    activeCampaigns,
    testersNeeded,
    testersReceived,
    testingForOthers,
    pendingParticipations,
    completedTests,
    pendingReciprocal,
    campaigns: campaignCards,
  };
}

export async function getFunnel(userId: string, campaignId?: string) {
  const where = campaignId ? { ownerUserId: userId, campaignId } : { ownerUserId: userId };
  const requested = await prisma.testingParticipation.count({ where });
  const accepted = await prisma.testingParticipation.count({
    where: { ...where, status: { not: "DECLINED" } },
  });
  const configured = await prisma.testingParticipation.count({
    where: {
      ...where,
      status: { in: ["ADDED", "INVITATION_READY", "OPTED_IN", "ACTIVITY_DETECTED", "FEEDBACK_RECEIVED", "COMPLETED"] },
    },
  });
  const optedIn = await prisma.testingParticipation.count({
    where: {
      ...where,
      status: { in: ["OPTED_IN", "ACTIVITY_DETECTED", "FEEDBACK_RECEIVED", "COMPLETED"] },
    },
  });
  const activity = await prisma.testingParticipation.count({
    where: { ...where, status: { in: ["ACTIVITY_DETECTED", "FEEDBACK_RECEIVED", "COMPLETED"] } },
  });
  const feedback = await prisma.testingParticipation.count({
    where: { ...where, status: { in: ["FEEDBACK_RECEIVED", "COMPLETED"] } },
  });
  const completed = await prisma.testingParticipation.count({
    where: { ...where, status: "COMPLETED" },
  });
  const reciprocal = await prisma.reciprocalTest.count({
    where: {
      OR: [{ requesterId: userId }, { targetId: userId }],
      status: { in: ["ACCEPTED", "ACTIVE", "COMPLETED"] },
    },
  });
  return [
    { key: "REQUESTED", value: requested },
    { key: "ACCEPTED", value: accepted },
    { key: "CONFIGURED", value: configured },
    { key: "OPTED IN", value: optedIn },
    { key: "ACTIVITY", value: activity },
    { key: "FEEDBACK", value: feedback },
    { key: "COMPLETED", value: completed },
    { key: "RECIPROCAL", value: reciprocal },
  ];
}
