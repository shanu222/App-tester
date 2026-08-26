import { prisma } from "@/lib/db";
import { AppError, NotFoundError } from "@/lib/errors";
import { logActivity, notify } from "@/lib/audit";
import { assertOutreachAllowed, recordOutreach } from "@/lib/rate-limit";
import { renderTemplate, DEFAULT_TEMPLATES } from "@/lib/templates";
import { readCredentials } from "@/lib/integrations/store";
import { sendGmail } from "@/lib/integrations/gmail";
import { addGroupMember, manualGroupInstructions } from "@/lib/integrations/groups";
import { setTesterStatus } from "@/lib/services/testers";
import type { ServiceAccountJson } from "@/lib/integrations/play";
import { isDemoMode } from "@/lib/env";

export async function addTesterToGroup(input: {
  userId: string;
  testerCampaignId: string;
}) {
  const row = await prisma.testerCampaign.findFirst({
    where: { id: input.testerCampaignId, userId: input.userId },
    include: {
      tester: true,
      campaign: { include: { googleGroup: true, app: true } },
    },
  });
  if (!row) throw new NotFoundError("Tester campaign not found.");
  if (!row.tester.emailNormalized) throw new AppError("Confirm a tester email first.");
  if (!row.emailConfirmed) throw new AppError("Confirm the email before adding the tester.");
  const group = row.campaign.googleGroup;
  if (!group) {
    throw new AppError(
      "This campaign has no Google Group. Add a group email on the campaign, or add the tester in Play Console / Google Groups and confirm membership manually.",
    );
  }

  await setTesterStatus({
    userId: input.userId,
    testerCampaignId: row.id,
    to: "ADDING",
    note: "Starting Google Group membership",
  });
  await logActivity({
    userId: input.userId,
    campaignId: row.campaignId,
    testerId: row.testerId,
    action: "GROUP_ADD_STARTED",
    result: group.email,
  });

  const workspace = await prisma.integration.findUnique({
    where: { userId_provider: { userId: input.userId, provider: "GOOGLE_WORKSPACE" } },
  });
  const creds = readCredentials(workspace?.encryptedCredentials);
  const sa = creds?.serviceAccountJson
    ? (JSON.parse(creds.serviceAccountJson) as ServiceAccountJson)
    : null;

  if (isDemoMode()) {
    await prisma.googleGroupMembership.upsert({
      where: { groupId_email: { groupId: group.id, email: row.tester.emailNormalized } },
      update: { status: "GROUP_MEMBER", verifiedAt: new Date(), testerId: row.testerId },
      create: {
        groupId: group.id,
        testerId: row.testerId,
        email: row.tester.emailNormalized,
        status: "GROUP_MEMBER",
        verifiedAt: new Date(),
        manual: false,
      },
    });
    await setTesterStatus({
      userId: input.userId,
      testerCampaignId: row.id,
      to: "GROUP_MEMBER",
      note: "DEMO MODE membership recorded — not a production Google Group change.",
    });
    return { ok: true, manual: false, detail: "DEMO MODE: membership recorded locally only." };
  }

  if (!sa || workspace?.status !== "CONNECTED") {
    const instructions = manualGroupInstructions(group.email, row.tester.emailNormalized);
    await prisma.googleGroupMembership.upsert({
      where: { groupId_email: { groupId: group.id, email: row.tester.emailNormalized } },
      update: { status: "MANUAL_REQUIRED", lastError: instructions, testerId: row.testerId },
      create: {
        groupId: group.id,
        testerId: row.testerId,
        email: row.tester.emailNormalized,
        status: "MANUAL_REQUIRED",
        lastError: instructions,
        manual: true,
      },
    });
    await setTesterStatus({
      userId: input.userId,
      testerCampaignId: row.id,
      to: "ERROR",
      note: "Manual action required",
    });
    return { ok: false, manual: true, detail: instructions };
  }

  const result = await addGroupMember({
    sa,
    groupEmail: group.email,
    memberEmail: row.tester.emailNormalized,
  });
  if (!result.ok) {
    await prisma.googleGroupMembership.upsert({
      where: { groupId_email: { groupId: group.id, email: row.tester.emailNormalized } },
      update: { status: "FAILED", lastError: result.error, testerId: row.testerId },
      create: {
        groupId: group.id,
        testerId: row.testerId,
        email: row.tester.emailNormalized,
        status: "FAILED",
        lastError: result.error,
        manual: true,
      },
    });
    await setTesterStatus({
      userId: input.userId,
      testerCampaignId: row.id,
      to: "ERROR",
      note: result.error,
    });
    return {
      ok: false,
      manual: true,
      detail: result.manualFallback || result.error,
    };
  }

  await prisma.googleGroupMembership.upsert({
    where: { groupId_email: { groupId: group.id, email: row.tester.emailNormalized } },
    update: {
      status: result.data.verified ? "GROUP_MEMBER" : "UNVERIFIED",
      verifiedAt: result.data.verified ? new Date() : null,
      testerId: row.testerId,
    },
    create: {
      groupId: group.id,
      testerId: row.testerId,
      email: row.tester.emailNormalized,
      status: result.data.verified ? "GROUP_MEMBER" : "UNVERIFIED",
      verifiedAt: result.data.verified ? new Date() : null,
      manual: result.data.manualRequired,
    },
  });
  await setTesterStatus({
    userId: input.userId,
    testerCampaignId: row.id,
    to: result.data.verified ? "GROUP_MEMBER" : "ADDED",
    note: result.data.detail,
  });
  if (result.data.verified) {
    await logActivity({
      userId: input.userId,
      campaignId: row.campaignId,
      testerId: row.testerId,
      action: "GROUP_MEMBER_CONFIRMED",
      result: row.tester.emailNormalized,
    });
    await notify({
      userId: input.userId,
      type: "tester",
      title: "Tester successfully added",
      body: `${row.tester.emailNormalized} is a confirmed Google Group member.`,
      href: `/testers/${row.testerId}`,
      campaignId: row.campaignId,
    });
  }
  return { ok: true, manual: result.data.manualRequired, detail: result.data.detail };
}

export async function confirmManualMembership(userId: string, testerCampaignId: string) {
  const row = await prisma.testerCampaign.findFirst({
    where: { id: testerCampaignId, userId },
    include: { campaign: { include: { googleGroup: true } }, tester: true },
  });
  if (!row?.campaign.googleGroup || !row.tester.emailNormalized) {
    throw new AppError("Google Group or tester email missing.");
  }
  await prisma.googleGroupMembership.upsert({
    where: {
      groupId_email: {
        groupId: row.campaign.googleGroup.id,
        email: row.tester.emailNormalized,
      },
    },
    update: { status: "GROUP_MEMBER", verifiedAt: new Date(), manual: true },
    create: {
      groupId: row.campaign.googleGroup.id,
      testerId: row.testerId,
      email: row.tester.emailNormalized,
      status: "GROUP_MEMBER",
      verifiedAt: new Date(),
      manual: true,
    },
  });
  return setTesterStatus({
    userId,
    testerCampaignId,
    to: "GROUP_MEMBER",
    note: "Membership confirmed manually by the user.",
  });
}

export async function sendInvitation(input: {
  userId: string;
  testerCampaignId: string;
  sendEmail?: boolean;
}) {
  const row = await prisma.testerCampaign.findFirst({
    where: { id: input.testerCampaignId, userId: input.userId },
    include: { tester: true, campaign: { include: { app: true } } },
  });
  if (!row) throw new NotFoundError("Tester campaign not found.");
  if (!row.accessAdded && row.status !== "GROUP_MEMBER" && row.status !== "ADDED") {
    throw new AppError("Send the invitation only after tester access is added or membership is confirmed.");
  }
  const existing = await prisma.invitation.findFirst({
    where: { testerId: row.testerId, campaignId: row.campaignId, status: "sent" },
  });
  if (existing) throw new AppError("An invitation was already sent for this tester and campaign.");

  const testingLink = row.campaign.webOptInUrl;
  if (!testingLink) {
    throw new AppError("Testing link unavailable. Set the web opt-in URL on the campaign first.");
  }
  const template =
    (await prisma.messageTemplate.findFirst({
      where: { userId: input.userId, key: "TESTER_ADDED", campaignId: row.campaignId },
    })) ||
    (await prisma.messageTemplate.findFirst({
      where: { userId: input.userId, key: "TESTER_ADDED", campaignId: null },
    }));
  const body = renderTemplate(template?.body || DEFAULT_TEMPLATES.TESTER_ADDED.body, {
    testingLink,
    appName: row.campaign.app.name,
  });
  const subject = template?.subject || DEFAULT_TEMPLATES.TESTER_ADDED.subject;
  const invitation = await prisma.invitation.create({
    data: {
      userId: input.userId,
      campaignId: row.campaignId,
      testerId: row.testerId,
      testerCampaignId: row.id,
      body,
      subject,
      testingLink,
      status: "pending",
    },
  });

  const settings = await prisma.userSettings.findUnique({ where: { userId: input.userId } });
  if (input.sendEmail) {
    if (!settings?.allowAutomatedEmail) {
      throw new AppError("Automated email is disabled. Enable it in Settings or copy the invitation manually.");
    }
    if (!row.tester.emailNormalized) throw new AppError("Tester email missing.");
    await assertOutreachAllowed(input.userId, "EMAIL");
    const gmail = await prisma.integration.findUnique({
      where: { userId_provider: { userId: input.userId, provider: "GMAIL" } },
    });
    const creds = readCredentials(gmail?.encryptedCredentials);
    if (!creds?.refreshToken || gmail?.status !== "CONNECTED") {
      throw new AppError("Gmail is not connected. Connect Gmail or copy the invitation.");
    }
    const sent = await sendGmail({
      refreshToken: creds.refreshToken,
      from: creds.email || "me",
      to: row.tester.emailNormalized,
      subject,
      body,
    });
    if (!sent.ok) throw new AppError(sent.error);
    await recordOutreach(input.userId, "EMAIL");
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: "sent", sentAt: new Date(), externalId: sent.data.id },
    });
    await prisma.emailEvent.create({
      data: {
        userId: input.userId,
        campaignId: row.campaignId,
        testerId: row.testerId,
        type: "invitation",
        toAddress: row.tester.emailNormalized,
        subject,
        status: "sent",
      },
    });
  }

  await setTesterStatus({
    userId: input.userId,
    testerCampaignId: row.id,
    to: "INVITATION_SENT",
    note: input.sendEmail ? "Invitation emailed via Gmail API" : "Invitation generated for manual send",
  });
  await setTesterStatus({
    userId: input.userId,
    testerCampaignId: row.id,
    to: "OPT_IN_PENDING",
    note: "Waiting for Play opt-in. Added ≠ opted in.",
  });
  await logActivity({
    userId: input.userId,
    campaignId: row.campaignId,
    testerId: row.testerId,
    action: "INVITATION_SENT",
    result: testingLink,
  });
  return { invitation, testingLink, body, subject };
}
