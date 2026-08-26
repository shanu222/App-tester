import { prisma } from "@/lib/db";
import { AppError, NotFoundError } from "@/lib/errors";
import { generateReply } from "@/lib/templates";
import { logActivity } from "@/lib/audit";
import { assertOutreachAllowed, recordOutreach } from "@/lib/rate-limit";
import { decryptSecret } from "@/lib/encryption";
import { commentOnPagePost } from "@/lib/integrations/facebook";
import { isDemoMode } from "@/lib/env";
import { setTesterStatus, createOrGetTester, isBlocked } from "@/lib/services/testers";

export async function generateOpportunityReply(input: {
  userId: string;
  opportunityId: string;
  tone?: string;
  campaignId?: string;
}) {
  const opportunity = await prisma.opportunity.findFirst({
    where: { id: input.opportunityId, userId: input.userId },
    include: { campaign: true },
  });
  if (!opportunity) throw new NotFoundError("Opportunity not found.");
  if (opportunity.personExternalId && (await isBlocked(input.userId, null, opportunity.personExternalId))) {
    throw new AppError("This person is on your block list.");
  }
  const existingPosted = await prisma.commentDraft.findFirst({
    where: {
      userId: input.userId,
      opportunityId: opportunity.id,
      status: { in: ["POSTED", "MANUAL_COPY"] },
    },
  });
  if (existingPosted) {
    throw new AppError("A comment was already recorded for this post.");
  }
  const body = generateReply(input.tone);
  const draft = await prisma.commentDraft.create({
    data: {
      userId: input.userId,
      opportunityId: opportunity.id,
      campaignId: input.campaignId || opportunity.campaignId,
      body,
      tone: input.tone || "professional",
      status: "PENDING_APPROVAL",
    },
  });
  await logActivity({
    userId: input.userId,
    campaignId: draft.campaignId,
    action: "REPLY_GENERATED",
    result: draft.tone,
  });
  return draft;
}

export async function approveAndPost(input: {
  userId: string;
  draftId: string;
  body?: string;
}) {
  const draft = await prisma.commentDraft.findFirst({
    where: { id: input.draftId, userId: input.userId },
    include: {
      opportunity: { include: { source: true, post: true } },
    },
  });
  if (!draft) throw new NotFoundError("Draft not found.");
  if (draft.status === "POSTED") {
    throw new AppError("This comment was already posted.");
  }
  await assertOutreachAllowed(input.userId, "FACEBOOK_COMMENT");
  const body = input.body?.trim() || draft.body;
  const source = draft.opportunity.source;
  const post = draft.opportunity.post;

  if (source?.type === "PAGE" && source.canComment && source.encryptedPageToken && post) {
    const token = decryptSecret(source.encryptedPageToken);
    const result = await commentOnPagePost({
      postId: post.sourcePostId,
      pageToken: token,
      message: body,
    });
    if (!result.ok) {
      await prisma.commentDraft.update({
        where: { id: draft.id },
        data: { status: "FAILED", failReason: result.error, body },
      });
      throw new AppError(result.error);
    }
    const updated = await prisma.commentDraft.update({
      where: { id: draft.id },
      data: {
        status: "POSTED",
        body,
        postedAt: new Date(),
        externalCommentId: result.data.commentId,
      },
    });
    await recordOutreach(input.userId, "FACEBOOK_COMMENT");
    await afterContact(draft, "COMMENT_POSTED", result.data.commentId);
    return { ...updated, mode: "api" as const };
  }

  if (isDemoMode()) {
    const updated = await prisma.commentDraft.update({
      where: { id: draft.id },
      data: {
        status: "POSTED",
        body,
        postedAt: new Date(),
        externalCommentId: `demo_comment_${draft.id}`,
      },
    });
    await recordOutreach(input.userId, "FACEBOOK_COMMENT");
    await afterContact(draft, "COMMENT_POSTED", updated.externalCommentId || "");
    return { ...updated, mode: "demo" as const };
  }

  const updated = await prisma.commentDraft.update({
    where: { id: draft.id },
    data: { status: "MANUAL_COPY", body, postedAt: new Date() },
  });
  await recordOutreach(input.userId, "FACEBOOK_COMMENT");
  await afterContact(
    draft,
    "COMMENT_APPROVED",
    "Manual copy required — Facebook Groups API is not available.",
  );
  return {
    ...updated,
    mode: "manual" as const,
    instruction:
      "Automatic posting is unavailable for this source. Copy the comment and paste it on the Facebook post, then mark it as posted if needed.",
  };
}

async function afterContact(
  draft: {
    userId: string;
    campaignId: string | null;
    opportunity: {
      id: string;
      personName: string | null;
      personExternalId: string | null;
      groupName: string | null;
    };
  },
  action: string,
  result: string,
) {
  await logActivity({
    userId: draft.userId,
    campaignId: draft.campaignId,
    action,
    result,
  });
  if (!draft.campaignId) return;
  const { testerCampaign } = await createOrGetTester({
    userId: draft.userId,
    campaignId: draft.campaignId,
    name: draft.opportunity.personName || undefined,
    facebookUserId: draft.opportunity.personExternalId || undefined,
    opportunityId: draft.opportunity.id,
    sourceLabel: draft.opportunity.groupName || undefined,
  });
  if (testerCampaign.status === "DISCOVERED") {
    await setTesterStatus({
      userId: draft.userId,
      testerCampaignId: testerCampaign.id,
      to: "CONTACTED",
      note: action,
    });
  }
}
