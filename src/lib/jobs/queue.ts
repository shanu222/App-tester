import { prisma } from "@/lib/db";
import { JobStatus } from "@prisma/client";
import { discoverOpportunities } from "@/lib/services/discovery";
import { listPostComments } from "@/lib/integrations/facebook";
import { decryptSecret } from "@/lib/encryption";
import { extractEmails } from "@/lib/email-extract";
import { createOrGetTester, setTesterStatus } from "@/lib/services/testers";
import { logActivity, notify } from "@/lib/audit";
import { markIntegrationExpired } from "@/lib/integrations/store";
import { verifyPlayConnection, refreshFromGooglePlay } from "@/lib/services/play-connection";
import { serializeErrorForLog, redactSecrets } from "@/lib/integrations/google-api-error";

const TIMEOUT = 25_000;

export async function enqueueJob(input: {
  userId?: string;
  type: string;
  payload: object;
  runAt?: Date;
  idempotencyKey?: string;
  timeoutMs?: number;
}) {
  if (input.idempotencyKey) {
    const existing = await prisma.job.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
    });
    if (existing && ["PENDING", "RUNNING", "SUCCEEDED"].includes(existing.status)) {
      return existing;
    }
  }
  return prisma.job.create({
    data: {
      userId: input.userId,
      type: input.type,
      payload: input.payload as object,
      runAt: input.runAt,
      idempotencyKey: input.idempotencyKey,
      timeoutMs: input.timeoutMs ?? TIMEOUT,
    },
  });
}

export async function processDueJobs(limit = 8) {
  const due = await prisma.job.findMany({
    where: { status: "PENDING", runAt: { lte: new Date() } },
    orderBy: { runAt: "asc" },
    take: limit,
  });
  const results = [];
  for (const job of due) {
    results.push(await runJob(job.id));
  }
  return results;
}

export async function runJob(jobId: string) {
  const claimed = await prisma.job.updateMany({
    where: { id: jobId, status: "PENDING" },
    data: { status: "RUNNING", attempts: { increment: 1 } },
  });
  if (!claimed.count) {
    return { jobId, skipped: true };
  }
  const job = await prisma.job.findUniqueOrThrow({ where: { id: jobId } });
  const run = await prisma.jobRun.create({
    data: { jobId, status: "RUNNING" },
  });
  try {
    const log = await Promise.race([
      handleJob(job.type, job.payload as Record<string, unknown>, job.userId),
      new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error("Job timed out.")), job.timeoutMs),
      ),
    ]);
    await prisma.job.update({
      where: { id: jobId },
      data: { status: "SUCCEEDED", lastError: null },
    });
    await prisma.jobRun.update({
      where: { id: run.id },
      data: { status: "SUCCEEDED", finishedAt: new Date(), log },
    });
    return { jobId, ok: true, log };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Job failed";
    const retry = job.attempts < job.maxAttempts;
    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: retry ? "PENDING" : "FAILED",
        lastError: message,
        runAt: retry ? new Date(Date.now() + 2 ** job.attempts * 15_000) : undefined,
      },
    });
    await prisma.jobRun.update({
      where: { id: run.id },
      data: { status: "FAILED", finishedAt: new Date(), log: message },
    });
    return { jobId, ok: false, error: message };
  }
}

async function handleJob(
  type: string,
  payload: Record<string, unknown>,
  userId: string | null,
): Promise<string> {
  switch (type) {
    case "discovery":
      if (!userId || !payload.sourceId) return "missing source";
      {
        const result = await discoverOpportunities({
          userId,
          sourceId: String(payload.sourceId),
          campaignId: payload.campaignId ? String(payload.campaignId) : undefined,
          range: payload.range ? String(payload.range) : "1d",
        });
        return `scanned=${result.scanned} created=${result.created}`;
      }
    case "reply_sync":
      if (!userId) return "missing user";
      return syncReplies(userId);
    case "integration_health":
      if (!userId) return "missing user";
      return checkIntegrationHealth(userId);
    case "play_sync":
      if (!userId) return "missing user";
      {
        const result = await refreshFromGooglePlay(userId);
        return `apps=${result.apps.length}`;
      }
    case "facebook_sync":
      if (!userId || !payload.sourceId) return "missing source";
      {
        const result = await discoverOpportunities({
          userId,
          sourceId: String(payload.sourceId),
        });
        return `facebook_sync created=${result.created}`;
      }
    default:
      return `unknown job type ${type}`;
  }
}

async function syncReplies(userId: string) {
  const drafts = await prisma.commentDraft.findMany({
    where: { userId, status: "POSTED", externalCommentId: { not: null } },
    include: { opportunity: { include: { source: true, post: true } } },
    take: 20,
  });
  let found = 0;
  for (const draft of drafts) {
    const source = draft.opportunity.source;
    if (source?.type !== "PAGE" || !source.encryptedPageToken || !draft.opportunity.post) {
      continue;
    }
    const token = decryptSecret(source.encryptedPageToken);
    const comments = await listPostComments({
      postId: draft.opportunity.post.sourcePostId,
      pageToken: token,
    });
    if (!comments.ok) continue;
    for (const comment of comments.data) {
      if (comment.id === draft.externalCommentId) continue;
      const emails = extractEmails(comment.message);
      if (!emails.length || !draft.campaignId) continue;
      const { testerCampaign } = await createOrGetTester({
        userId,
        campaignId: draft.campaignId,
        email: emails[0].normalized,
        name: comment.fromName,
        opportunityId: draft.opportunityId,
        sourceLabel: draft.opportunity.groupName || undefined,
      });
      await prisma.message.create({
        data: {
          userId,
          campaignId: draft.campaignId,
          testerId: testerCampaign.testerId,
          direction: "inbound",
          channel: "FACEBOOK_COMMENT",
          body: comment.message,
          extractedEmail: emails[0].normalized,
        },
      });
      if (testerCampaign.status === "CONTACTED" || testerCampaign.status === "DISCOVERED") {
        await setTesterStatus({
          userId,
          testerCampaignId: testerCampaign.id,
          to: "REPLIED",
          note: "Reply detected on Page comments",
        });
        await setTesterStatus({
          userId,
          testerCampaignId: testerCampaign.id,
          to: "EMAIL_RECEIVED",
          note: emails[0].normalized,
        });
      }
      await notify({
        userId,
        type: "reply",
        title: "Tester replied with Gmail",
        body: `${emails[0].normalized} · Potential Google Play account email`,
        href: `/testers/${testerCampaign.testerId}`,
        campaignId: draft.campaignId,
      });
      await logActivity({
        userId,
        campaignId: draft.campaignId,
        testerId: testerCampaign.testerId,
        action: "EMAIL_EXTRACTED",
        result: emails[0].normalized,
      });
      found += 1;
    }
  }
  return `replies_processed=${found}`;
}

async function checkIntegrationHealth(userId: string) {
  let notes = "";

  const playConnection = await prisma.googlePlayConnection.findUnique({ where: { userId } });
  if (playConnection && playConnection.status !== "NOT_CONNECTED") {
    try {
      const result = await verifyPlayConnection({ userId });
      if (result.connected) {
        notes += "play=ok;";
        await enqueueJob({
          userId,
          type: "play_sync",
          payload: {},
          idempotencyKey: `play_sync:${userId}:${new Date().toISOString().slice(0, 13)}`,
        });
      } else {
        notes += "play=error;";
        await notify({
          userId,
          type: "integration",
          title: "Google Play authorization error",
          body: redactSecrets(result.errorMessage || "Google Play authorization failed."),
          href: "/play",
        });
      }
    } catch (error) {
      // verifyPlayConnection already recorded the failure on the connection.
      notes += "play=error;";
      console.error("Play health check failed", serializeErrorForLog(error));
    }
  }

  const integrations = await prisma.integration.findMany({ where: { userId } });
  for (const integration of integrations) {
    if (integration.status === "NOT_CONNECTED") continue;
    if (integration.provider === "FACEBOOK" && integration.lastError?.includes("expired")) {
      await markIntegrationExpired(userId, "FACEBOOK");
      notes += `facebook=expired;`;
    }
  }
  return notes || "ok";
}

export async function scheduleRecurringJobs(userId: string) {
  const sources = await prisma.facebookSource.findMany({
    where: { userId, type: "PAGE" },
  });
  const campaigns = await prisma.campaign.findMany({
    where: { userId, status: "ACTIVE" },
  });
  for (const campaign of campaigns) {
    if (!campaign.sourceId) continue;
    await enqueueJob({
      userId,
      type: "discovery",
      payload: { sourceId: campaign.sourceId, campaignId: campaign.id, range: "1d" },
      idempotencyKey: `discovery:${campaign.id}:${new Date().toISOString().slice(0, 13)}`,
    });
  }
  for (const source of sources) {
    await enqueueJob({
      userId,
      type: "facebook_sync",
      payload: { sourceId: source.id },
      idempotencyKey: `facebook_sync:${source.id}:${new Date().toISOString().slice(0, 13)}`,
    });
  }
  await enqueueJob({
    userId,
    type: "reply_sync",
    payload: {},
    idempotencyKey: `reply_sync:${userId}:${new Date().toISOString().slice(0, 13)}`,
  });
  await enqueueJob({
    userId,
    type: "integration_health",
    payload: {},
    idempotencyKey: `health:${userId}:${new Date().toISOString().slice(0, 10)}`,
  });
  await enqueueJob({
    userId,
    type: "play_sync",
    payload: {},
    idempotencyKey: `play_sync:${userId}:${new Date().toISOString().slice(0, 13)}`,
  });
}

export type { JobStatus };
