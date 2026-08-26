import { prisma } from "@/lib/db";

export async function getDashboardStats(userId: string) {
  const [
    activeCampaigns,
    opportunities,
    emailsReceived,
    testersAdded,
    optedIn,
    testing,
    feedback,
    testers,
    campaigns,
  ] = await Promise.all([
    prisma.campaign.count({ where: { userId, status: "ACTIVE" } }),
    prisma.opportunity.count({ where: { userId, skipped: false, ignored: false } }),
    prisma.testerCampaign.count({ where: { userId, detectedEmail: { not: null } } }),
    prisma.testerCampaign.count({ where: { userId, accessAdded: true } }),
    prisma.testerCampaign.count({ where: { userId, optedIn: true } }),
    prisma.testerCampaign.count({
      where: {
        userId,
        status: { in: ["TESTING", "FEEDBACK_REQUESTED", "FEEDBACK_RECEIVED", "COMPLETED"] },
      },
    }),
    prisma.feedback.count({ where: { userId } }),
    prisma.tester.count({ where: { userId } }),
    prisma.campaign.findMany({
      where: { userId, status: { in: ["ACTIVE", "PAUSED"] } },
      include: { app: true, _count: { select: { testerCampaigns: true } } },
      take: 6,
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  return {
    activeCampaigns,
    potentialTesters: opportunities,
    emailsReceived,
    testersAdded,
    optedIn,
    currentlyTesting: testing,
    feedbackReceived: feedback,
    testers,
    campaigns,
  };
}

export async function getFunnel(userId: string, campaignId?: string) {
  const where = campaignId ? { userId, campaignId } : { userId };
  const posts = await prisma.facebookPost.count({ where: { userId } });
  const relevant = await prisma.opportunity.count({
    where: { userId, ...(campaignId ? { campaignId } : {}), relevanceScore: { gte: 55 } },
  });
  const contacted = await prisma.testerCampaign.count({
    where: { ...where, dateContacted: { not: null } },
  });
  const replied = await prisma.testerCampaign.count({
    where: { ...where, dateReplied: { not: null } },
  });
  const gmail = await prisma.testerCampaign.count({
    where: { ...where, detectedEmail: { not: null } },
  });
  const added = await prisma.testerCampaign.count({ where: { ...where, accessAdded: true } });
  const optedIn = await prisma.testerCampaign.count({ where: { ...where, optedIn: true } });
  const testing = await prisma.testerCampaign.count({
    where: {
      ...where,
      status: { in: ["TESTING", "FEEDBACK_REQUESTED", "FEEDBACK_RECEIVED", "COMPLETED"] },
    },
  });
  const feedback = await prisma.testerCampaign.count({
    where: { ...where, dateFeedback: { not: null } },
  });
  return [
    { key: "POSTS FOUND", value: posts },
    { key: "RELEVANT", value: relevant },
    { key: "CONTACTED", value: contacted },
    { key: "REPLIED", value: replied },
    { key: "GMAIL RECEIVED", value: gmail },
    { key: "ADDED", value: added },
    { key: "OPTED IN", value: optedIn },
    { key: "TESTING", value: testing },
    { key: "FEEDBACK", value: feedback },
  ];
}
