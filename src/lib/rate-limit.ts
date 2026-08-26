import { OutreachChannel } from "@prisma/client";
import { prisma } from "@/lib/db";
import { dayKey, hourKey } from "@/lib/crypto";
import { RateLimitError } from "@/lib/errors";

export async function assertOutreachAllowed(
  userId: string,
  channel: OutreachChannel,
) {
  const settings = await prisma.userSettings.findUnique({ where: { userId } });
  const hour = hourKey();
  const day = dayKey();
  const [hourCount, dayCount] = await Promise.all([
    prisma.outreachUsage.count({ where: { userId, channel, hourKey: hour } }),
    prisma.outreachUsage.count({ where: { userId, channel, dayKey: day } }),
  ]);

  if (channel === "FACEBOOK_COMMENT") {
    if (hourCount >= (settings?.commentsPerHour ?? 3)) {
      throw new RateLimitError("Hourly comment limit reached.");
    }
    if (dayCount >= (settings?.commentsPerDay ?? 8)) {
      throw new RateLimitError("Daily outreach limit reached.");
    }
  }
  if (channel === "EMAIL" && dayCount >= (settings?.messagesPerDay ?? 15)) {
    throw new RateLimitError("Daily message limit reached.");
  }
}

export async function recordOutreach(userId: string, channel: OutreachChannel) {
  await prisma.outreachUsage.create({
    data: {
      userId,
      channel,
      hourKey: hourKey(),
      dayKey: dayKey(),
    },
  });
}

export async function assertDiscoveryQuota(userId: string) {
  const settings = await prisma.userSettings.findUnique({ where: { userId } });
  const day = dayKey();
  const processed = await prisma.facebookPost.count({
    where: {
      userId,
      processedAt: { gte: new Date(`${day}T00:00:00.000Z`) },
    },
  });
  if (processed >= (settings?.processedPostsPerDay ?? 40)) {
    throw new RateLimitError("Daily processed-post limit reached.");
  }
  return settings?.processedPostsPerDay ?? 40;
}
