import { TesterStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AppError, NotFoundError } from "@/lib/errors";
import { assertTransition } from "@/lib/status";
import { logActivity, notify } from "@/lib/audit";
import { describeEmail, normalizeEmail } from "@/lib/email-extract";
import { isDemoMode } from "@/lib/env";

async function appIdForCampaign(campaignId: string) {
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId },
    select: { appId: true },
  });
  return campaign?.appId;
}

export async function findDuplicateTester(
  userId: string,
  email: string,
  campaignId?: string,
) {
  const emailNormalized = normalizeEmail(email);
  const existing = await prisma.tester.findFirst({
    where: { userId, emailNormalized },
    include: { campaigns: true },
  });
  if (!existing) return { tester: null, inCampaign: false };
  const inCampaign = campaignId
    ? existing.campaigns.some((row) => row.campaignId === campaignId)
    : false;
  return { tester: existing, inCampaign };
}

export async function createOrGetTester(input: {
  userId: string;
  campaignId: string;
  email?: string;
  name?: string;
  facebookProfile?: string;
  facebookUserId?: string;
  opportunityId?: string;
  sourceLabel?: string;
  failIfDuplicate?: boolean;
}) {
  let tester = input.email
    ? (await findDuplicateTester(input.userId, input.email, input.campaignId)).tester
    : input.facebookUserId
      ? await prisma.tester.findFirst({
          where: { userId: input.userId, facebookUserId: input.facebookUserId },
        })
      : null;

  if (input.email) {
    const described = describeEmail(input.email);
    if (!described.valid) throw new AppError("Email invalid.");
    if (tester) {
      const existingLink = await prisma.testerCampaign.findUnique({
        where: { testerId_campaignId: { testerId: tester.id, campaignId: input.campaignId } },
      });
      if (existingLink) {
        if (input.failIfDuplicate) throw new AppError("Tester already exists.");
        return { tester, testerCampaign: existingLink, created: false };
      }
    } else {
      tester = await prisma.tester.create({
        data: {
          userId: input.userId,
          email: described.normalized,
          emailNormalized: described.normalized,
          name: input.name,
          facebookProfile: input.facebookProfile,
          facebookUserId: input.facebookUserId,
          opportunityId: input.opportunityId,
          sourceLabel: input.sourceLabel,
          isDemo: isDemoMode(),
        },
      });
    }
    const link = await prisma.testerCampaign.create({
      data: {
        userId: input.userId,
        testerId: tester.id,
        campaignId: input.campaignId,
        appId: await appIdForCampaign(input.campaignId),
        status: "EMAIL_RECEIVED",
        detectedEmail: described.normalized,
        dateEmailReceived: new Date(),
      },
    });
    await prisma.testerStatusHistory.create({
      data: {
        testerId: tester.id,
        testerCampaignId: link.id,
        toStatus: link.status,
        note: "Tester created",
      },
    });
    await logActivity({
      userId: input.userId,
      campaignId: input.campaignId,
      testerId: tester.id,
      action: "TESTER_CREATED",
      result: described.normalized,
    });
    return { tester, testerCampaign: link, created: true };
  }

  if (tester) {
    const existingLink = await prisma.testerCampaign.findUnique({
      where: { testerId_campaignId: { testerId: tester.id, campaignId: input.campaignId } },
    });
    if (existingLink) return { tester, testerCampaign: existingLink, created: false };
    const link = await prisma.testerCampaign.create({
      data: {
        userId: input.userId,
        testerId: tester.id,
        campaignId: input.campaignId,
        appId: await appIdForCampaign(input.campaignId),
        status: "DISCOVERED",
      },
    });
    return { tester, testerCampaign: link, created: false };
  }

  const record = await prisma.tester.create({
    data: {
      userId: input.userId,
      name: input.name,
      facebookProfile: input.facebookProfile,
      facebookUserId: input.facebookUserId,
      opportunityId: input.opportunityId,
      sourceLabel: input.sourceLabel,
      isDemo: isDemoMode(),
    },
  });
  const link = await prisma.testerCampaign.create({
    data: {
      userId: input.userId,
      testerId: record.id,
      campaignId: input.campaignId,
      appId: await appIdForCampaign(input.campaignId),
      status: "DISCOVERED",
    },
  });
  return { tester: record, testerCampaign: link, created: true };
}

export async function setTesterStatus(input: {
  userId: string;
  testerCampaignId: string;
  to: TesterStatus;
  note?: string;
}) {
  const row = await prisma.testerCampaign.findFirst({
    where: { id: input.testerCampaignId, userId: input.userId },
    include: { tester: true, campaign: true },
  });
  if (!row) throw new NotFoundError("Tester campaign not found.");
  assertTransition(row.status, input.to);
  const now = new Date();
  const data: Parameters<typeof prisma.testerCampaign.update>[0]["data"] = {
    status: input.to,
    lastActivityAt: now,
  };
  if (input.to === "CONTACTED") data.dateContacted = row.dateContacted ?? now;
  if (input.to === "REPLIED") data.dateReplied = row.dateReplied ?? now;
  if (input.to === "EMAIL_RECEIVED") data.dateEmailReceived = row.dateEmailReceived ?? now;
  if (input.to === "EMAIL_CONFIRMED") {
    data.dateEmailConfirmed = row.dateEmailConfirmed ?? now;
    data.emailConfirmed = true;
  }
  if (input.to === "ADDED" || input.to === "GROUP_MEMBER") {
    data.accessAdded = true;
    data.dateAdded = row.dateAdded ?? now;
    if (input.to === "GROUP_MEMBER") data.dateGroupMember = now;
  }
  if (input.to === "INVITATION_SENT") data.dateInvitationSent = now;
  if (input.to === "OPTED_IN") {
    data.optedIn = true;
    data.dateOptedIn = now;
  }
  if (input.to === "TESTING") data.dateTesting = now;
  if (input.to === "FEEDBACK_RECEIVED") data.dateFeedback = now;
  if (input.to === "BLOCKED") {
    await prisma.tester.update({
      where: { id: row.testerId },
      data: { blocked: true },
    });
  }

  const updated = await prisma.testerCampaign.update({
    where: { id: row.id },
    data,
  });
  await prisma.testerStatusHistory.create({
    data: {
      testerId: row.testerId,
      testerCampaignId: row.id,
      fromStatus: row.status,
      toStatus: input.to,
      note: input.note,
    },
  });
  await logActivity({
    userId: input.userId,
    campaignId: row.campaignId,
    testerId: row.testerId,
    action: `TESTER_STATUS_${input.to}`,
    result: input.note,
  });
  return updated;
}

export async function confirmTesterEmail(input: {
  userId: string;
  testerCampaignId: string;
  email: string;
}) {
  const described = describeEmail(input.email);
  if (!described.valid) throw new AppError("Email invalid.");
  const row = await prisma.testerCampaign.findFirst({
    where: { id: input.testerCampaignId, userId: input.userId },
    include: { tester: true },
  });
  if (!row) throw new NotFoundError("Tester campaign not found.");
  const duplicate = await findDuplicateTester(input.userId, described.normalized, row.campaignId);
  if (duplicate.tester && duplicate.tester.id !== row.testerId && duplicate.inCampaign) {
    throw new AppError("Tester already exists.");
  }
  await prisma.tester.update({
    where: { id: row.testerId },
    data: {
      email: described.normalized,
      emailNormalized: described.normalized,
    },
  });
  await prisma.testerCampaign.update({
    where: { id: row.id },
    data: {
      detectedEmail: described.normalized,
      emailConfirmed: true,
      dateEmailConfirmed: new Date(),
      dateEmailReceived: row.dateEmailReceived ?? new Date(),
    },
  });
  await setTesterStatus({
    userId: input.userId,
    testerCampaignId: row.id,
    to: "EMAIL_CONFIRMED",
    note: described.isGmail
      ? "Potential Google Play account email confirmed by user."
      : "Email confirmed. Not a Gmail address.",
  });
  await notify({
    userId: input.userId,
    type: "tester",
    title: "Gmail confirmed",
    body: `${described.normalized} confirmed for a tester.`,
    href: `/testers/${row.testerId}`,
    campaignId: row.campaignId,
  });
  await logActivity({
    userId: input.userId,
    campaignId: row.campaignId,
    testerId: row.testerId,
    action: "EMAIL_CONFIRMED",
    result: described.normalized,
  });
  return described;
}

export async function blockTester(userId: string, testerId: string, reason?: string) {
  const tester = await prisma.tester.findFirst({ where: { id: testerId, userId } });
  if (!tester) throw new NotFoundError("Tester not found.");
  await prisma.tester.update({ where: { id: testerId }, data: { blocked: true } });
  await prisma.blockListEntry.create({
    data: {
      userId,
      email: tester.emailNormalized,
      facebookUserId: tester.facebookUserId,
      reason: reason || "Blocked by user",
    },
  });
  await prisma.testerCampaign.updateMany({
    where: { testerId, userId },
    data: { status: "BLOCKED" },
  });
}

export async function isBlocked(userId: string, email?: string | null, facebookUserId?: string | null) {
  if (!email && !facebookUserId) return false;
  const entry = await prisma.blockListEntry.findFirst({
    where: {
      userId,
      OR: [
        email ? { email: normalizeEmail(email) } : undefined,
        facebookUserId ? { facebookUserId } : undefined,
      ].filter(Boolean) as object[],
    },
  });
  return Boolean(entry);
}
