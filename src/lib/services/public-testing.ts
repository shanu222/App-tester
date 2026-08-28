import type { TesterStatus, TestingType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AppError, NotFoundError, RateLimitError } from "@/lib/errors";
import { describeEmail } from "@/lib/email-extract";
import { env } from "@/lib/env";
import {
  PLAY_CLOSED_TESTING_TESTER_NOTE,
  PLAY_INTERNAL_TESTING_TESTER_NOTE,
  PLAY_OPEN_TESTER_READY,
  PLAY_TESTER_API_LIMITATION,
  campaignTestingUrl,
  testerAccessMode,
} from "@/lib/integrations/play-testers";
import { grantTesterAccess } from "@/lib/services/invitations";
import { createOrGetTester, isBlocked, setTesterStatus } from "@/lib/services/testers";
import type { PublicJoinResult, PublicTestingPage } from "@/lib/testing-page";
import { parseTracksSnapshot } from "@/lib/integrations/play-config";
import { campaignDependsOnPlayConnection, isPlayConnectionActive } from "@/lib/play-disconnect";

export type { PublicJoinResult, PublicTestingPage };

const JOINS_PER_CAMPAIGN_PER_HOUR = 40;

const READY_STATUSES: TesterStatus[] = [
  "ADDED",
  "INVITATION_SENT",
  "OPT_IN_PENDING",
  "OPTED_IN",
  "INSTALL_STATUS_UNKNOWN",
  "TESTING",
  "FEEDBACK_REQUESTED",
  "FEEDBACK_RECEIVED",
  "COMPLETED",
];

export function testloopTestingPageUrl(slug: string) {
  return `${env.appUrl.replace(/\/$/, "")}/test/${slug}`;
}

function trackLabel(input: {
  playTrack: string | null;
  testingType: TestingType;
  trackName?: string | null;
}) {
  if (input.trackName) return input.trackName;
  if (input.playTrack) return input.playTrack;
  if (input.testingType === "INTERNAL") return "Internal testing";
  if (input.testingType === "OPEN") return "Open testing";
  return "Closed testing";
}

function publicJoinState(
  status: TesterStatus,
  accessAdded: boolean,
): Pick<PublicJoinResult, "outcome" | "statusLabel"> {
  if (status === "ERROR") {
    return { outcome: "FAILED", statusLabel: "Unable to register tester" };
  }
  if (status === "ADDING") {
    return { outcome: "REGISTERED", statusLabel: "Waiting for developer" };
  }
  if (accessAdded || READY_STATUSES.includes(status)) {
    return { outcome: "READY", statusLabel: "You're ready to test" };
  }
  return { outcome: "REGISTERED", statusLabel: "Waiting for developer" };
}

export async function getPublicTestingPage(slug: string): Promise<PublicTestingPage> {
  const campaign = await prisma.campaign.findUnique({
    where: { publicSlug: slug },
    include: {
      app: { select: { name: true, packageName: true, iconUrl: true, syncedFromPlay: true } },
      user: { select: { developerName: true, name: true, company: true } },
      track: { select: { name: true } },
    },
  });
  if (
    !campaign ||
    !campaign.published ||
    campaign.status === "ARCHIVED" ||
    campaign.status === "COMPLETED" ||
    campaign.status === "PAUSED"
  ) {
    throw new NotFoundError("This testing page is not available.");
  }
  if (campaignDependsOnPlayConnection(campaign)) {
    const play = await prisma.googlePlayConnection.findUnique({
      where: { userId: campaign.userId },
      select: { status: true },
    });
    if (!isPlayConnectionActive(play?.status)) {
      throw new NotFoundError("This testing page is not available.");
    }
  }

  const playApp = await prisma.googlePlayApp.findFirst({
    where: { userId: campaign.userId, packageName: campaign.app.packageName },
    select: { tracksSnapshot: true },
  });
  const playTracks = parseTracksSnapshot(playApp?.tracksSnapshot);
  const playTrack =
    playTracks.find((track) => track.track === campaign.playTrack) ||
    playTracks.find((track) => track.typeGuess === campaign.testingType) ||
    null;
  const versionLabel =
    playTrack?.releaseName ||
    (playTrack?.versionCodes[0] ? `Version code ${playTrack.versionCodes[0]}` : null);

  return {
    slug: campaign.publicSlug!,
    campaignId: campaign.id,
    campaignName: campaign.name,
    appName: campaign.app.name,
    packageName: campaign.app.packageName,
    iconUrl: campaign.app.iconUrl,
    testingType: campaign.testingType,
    trackLabel: trackLabel({
      playTrack: campaign.playTrack,
      testingType: campaign.testingType,
      trackName: campaign.track?.name,
    }),
    developerName:
      campaign.user.developerName || campaign.user.company || campaign.user.name || "Developer",
    instructions: campaign.testingInstructions,
    description: campaign.description,
    versionLabel,
    pageUrl: testloopTestingPageUrl(campaign.publicSlug!),
  };
}

/**
 * Register a tester on a public TestLoop testing page.
 *
 * Open tracks complete immediately and return Google's opt-in URL. Internal and
 * closed tracks collect the address and wait for the developer to paste it into
 * Play Console — the Play Developer API cannot add individual emails.
 *
 * Repeating the same Gmail on the same campaign is idempotent: the existing
 * status is returned instead of creating a second record.
 */
export async function joinPublicTest(input: {
  slug: string;
  email: string;
}): Promise<PublicJoinResult> {
  const page = await getPublicTestingPage(input.slug);
  const described = describeEmail(input.email);
  if (!described.valid) {
    throw new AppError(
      "Enter a valid email address — use the Gmail account you use with Google Play.",
    );
  }

  const campaign = await prisma.campaign.findUnique({
    where: { id: page.campaignId },
    include: { app: true },
  });
  if (!campaign) throw new NotFoundError("This testing page is not available.");

  if (await isBlocked(campaign.userId, described.normalized)) {
    throw new AppError("This email cannot join this test.");
  }

  const alreadyLinked = await prisma.testerCampaign.findFirst({
    where: {
      campaignId: campaign.id,
      tester: { userId: campaign.userId, emailNormalized: described.normalized },
    },
  });
  if (!alreadyLinked) {
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentJoins = await prisma.testerCampaign.count({
      where: { campaignId: campaign.id, createdAt: { gte: hourAgo } },
    });
    if (recentJoins >= JOINS_PER_CAMPAIGN_PER_HOUR) {
      throw new RateLimitError("Too many join requests for this test. Try again later.");
    }
  }

  const { testerCampaign } = await createOrGetTester({
    userId: campaign.userId,
    campaignId: campaign.id,
    email: described.normalized,
    sourceLabel: "Public testing page",
  });

  if (
    testerCampaign.status === "DISCOVERED" ||
    testerCampaign.status === "CONTACTED" ||
    testerCampaign.status === "REPLIED" ||
    testerCampaign.status === "EMAIL_RECEIVED"
  ) {
    await setTesterStatus({
      userId: campaign.userId,
      testerCampaignId: testerCampaign.id,
      to: "EMAIL_CONFIRMED",
      note: "Tester submitted their Google Play Gmail on the public testing page.",
    });
  }

  const current = await prisma.testerCampaign.findUniqueOrThrow({
    where: { id: testerCampaign.id },
  });

  const testing = campaignTestingUrl({
    testingType: campaign.testingType,
    packageName: campaign.app.packageName,
    configuredUrl: campaign.testingUrl || campaign.webOptInUrl,
  });
  const mode = testerAccessMode(campaign.testingType);

  const needsGrant =
    current.status === "ERROR" ||
    (!current.accessAdded && !READY_STATUSES.includes(current.status) && current.status !== "ADDING");

  const granted = needsGrant
    ? await grantTesterAccess({
        userId: campaign.userId,
        testerCampaignId: testerCampaign.id,
      })
    : null;

  const after = await prisma.testerCampaign.findUniqueOrThrow({
    where: { id: testerCampaign.id },
  });
  const state = publicJoinState(after.status, after.accessAdded);
  const testerDetail =
    campaign.testingType === "OPEN"
      ? PLAY_OPEN_TESTER_READY
      : campaign.testingType === "INTERNAL"
        ? PLAY_INTERNAL_TESTING_TESTER_NOTE
        : PLAY_CLOSED_TESTING_TESTER_NOTE;

  return {
    ...state,
    statusLabel: state.statusLabel,
    detail: state.outcome === "FAILED" ? granted?.detail || PLAY_TESTER_API_LIMITATION : testerDetail,
    email: described.normalized,
    appName: page.appName,
    packageName: page.packageName,
    trackLabel: page.trackLabel,
    developerName: page.developerName,
    optInUrl: campaign.testingType === "OPEN" ? granted?.optInUrl ?? testing.url : null,
    steps: [],
    mode: granted?.mode ?? mode,
  };
}
