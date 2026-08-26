import { prisma } from "@/lib/db";
import { AppError, ForbiddenError, NotFoundError, RateLimitError } from "@/lib/errors";
import { logActivity, notify } from "@/lib/audit";
import { createOrGetTester, setTesterStatus } from "@/lib/services/testers";
import { addTesterToGroup, confirmManualMembership } from "@/lib/services/invitations";
import { describeEmail } from "@/lib/email-extract";

const RECEIVED_STATUSES = [
  "GMAIL_CONFIRMED",
  "ACCESS_PROCESSING",
  "ADDED",
  "INVITATION_READY",
  "OPTED_IN",
  "ACTIVITY_DETECTED",
  "FEEDBACK_RECEIVED",
  "COMPLETED",
  "MANUAL_REQUIRED",
] as const;

export function publicDeveloper(user: {
  id: string;
  name: string | null;
  developerName: string | null;
  company: string | null;
  image: string | null;
  country: string | null;
  city: string | null;
  developerType: string | null;
  bio: string | null;
  github: string | null;
  website: string | null;
  linkedin: string | null;
  createdAt: Date;
  yearsExperience?: number | null;
  platforms?: string[];
}) {
  return {
    id: user.id,
    name: user.developerName || user.name || "Developer",
    company: user.company,
    image: user.image,
    country: user.country,
    city: user.city,
    developerType: user.developerType,
    bio: user.bio,
    github: user.github,
    website: user.website,
    linkedin: user.linkedin,
    yearsExperience: user.yearsExperience ?? null,
    platforms: user.platforms ?? [],
    joinedAt: user.createdAt,
  };
}

export async function developerScore(userId: string) {
  const accepted = await prisma.testingParticipation.count({
    where: { testerUserId: userId, status: { not: "DECLINED" } },
  });
  const completed = await prisma.testingParticipation.count({
    where: { testerUserId: userId, status: "COMPLETED" },
  });
  const feedback = await prisma.testingParticipation.count({
    where: { testerUserId: userId, status: { in: ["FEEDBACK_RECEIVED", "COMPLETED"] } },
  });
  const received = await prisma.testingParticipation.count({
    where: { ownerUserId: userId, status: { in: [...RECEIVED_STATUSES] } },
  });
  if (accepted < 3) {
    return {
      score: null as number | null,
      label: "Not enough completed tests yet (needs 3 accepted tests)",
      accepted,
      completed,
      feedback,
      received,
      completionRate: null as number | null,
    };
  }
  const completionRate = completed / accepted;
  return {
    score: Number((1 + completionRate * 4).toFixed(1)),
    label: "1 + 4 × (completed tests / accepted tests)",
    accepted,
    completed,
    feedback,
    received,
    completionRate,
  };
}

export async function developerBadges(userId: string) {
  const [user, apps, play, score] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.app.count({ where: { userId } }),
    prisma.integration.findFirst({
      where: { userId, provider: "GOOGLE_PLAY", status: "CONNECTED" },
    }),
    developerScore(userId),
  ]);
  const badges: Array<{ key: string; label: string }> = [{ key: "developer", label: "Developer" }];
  if (user?.emailVerified) badges.push({ key: "google", label: "Signed in with Google" });
  if (play) badges.push({ key: "play-connected", label: "Google Play connected" });
  if (user?.profileCompleted && apps > 0 && (score.completed >= 1 || Boolean(play))) {
    badges.push({ key: "verified", label: "Verified Developer" });
  }
  return { badges, apps, playConnected: Boolean(play), score };
}

export function matchExplanation(input: {
  reciprocalOpen: boolean;
  sameCountry: boolean;
  remaining: number;
  playConnected: boolean;
  testerLoad: number;
  testingType: string;
}) {
  const parts: Array<{ reason: string; points: number }> = [];
  if (input.reciprocalOpen) parts.push({ reason: "Reciprocal testing open", points: 25 });
  if (input.sameCountry) parts.push({ reason: "Same country", points: 20 });
  if (input.testingType === "CLOSED") parts.push({ reason: "Closed testing campaign", points: 15 });
  if (input.remaining > 0) parts.push({ reason: "Still needs testers", points: 15 });
  if (input.playConnected) parts.push({ reason: "Owner has Google Play connected", points: 15 });
  if (input.testerLoad < 5) parts.push({ reason: "Your current testing load is low", points: 10 });
  const score = Math.min(100, parts.reduce((sum, part) => sum + part.points, 0));
  return { score, parts };
}

export async function countReceivedTesters(campaignId: string) {
  return prisma.testingParticipation.count({
    where: { campaignId, status: { in: [...RECEIVED_STATUSES] } },
  });
}

async function blockedIdsFor(viewerId: string) {
  const [blocked, blockedBy] = await Promise.all([
    prisma.developerBlock.findMany({ where: { blockerId: viewerId }, select: { blockedId: true } }),
    prisma.developerBlock.findMany({ where: { blockedId: viewerId }, select: { blockerId: true } }),
  ]);
  return [...blocked.map((row) => row.blockedId), ...blockedBy.map((row) => row.blockerId)];
}

export async function listPublishedRequests(
  viewerId: string,
  filters?: { testingType?: string; reciprocal?: boolean },
) {
  const hidden = await blockedIdsFor(viewerId);
  const campaigns = await prisma.campaign.findMany({
    where: {
      published: true,
      status: "ACTIVE",
      userId: { not: viewerId, notIn: hidden },
      ...(filters?.testingType
        ? { testingType: filters.testingType as "CLOSED" | "INTERNAL" | "OPEN" }
        : {}),
      ...(filters?.reciprocal ? { reciprocalOpen: true } : {}),
    },
    include: { app: true, user: true },
    orderBy: { publishedAt: "desc" },
    take: 80,
  });
  const viewer = await prisma.user.findUnique({ where: { id: viewerId } });
  const play = await prisma.integration.findMany({
    where: {
      provider: "GOOGLE_PLAY",
      status: "CONNECTED",
      userId: { in: campaigns.map((item) => item.userId) },
    },
    select: { userId: true },
  });
  const playSet = new Set(play.map((item) => item.userId));
  const testerLoad = await prisma.testingParticipation.count({
    where: { testerUserId: viewerId, status: { notIn: ["COMPLETED", "DECLINED"] } },
  });
  return Promise.all(
    campaigns.map(async (campaign) => {
      const testersReceived = await countReceivedTesters(campaign.id);
      const remaining = Math.max(0, campaign.targetTesters - testersReceived);
      const match = matchExplanation({
        reciprocalOpen: campaign.reciprocalOpen,
        sameCountry: Boolean(viewer?.country && viewer.country === campaign.user.country),
        remaining,
        playConnected: playSet.has(campaign.userId),
        testerLoad,
        testingType: campaign.testingType,
      });
      return {
        id: campaign.id,
        name: campaign.name,
        testingType: campaign.testingType,
        targetTesters: campaign.targetTesters,
        durationDays: campaign.durationDays,
        description: campaign.description,
        reciprocalOpen: campaign.reciprocalOpen,
        publishedAt: campaign.publishedAt,
        testersReceived,
        remaining,
        match,
        groupConfigured: Boolean(campaign.googleGroupId),
        playConnected: playSet.has(campaign.userId),
        country: campaign.user.country,
        app: {
          id: campaign.app.id,
          name: campaign.app.name,
          packageName: campaign.app.packageName,
          iconUrl: campaign.app.iconUrl,
        },
        owner: publicDeveloper(campaign.user),
      };
    }),
  );
}

export async function getPublicRequest(viewerId: string, campaignId: string) {
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, published: true, status: "ACTIVE" },
    include: { app: true, user: true },
  });
  if (!campaign) throw new NotFoundError("Testing request not found.");
  const hidden = await blockedIdsFor(viewerId);
  if (hidden.includes(campaign.userId) && campaign.userId !== viewerId) {
    throw new ForbiddenError("This request is not available.");
  }
  const testersReceived = await countReceivedTesters(campaign.id);
  const mine = await prisma.testingParticipation.findUnique({
    where: { campaignId_testerUserId: { campaignId, testerUserId: viewerId } },
    select: {
      id: true,
      status: true,
      consentAt: true,
      lastError: true,
      createdAt: true,
      gmail: true,
    },
  });
  const play = await prisma.integration.findFirst({
    where: { userId: campaign.userId, provider: "GOOGLE_PLAY", status: "CONNECTED" },
  });
  return {
    id: campaign.id,
    name: campaign.name,
    testingType: campaign.testingType,
    targetTesters: campaign.targetTesters,
    durationDays: campaign.durationDays,
    description: campaign.description,
    testingInstructions: campaign.testingInstructions,
    reciprocalOpen: campaign.reciprocalOpen,
    publishedAt: campaign.publishedAt,
    webOptInUrl:
      mine &&
      ["ADDED", "INVITATION_READY", "OPTED_IN", "ACTIVITY_DETECTED", "FEEDBACK_RECEIVED", "COMPLETED"].includes(
        mine.status,
      )
        ? campaign.webOptInUrl
        : null,
    testersReceived,
    remaining: Math.max(0, campaign.targetTesters - testersReceived),
    groupConfigured: Boolean(campaign.googleGroupId),
    playConnected: Boolean(play),
    isOwner: campaign.userId === viewerId,
    owner: publicDeveloper(campaign.user),
    app: {
      id: campaign.app.id,
      name: campaign.app.name,
      packageName: campaign.app.packageName,
      iconUrl: campaign.app.iconUrl,
      playStoreUrl: campaign.app.playStoreUrl,
    },
    participation: mine
      ? {
          id: mine.id,
          status: mine.status,
          consentAt: mine.consentAt,
          lastError: mine.lastError,
          createdAt: mine.createdAt,
          gmail: mine.gmail && mine.consentAt ? mine.gmail : null,
        }
      : null,
  };
}

export async function acceptTestingRequest(testerUserId: string, campaignId: string) {
  const tester = await prisma.user.findUnique({ where: { id: testerUserId } });
  if (!tester?.profileCompleted) {
    throw new AppError("Complete your developer profile before accepting tests.", 403, "PROFILE_INCOMPLETE");
  }
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, published: true, status: "ACTIVE" },
  });
  if (!campaign) throw new NotFoundError("Testing request not found.");
  if (campaign.userId === testerUserId) throw new AppError("You cannot accept your own request.");
  const blocked = await prisma.developerBlock.findFirst({
    where: {
      OR: [
        { blockerId: campaign.userId, blockedId: testerUserId },
        { blockerId: testerUserId, blockedId: campaign.userId },
      ],
    },
  });
  if (blocked) throw new ForbiddenError("You cannot join this campaign.");
  const existing = await prisma.testingParticipation.findUnique({
    where: { campaignId_testerUserId: { campaignId, testerUserId } },
  });
  if (existing) return existing;
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const today = await prisma.testingParticipation.count({
    where: { testerUserId, createdAt: { gte: start } },
  });
  if (today >= 20) throw new RateLimitError("Daily testing-accept limit reached.");
  const participation = await prisma.testingParticipation.create({
    data: {
      campaignId,
      ownerUserId: campaign.userId,
      testerUserId,
      status: "ACCEPTED",
    },
  });
  await logActivity({
    userId: campaign.userId,
    campaignId,
    action: "TESTER_ACCEPTED",
    result: testerUserId,
  });
  await notify({
    userId: campaign.userId,
    type: "tester",
    title: "A developer accepted your testing request",
    body: "They still need to confirm the Gmail they will use for Google Play testing.",
    href: `/campaigns/${campaignId}`,
    campaignId,
  });
  return participation;
}

export async function confirmTestingGmail(testerUserId: string, campaignId: string, gmail: string) {
  const participation = await prisma.testingParticipation.findUnique({
    where: { campaignId_testerUserId: { campaignId, testerUserId } },
    include: { tester: true },
  });
  if (!participation) throw new NotFoundError("Accept the testing request first.");
  if (participation.consentAt && participation.gmail) {
    if (["FAILED", "MANUAL_REQUIRED"].includes(participation.status)) {
      return processTesterAccess(participation.id);
    }
    return participation;
  }
  const described = describeEmail(gmail);
  if (!described.valid) throw new AppError("Enter a valid email address used for Google Play.");
  const created = await createOrGetTester({
    userId: participation.ownerUserId,
    campaignId,
    email: described.normalized,
    name: participation.tester.name || participation.tester.developerName || undefined,
    sourceLabel: "Developer network",
  });
  await prisma.testerCampaign.update({
    where: { id: created.testerCampaign.id },
    data: { detectedEmail: described.normalized },
  });
  if (
    created.testerCampaign.status === "DISCOVERED" ||
    created.testerCampaign.status === "CONTACTED" ||
    created.testerCampaign.status === "REPLIED" ||
    created.testerCampaign.status === "EMAIL_RECEIVED"
  ) {
    await setTesterStatus({
      userId: participation.ownerUserId,
      testerCampaignId: created.testerCampaign.id,
      to: "EMAIL_CONFIRMED",
      note: "Developer consented to share Google Play Gmail",
    });
  }
  await prisma.testingParticipation.update({
    where: { id: participation.id },
    data: {
      gmail: described.normalized,
      consentAt: new Date(),
      testerCampaignId: created.testerCampaign.id,
      status: "GMAIL_CONFIRMED",
    },
  });
  await prisma.user.update({
    where: { id: testerUserId },
    data: { testingGmail: described.normalized },
  });
  await notify({
    userId: participation.ownerUserId,
    type: "tester",
    title: "Tester Gmail confirmed",
    body: "A developer consented to share their Google Play Gmail for this campaign.",
    href: `/testers/${created.tester.id}`,
    campaignId,
  });
  return processTesterAccess(participation.id);
}

export async function processTesterAccess(participationId: string) {
  const participation = await prisma.testingParticipation.findUnique({
    where: { id: participationId },
    include: { campaign: { include: { app: true } } },
  });
  if (!participation?.gmail || !participation.testerCampaignId) {
    throw new AppError("Gmail consent is required before tester access can be processed.");
  }
  if (["ADDED", "INVITATION_READY", "OPTED_IN", "ACTIVITY_DETECTED", "FEEDBACK_RECEIVED", "COMPLETED"].includes(participation.status)) {
    return participation;
  }
  await prisma.testingParticipation.update({
    where: { id: participation.id },
    data: { status: "ACCESS_PROCESSING", lastError: null },
  });
  try {
    if (!participation.campaign.googleGroupId) {
      const manual = await prisma.testingParticipation.update({
        where: { id: participation.id },
        data: {
          status: "MANUAL_REQUIRED",
          lastError:
            "Automatic group membership is unavailable for this account. Add the tester in Google Groups or Play Console, then confirm membership.",
        },
      });
      await notify({
        userId: participation.ownerUserId,
        type: "tester",
        title: "Manual Google Group action required",
        body: "A tester is waiting to be added. TestLoop did not change Google Group membership.",
        href: `/campaigns/${participation.campaignId}`,
        campaignId: participation.campaignId,
      });
      return manual;
    }
    const result = await addTesterToGroup({
      userId: participation.ownerUserId,
      testerCampaignId: participation.testerCampaignId,
    });
    const nextStatus = result.ok ? "ADDED" : result.manual ? "MANUAL_REQUIRED" : "FAILED";
    await prisma.testingParticipation.update({
      where: { id: participation.id },
      data: {
        status: nextStatus,
        lastError: result.ok ? null : result.detail,
      },
    });
    if (nextStatus === "ADDED" && participation.campaign.webOptInUrl) {
      await prisma.testingParticipation.update({
        where: { id: participation.id },
        data: { status: "INVITATION_READY" },
      });
      await notify({
        userId: participation.testerUserId,
        type: "tester",
        title: "You're ready to test",
        body: `${participation.campaign.app.name} testing access is configured.`,
        href: "/testing",
        campaignId: participation.campaignId,
      });
    } else if (nextStatus === "ADDED") {
      await notify({
        userId: participation.testerUserId,
        type: "tester",
        title: "Access granted",
        body: `${participation.campaign.app.name} tester access was configured. A testing/opt-in link has not been stored for this campaign yet.`,
        href: "/testing",
        campaignId: participation.campaignId,
      });
    }
    return prisma.testingParticipation.findUniqueOrThrow({ where: { id: participation.id } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Google Play action failed.";
    return prisma.testingParticipation.update({
      where: { id: participation.id },
      data: { status: "FAILED", lastError: message },
    });
  }
}

export async function markParticipationManuallyAdded(ownerUserId: string, participationId: string) {
  const participation = await prisma.testingParticipation.findFirst({
    where: { id: participationId, ownerUserId },
    include: { campaign: true },
  });
  if (!participation?.testerCampaignId) throw new NotFoundError("Participation not found.");
  if (participation.campaign.googleGroupId) {
    await confirmManualMembership(ownerUserId, participation.testerCampaignId);
  } else {
    await setTesterStatus({
      userId: ownerUserId,
      testerCampaignId: participation.testerCampaignId,
      to: "ADDED",
      note: "Owner confirmed the tester was added manually.",
    });
  }
  const next = participation.campaign.webOptInUrl ? "INVITATION_READY" : "ADDED";
  const updated = await prisma.testingParticipation.update({
    where: { id: participation.id },
    data: { status: next, lastError: null },
  });
  await notify({
    userId: participation.testerUserId,
    type: "tester",
    title: next === "INVITATION_READY" ? "You're ready to test" : "Access granted",
    body: "The app owner confirmed your tester access.",
    href: "/testing",
    campaignId: participation.campaignId,
  });
  return updated;
}

export async function markParticipationOptedIn(testerUserId: string, participationId: string) {
  const participation = await prisma.testingParticipation.findFirst({
    where: { id: participationId, testerUserId, status: { in: ["ADDED", "INVITATION_READY"] } },
  });
  if (!participation) throw new AppError("Testing access must be configured before opt-in can be recorded.");
  return prisma.testingParticipation.update({
    where: { id: participation.id },
    data: { status: "OPTED_IN" },
  });
}

export async function submitParticipationFeedback(
  testerUserId: string,
  participationId: string,
  input: {
    overall?: number;
    bugs?: string;
    uiIssues?: string;
    performance?: string;
    suggestions?: string;
  },
) {
  const participation = await prisma.testingParticipation.findFirst({
    where: { id: participationId, testerUserId },
    include: { campaign: true },
  });
  if (!participation?.testerCampaignId) throw new NotFoundError("Participation not found.");
  const link = await prisma.testerCampaign.findFirst({
    where: { id: participation.testerCampaignId, campaignId: participation.campaignId },
  });
  if (!link) throw new NotFoundError("Tester record not found.");
  const feedback = await prisma.feedback.create({
    data: {
      userId: participation.ownerUserId,
      campaignId: participation.campaignId,
      testerId: link.testerId,
      appId: participation.campaign.appId,
      overall: input.overall,
      bugs: input.bugs,
      uiIssues: input.uiIssues,
      performance: input.performance,
      suggestions: input.suggestions,
    },
  });
  await prisma.testingParticipation.update({
    where: { id: participation.id },
    data: { status: "FEEDBACK_RECEIVED" },
  });
  await notify({
    userId: participation.ownerUserId,
    type: "feedback",
    title: "Testing feedback submitted",
    body: "A developer submitted feedback for your app.",
    href: "/feedback",
    campaignId: participation.campaignId,
  });
  return feedback;
}

export async function requestReciprocal(requesterId: string, targetId: string, requesterAppId?: string) {
  if (requesterId === targetId) throw new AppError("Choose another developer.");
  const existing = await prisma.reciprocalTest.findFirst({
    where: { requesterId, targetId, status: { in: ["PENDING", "ACCEPTED", "ACTIVE"] } },
  });
  if (existing) return existing;
  const row = await prisma.reciprocalTest.create({
    data: { requesterId, targetId, requesterAppId, status: "PENDING" },
  });
  await notify({
    userId: targetId,
    type: "tester",
    title: "Reciprocal testing request",
    body: "A developer who is testing your app also needs testers.",
    href: "/testing",
  });
  return row;
}

export async function respondReciprocal(targetId: string, id: string, accept: boolean) {
  const row = await prisma.reciprocalTest.findFirst({ where: { id, targetId } });
  if (!row) throw new NotFoundError("Reciprocal request not found.");
  const updated = await prisma.reciprocalTest.update({
    where: { id },
    data: { status: accept ? "ACCEPTED" : "DECLINED" },
  });
  await notify({
    userId: row.requesterId,
    type: "tester",
    title: accept ? "Reciprocal testing accepted" : "Reciprocal testing declined",
    body: accept
      ? "The other developer agreed to test your app. Publish a campaign if you still need testers."
      : "The other developer declined for now.",
    href: "/testing",
  });
  return updated;
}

export async function sendDeveloperMessage(senderId: string, recipientId: string, body: string) {
  if (senderId === recipientId) throw new AppError("Choose another developer.");
  const hidden = await blockedIdsFor(senderId);
  if (hidden.includes(recipientId)) throw new ForbiddenError("You cannot message this developer.");
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const today = await prisma.developerMessage.count({
    where: { senderId, createdAt: { gte: start } },
  });
  if (today >= 40) throw new RateLimitError("Daily message limit reached.");
  const message = await prisma.developerMessage.create({
    data: { senderId, recipientId, body: body.trim() },
  });
  await notify({
    userId: recipientId,
    type: "message",
    title: "New message",
    body: "A developer sent you a message.",
    href: "/messages",
  });
  return message;
}

export async function reportDeveloper(authorId: string, input: { targetId?: string; campaignId?: string; reason: string; details?: string }) {
  if (!input.targetId && !input.campaignId) throw new AppError("Choose a developer or campaign to report.");
  return prisma.developerReport.create({
    data: {
      authorId,
      targetId: input.targetId,
      campaignId: input.campaignId,
      reason: input.reason,
      details: input.details,
    },
  });
}

export async function blockDeveloper(blockerId: string, blockedId: string, reason?: string) {
  if (blockerId === blockedId) throw new AppError("You cannot block yourself.");
  return prisma.developerBlock.upsert({
    where: { blockerId_blockedId: { blockerId, blockedId } },
    update: { reason },
    create: { blockerId, blockedId, reason },
  });
}
