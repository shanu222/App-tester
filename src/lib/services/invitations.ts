import { prisma } from "@/lib/db";
import { AppError, NotFoundError } from "@/lib/errors";
import { logActivity, notify } from "@/lib/audit";
import { assertOutreachAllowed, recordOutreach } from "@/lib/rate-limit";
import { renderTemplate, DEFAULT_TEMPLATES } from "@/lib/templates";
import { readCredentials } from "@/lib/integrations/store";
import { sendGmail } from "@/lib/integrations/gmail";
import {
  PLAY_INTERNAL_TESTING_TESTER_NOTE,
  PLAY_OPEN_TRACK_NOTE,
  PLAY_TESTER_API_LIMITATION,
  PLAY_VERIFY_UNAVAILABLE,
  campaignTestingUrl,
  playConsoleTesterSteps,
  testerAccessMode,
  type TesterAccessMode,
} from "@/lib/integrations/play-testers";
import {
  detectTrackAccess,
  GROUP_JOIN_NEXT_STEP,
  type TesterJoinKind,
} from "@/lib/integrations/play-access";
import { parseTracksSnapshot, playTrackDisplayName } from "@/lib/integrations/play-config";
import { setTesterStatus } from "@/lib/services/testers";
import { notifyTesterJoined } from "@/lib/services/notifications";
import type { PlayEnrollmentStatus } from "@prisma/client";
import type { PlayEnrollmentOutcome } from "@/lib/integrations/play";

export type TesterAccessResult = {
  ok: boolean;
  mode: TesterAccessMode;
  outcome: PlayEnrollmentOutcome;
  detail: string;
  optInUrl: string | null;
  steps: string[];
  playEnrollmentStatus: PlayEnrollmentStatus;
  groupJoinUrl: string | null;
  joinKind: TesterJoinKind;
};

export async function notifyCampaignOwner(input: {
  ownerUserId: string;
  campaignId: string;
  title: string;
  body: string;
  href: string;
  emailSubject?: string;
  emailText?: string;
}) {
  void input.emailSubject;
  void input.emailText;
  await notify({
    userId: input.ownerUserId,
    type: "tester",
    title: input.title,
    body: input.body,
    href: input.href,
    campaignId: input.campaignId,
  });
}

async function trackAccessForCampaign(campaign: {
  userId: string;
  testingType: "OPEN" | "CLOSED" | "INTERNAL";
  playTrack: string | null;
  testingAccessMethod: string | null;
  googleGroupConfigured: boolean | null;
  googleGroupEmail: string | null;
  app: { packageName: string };
}) {
  const playApp = await prisma.googlePlayApp.findFirst({
    where: { userId: campaign.userId, packageName: campaign.app.packageName },
    select: { tracksSnapshot: true },
  });
  const tracks = parseTracksSnapshot(playApp?.tracksSnapshot);
  const track =
    tracks.find((row) => row.track === campaign.playTrack) ||
    tracks.find((row) => row.typeGuess === campaign.testingType) ||
    null;
  return detectTrackAccess(campaign.testingType, track, campaign);
}

function waitNote(testingType: "OPEN" | "CLOSED" | "INTERNAL") {
  return testingType === "INTERNAL" ? PLAY_INTERNAL_TESTING_TESTER_NOTE : PLAY_TESTER_API_LIMITATION;
}

/**
 * Record a tester after Gmail consent.
 *
 * Open testing: TestLoop stores the Gmail and returns Google's testing link.
 * It does not write a Play tester list.
 *
 * Closed/internal: TestLoop creates a waiting request. The developer adds the
 * Gmail in Play Console, then confirms in TestLoop. The Play testers API is
 * not called.
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
  const granted = row;

  const testingType = granted.campaign.track?.testingType ?? granted.campaign.testingType;
  const mode = testerAccessMode(testingType);
  const access = await trackAccessForCampaign({
    userId: granted.campaign.userId,
    testingType,
    playTrack: granted.campaign.playTrack,
    testingAccessMethod: granted.campaign.testingAccessMethod,
    googleGroupConfigured: granted.campaign.googleGroupConfigured,
    googleGroupEmail: granted.campaign.googleGroupEmail,
    app: granted.campaign.app,
  });
  const testing = campaignTestingUrl({
    testingType,
    packageName: granted.campaign.app.packageName,
    configuredUrl: granted.campaign.testingUrl || granted.campaign.webOptInUrl,
  });
  const optInUrl = testing.url;
  const testerCount = await prisma.testerCampaign.count({ where: { campaignId: granted.campaignId } });
  const trackLabel = playTrackDisplayName(granted.campaign.playTrack || testingType.toLowerCase());

  async function emailOwner(status: string, actionRequired: string | null, joinKind: TesterJoinKind) {
    const participation = await prisma.testingParticipation.findFirst({
      where: { testerCampaignId: granted.id },
      select: { testerUserId: true, createdAt: true },
    });
    await notifyTesterJoined({
      ownerUserId: input.userId,
      campaignId: granted.campaignId,
      testerKey: participation?.testerUserId ?? granted.tester.emailNormalized ?? granted.testerId,
      testerId: granted.testerId,
      appName: granted.campaign.app.name,
      testingType,
      trackLabel,
      testerStatus: status,
      testerCount,
      targetTesters: granted.campaign.targetTesters,
      actionRequired,
      joinKind,
      testerName: granted.tester.name,
      testerEmail: granted.tester.emailNormalized || granted.tester.email,
      requestedAt: participation?.createdAt ?? new Date(),
    });
  }

  if (testingType === "OPEN") {
    await setTesterStatus({
      userId: input.userId,
      testerCampaignId: row.id,
      to: "OPT_IN_PENDING",
      note: PLAY_OPEN_TRACK_NOTE,
    });
    await logActivity({
      userId: input.userId,
      campaignId: row.campaignId,
      testerId: row.testerId,
      action: "TESTER_REGISTERED",
      result: `${row.tester.emailNormalized} · open testing · ${row.campaign.app.packageName}`,
    });
    await emailOwner("Ready to test", null, "open");
    return {
      ok: true,
      mode,
      outcome: "OPEN_OPT_IN",
      detail: PLAY_OPEN_TRACK_NOTE,
      optInUrl,
      steps: [],
      playEnrollmentStatus: "OPEN_OPT_IN",
      groupJoinUrl: null,
      joinKind: "open",
    };
  }

  if (access.joinKind === "google_group") {
    if (row.status !== "GROUP_MEMBER") {
      await setTesterStatus({
        userId: input.userId,
        testerCampaignId: row.id,
        to: "GROUP_MEMBER",
        note: GROUP_JOIN_NEXT_STEP,
      });
    }
    await logActivity({
      userId: input.userId,
      campaignId: row.campaignId,
      testerId: row.testerId,
      action: "TESTER_GROUP_JOIN",
      result: `${row.tester.emailNormalized} · google group · ${row.campaign.app.packageName}`,
    });
    await emailOwner("Waiting for Developer", null, "google_group");
    return {
      ok: true,
      mode,
      outcome: "GROUP_SELF_JOIN",
      detail: GROUP_JOIN_NEXT_STEP,
      optInUrl: null,
      steps: [],
      playEnrollmentStatus: "PENDING",
      groupJoinUrl: access.groupJoinUrl,
      joinKind: "google_group",
    };
  }

  const detail = waitNote(testingType);
  await setTesterStatus({
    userId: input.userId,
    testerCampaignId: row.id,
    to: "ADDING",
    note: detail,
  });
  await logActivity({
    userId: input.userId,
    campaignId: row.campaignId,
    testerId: row.testerId,
    action: "TESTER_PENDING_PLAY_CONSOLE",
    result: `${row.tester.emailNormalized} · ${testingType.toLowerCase()} · ${row.campaign.app.packageName}`,
  });
    await emailOwner("Waiting for Developer", null, "individual");
  return {
    ok: true,
    mode,
    outcome: "UNSUPPORTED",
    detail,
    optInUrl: null,
    steps: playConsoleTesterSteps(testingType),
    playEnrollmentStatus: "UNSUPPORTED",
    groupJoinUrl: null,
    joinKind: "individual",
  };
}

export function playMembershipUnverifiable() {
  return {
    verified: false,
    message: PLAY_VERIFY_UNAVAILABLE,
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
    note: "Developer confirmed this address was configured in Play Console. Google Play did not confirm it through the API.",
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
    note: "Waiting for the tester to join through Google Play. Developer confirmation is not Google Play opt-in.",
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
