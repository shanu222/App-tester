import { prisma } from "@/lib/db";

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

export async function notify(input: {
  userId: string;
  type: string;
  title: string;
  body: string;
  href?: string;
  campaignId?: string;
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
    },
  });
}
