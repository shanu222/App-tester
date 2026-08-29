import { prisma } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";

export async function logActivity(input: {
  userId: string;
  action: string;
  result?: string;
  campaignId?: string | null;
  testerId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  await prisma.activityLog.create({
    data: {
      userId: input.userId,
      action: input.action,
      result: input.result,
      campaignId: input.campaignId ?? undefined,
      testerId: input.testerId ?? undefined,
      metadata: input.metadata as object | undefined,
    },
  });
}

export async function removeOwnActivityLog(userId: string, id: string) {
  const result = await prisma.activityLog.deleteMany({
    where: { id, userId },
  });
  if (result.count === 0) {
    throw new NotFoundError("This audit log entry could not be found.");
  }
  return { removed: true as const, id };
}

export async function removeAllOwnActivityLogs(userId: string) {
  await prisma.activityLog.deleteMany({
    where: { userId },
  });
  return { removed: true as const };
}

export async function notify(input: {
  userId: string;
  type: string;
  title: string;
  body: string;
  href?: string;
  campaignId?: string;
  actions?: { copyEmail?: string; playConsole?: boolean };
}) {
  const settings = await prisma.userSettings.findUnique({
    where: { userId: input.userId },
  });
  const allowed =
    (input.type === "opportunity" && settings?.notifyOpportunities !== false) ||
    (input.type === "reply" && settings?.notifyReplies !== false) ||
    (input.type === "tester" && settings?.notifyTesters !== false) ||
    (input.type === "integration" && settings?.notifyIntegrations !== false) ||
    (input.type === "feedback" && settings?.notifyFeedback !== false) ||
    !["opportunity", "reply", "tester", "integration", "feedback"].includes(input.type);
  if (!allowed) return;
  await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      href: input.href,
      campaignId: input.campaignId,
      actions: input.actions ? { copyEmail: input.actions.copyEmail, playConsole: input.actions.playConsole } : undefined,
    },
  });
}
