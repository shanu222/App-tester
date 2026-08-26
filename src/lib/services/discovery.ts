import { prisma } from "@/lib/db";
import { scorePost, relevanceLabel } from "@/lib/scoring";
import { contentHash } from "@/lib/crypto";
import { isDemoMode } from "@/lib/env";
import { logActivity, notify } from "@/lib/audit";
import { assertDiscoveryQuota } from "@/lib/rate-limit";
import { decryptSecret } from "@/lib/encryption";
import {
  demoFacebookPosts,
  groupDiscoveryUnavailable,
  searchPagePosts,
} from "@/lib/integrations/facebook";
import { FACEBOOK_GROUP_LIMITATION } from "@/lib/integrations/capabilities";
import { AppError, NotFoundError } from "@/lib/errors";

function sinceUnix(range: string) {
  const hours = range === "3d" ? 72 : range === "7d" ? 168 : 24;
  return Math.floor(Date.now() / 1000) - hours * 3600;
}

export async function discoverOpportunities(input: {
  userId: string;
  sourceId: string;
  campaignId?: string;
  range?: string;
  keywords?: string[];
}) {
  await assertDiscoveryQuota(input.userId);
  const source = await prisma.facebookSource.findFirst({
    where: { id: input.sourceId, userId: input.userId },
  });
  if (!source) throw new NotFoundError("Facebook source not found.");

  const settings = await prisma.userSettings.findUnique({ where: { userId: input.userId } });
  const keywords = input.keywords?.length ? input.keywords : settings?.defaultKeywords;

  let posts: Array<{
    id: string;
    message: string;
    createdTime: string | null;
    permalink: string | null;
    fromName: string | null;
    fromId: string | null;
  }> = [];
  let limitation: string | null = null;

  if (isDemoMode() && (source.isDemo || source.type !== "PAGE")) {
    posts = demoFacebookPosts();
  } else if (source.type === "PAGE" && source.encryptedPageToken) {
    const token = decryptSecret(source.encryptedPageToken);
    const result = await searchPagePosts({
      pageId: source.externalId,
      pageToken: token,
      sinceUnix: sinceUnix(input.range || "1d"),
    });
    if (!result.ok) {
      throw new AppError(result.error);
    }
    posts = result.data;
  } else if (source.type === "PAGE") {
    throw new AppError("This Page is connected but has no usable Page access token. Reconnect Facebook.");
  } else {
    const unavailable = groupDiscoveryUnavailable();
    limitation = unavailable.ok ? null : unavailable.error;
  }

  const created = [];
  for (const post of posts) {
    const existing = await prisma.facebookPost.findUnique({
      where: { userId_sourcePostId: { userId: input.userId, sourcePostId: post.id } },
    });
    const hash = contentHash(post.message);
    const duplicate = await prisma.facebookPost.findFirst({
      where: { userId: input.userId, contentHash: hash, NOT: { sourcePostId: post.id } },
    });
    const scored = scorePost({
      message: post.message,
      postedAt: post.createdTime ? new Date(post.createdTime) : null,
      alreadyProcessed: Boolean(existing?.processedAt),
      duplicateContent: Boolean(duplicate),
      customKeywords: keywords,
    });

    const stored =
      existing ??
      (await prisma.facebookPost.create({
        data: {
          userId: input.userId,
          sourceId: source.id,
          sourcePostId: post.id,
          contentHash: hash,
          authorName: post.fromName,
          authorId: post.fromId,
          message: post.message,
          permalink: post.permalink,
          postedAt: post.createdTime ? new Date(post.createdTime) : null,
          isDemo: isDemoMode(),
        },
      }));

    await prisma.facebookPost.update({
      where: { id: stored.id },
      data: { lastSeenAt: new Date(), processedAt: new Date() },
    });

    await logActivity({
      userId: input.userId,
      campaignId: input.campaignId,
      action: existing ? "POST_SCORED" : "POST_DISCOVERED",
      result: `${scored.score}% ${relevanceLabel(scored.score)}`,
      metadata: { postId: post.id, keywords: scored.matchedKeywords },
    });

    if (existing?.processedAt) continue;
    if (scored.score < 40) continue;

    const previousContact = await prisma.commentDraft.findFirst({
      where: {
        userId: input.userId,
        opportunity: { postId: stored.id },
        status: { in: ["POSTED", "MANUAL_COPY"] },
      },
    });

    const opportunity = await prisma.opportunity.create({
      data: {
        userId: input.userId,
        campaignId: input.campaignId,
        sourceId: source.id,
        postId: stored.id,
        personName: post.fromName,
        personExternalId: post.fromId,
        postContent: post.message,
        groupName: source.name,
        postTimestamp: post.createdTime ? new Date(post.createdTime) : null,
        postLink: post.permalink,
        relevanceScore: scored.score,
        matchedKeywords: scored.matchedKeywords,
        testingIntent: scored.intent,
        reciprocalLanguage: scored.reciprocal,
        whyMatched: {
          why: scored.whyMatched,
          bonuses: scored.bonuses,
          penalties: scored.penalties,
          recencyHours: scored.recencyHours,
        },
        previousContact: Boolean(previousContact),
        isDemo: isDemoMode(),
      },
    });
    created.push(opportunity);
    await notify({
      userId: input.userId,
      type: "opportunity",
      title: "New tester opportunity",
      body: `${relevanceLabel(scored.score)} · ${post.fromName || "Unknown"} · ${scored.score}%`,
      href: `/opportunities`,
      campaignId: input.campaignId,
    });
  }

  await prisma.facebookSource.update({
    where: { id: source.id },
    data: { lastSyncAt: new Date() },
  });

  return {
    scanned: posts.length,
    created: created.length,
    limitation: limitation || (source.type !== "PAGE" ? FACEBOOK_GROUP_LIMITATION : null),
    opportunities: created,
  };
}

export async function importManualPost(input: {
  userId: string;
  sourceId: string;
  campaignId?: string;
  message: string;
  personName?: string;
  postLink?: string;
  postedAt?: string;
}) {
  const source = await prisma.facebookSource.findFirst({
    where: { id: input.sourceId, userId: input.userId },
  });
  if (!source) throw new NotFoundError("Source not found.");
  const syntheticId = `manual:${contentHash(input.message + (input.postLink || ""))}`;
  return discoverFromRecords(input.userId, source.id, input.campaignId, [
    {
      id: syntheticId,
      message: input.message,
      createdTime: input.postedAt || new Date().toISOString(),
      permalink: input.postLink || null,
      fromName: input.personName || null,
      fromId: null,
    },
  ]);
}

async function discoverFromRecords(
  userId: string,
  sourceId: string,
  campaignId: string | undefined,
  posts: Array<{
    id: string;
    message: string;
    createdTime: string | null;
    permalink: string | null;
    fromName: string | null;
    fromId: string | null;
  }>,
) {
  const source = await prisma.facebookSource.findFirst({ where: { id: sourceId, userId } });
  if (!source) throw new NotFoundError("Source not found.");
  const fake = { ...source };
  await prisma.facebookSource.update({
    where: { id: sourceId },
    data: { lastSyncAt: fake.lastSyncAt },
  });
  const created = [];
  for (const post of posts) {
    const hash = contentHash(post.message);
    const existing = await prisma.facebookPost.findUnique({
      where: { userId_sourcePostId: { userId, sourcePostId: post.id } },
    });
    if (existing?.processedAt) continue;
    const scored = scorePost({
      message: post.message,
      postedAt: post.createdTime ? new Date(post.createdTime) : new Date(),
    });
    const stored =
      existing ??
      (await prisma.facebookPost.create({
        data: {
          userId,
          sourceId,
          sourcePostId: post.id,
          contentHash: hash,
          authorName: post.fromName,
          authorId: post.fromId,
          message: post.message,
          permalink: post.permalink,
          postedAt: post.createdTime ? new Date(post.createdTime) : new Date(),
        },
      }));
    await prisma.facebookPost.update({
      where: { id: stored.id },
      data: { processedAt: new Date(), lastSeenAt: new Date() },
    });
    if (scored.score < 20) continue;
    const opportunity = await prisma.opportunity.create({
      data: {
        userId,
        campaignId,
        sourceId,
        postId: stored.id,
        personName: post.fromName,
        personExternalId: post.fromId,
        postContent: post.message,
        groupName: source.name,
        postTimestamp: post.createdTime ? new Date(post.createdTime) : new Date(),
        postLink: post.permalink,
        relevanceScore: scored.score,
        matchedKeywords: scored.matchedKeywords,
        testingIntent: scored.intent,
        reciprocalLanguage: scored.reciprocal,
        whyMatched: { why: scored.whyMatched, bonuses: scored.bonuses, penalties: scored.penalties },
      },
    });
    created.push(opportunity);
  }
  return { created: created.length, opportunities: created, limitation: null as string | null };
}
