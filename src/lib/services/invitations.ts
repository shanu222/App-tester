import { prisma } from "@/lib/db";
import { AppError, NotFoundError } from "@/lib/errors";
import { logActivity, notify } from "@/lib/audit";
import { assertOutreachAllowed, recordOutreach } from "@/lib/rate-limit";
import { renderTemplate, DEFAULT_TEMPLATES } from "@/lib/templates";
import { readCredentials } from "@/lib/integrations/store";
import { sendGmail } from "@/lib/integrations/gmail";
import {
  PLAY_OPEN_TRACK_NOTE,
  PLAY_TESTER_API_LIMITATION,
  playConsoleTesterSteps,
  playOptInUrl,
  testerAccessMode,
  type TesterAccessMode,
} from "@/lib/integrations/play-testers";
import { setTesterStatus } from "@/lib/services/testers";

export type TesterAccessResult = {
  ok: boolean;
  mode: TesterAccessMode;
  detail: string;
  /** Official Google Play opt-in URL, or null when the campaign has no package. */
  optInUrl: string | null;
  /** Play Console steps, present only when a manual addition is required. */
  steps: string[];
};

/**
 * Give a confirmed tester access to the campaign's Play track.
 *
 * Open tracks complete here: opting in is all Google requires, so TestLoop
 * marks the tester added and returns the official opt-in URL. Internal and
 * closed tracks cannot be automated — the Play Developer API exposes no
 * email-list write — so the tester is parked in ADDING and the developer is
 * told exactly what to paste into Play Console. Nothing is reported as done
 * that Google did not actually do.
 */
export async function grantTesterAccess(input: {
  userId: string;
  testerCampaignId: string;
}): Promise<TesterAccessResult> {
  const row = await prisma.testerCampaign.findFirst({
    where: { id: input.testerCampaignId, userId: input.userId },
    include: {
      tester: true,
      campaign: { include: { app: true, track: true } },
    },
  });
  if (!row) throw new NotFoundError("Tester campaign not found.");
  if (!row.tester.emailNormalized) throw new AppError("Confirm a tester email first.");
  if (!row.emailConfirmed) throw new AppError("Confirm the email before adding the tester.");

  const testingType = row.campaign.track?.testingType ?? row.campaign.testingType;
  const mode = testerAccessMode(testingType);
  const optInUrl =
    row.campaign.testingUrl ||
    row.campaign.webOptInUrl ||
    playOptInUrl(row.campaign.app.packageName);

  if (mode === "AUTOMATIC") {
    await setTesterStatus({
      userId: input.userId,
      testerCampaignId: row.id,
      to: "ADDED",
      note: PLAY_OPEN_TRACK_NOTE,
    });
    await logActivity({
      userId: input.userId,
      campaignId: row.campaignId,
      testerId: row.testerId,
      action: "TESTER_ACCESS_GRANTED",
      result: `${row.tester.emailNormalized} · open testing · ${row.campaign.app.packageName}`,
    });
    return { ok: true, mode, detail: PLAY_OPEN_TRACK_NOTE, optInUrl, steps: [] };
  }

  await setTesterStatus({
    userId: input.userId,
    testerCampaignId: row.id,
    to: "ADDING",
    note: "Waiting for the developer to add this address to the Play Console email list.",
  });
  await logActivity({
    userId: input.userId,
    campaignId: row.campaignId,
    testerId: row.testerId,
    action: "TESTER_AWAITING_PLAY_CONSOLE",
    result: `${row.tester.emailNormalized} · ${testingType.toLowerCase()} testing · ${row.campaign.app.packageName}`,
  });
  await notify({
    userId: input.userId,
    type: "tester",
    title: "Tester waiting for Play Console",
    body: `${row.tester.emailNormalized} is ready. Add the address to the ${testingType.toLowerCase()} testing email list, then mark it added.`,
    href: `/campaigns/${row.campaignId}`,
    campaignId: row.campaignId,
  });
  return {
    ok: false,
    mode,
    detail: PLAY_TESTER_API_LIMITATION,
    optInUrl,
    steps: playConsoleTesterSteps(testingType),
  };
}

/**
 * Record that the developer really did add the address in Play Console. Only
 * the developer can assert this, because Google exposes no way to read an
 * email list back.
 */
export async function confirmTesterAdded(userId: string, testerCampaignId: string) {
  const row = await prisma.testerCampaign.findFirst({
    where: { id: testerCampaignId, userId },
    include: { tester: true, campaign: { include: { app: true } } },
  });
  if (!row) throw new NotFoundError("Tester campaign not found.");
  if (!row.tester.emailNormalized) throw new AppError("Tester email missing.");

  await logActivity({
    userId,
    campaignId: row.campaignId,
    testerId: row.testerId,
    action: "TESTER_ADDED",
    result: `${row.tester.emailNormalized} · ${row.campaign.app.packageName} · confirmed by developer`,
  });
  return setTesterStatus({
    userId,
    testerCampaignId,
    to: "ADDED",
    note: "Developer confirmed the address was added to the Play Console email list.",
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
  if (!row.accessAdded && row.status !== "ADDED") {
    throw new AppError("Send the invitation only after tester access has been added.");
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
