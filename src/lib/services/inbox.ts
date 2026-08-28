import { prisma } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";
import { toPublicInboxItem } from "@/lib/inbox";

const INBOX_TAKE = 100;

export async function unreadInboxCountForUser(userId: string) {
  return prisma.notification.count({
    where: { userId, readAt: null },
  });
}

export async function listInbox(userId: string) {
  const [rows, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: INBOX_TAKE,
      select: {
        id: true,
        title: true,
        body: true,
        href: true,
        actions: true,
        readAt: true,
        createdAt: true,
      },
    }),
    unreadInboxCountForUser(userId),
  ]);
  return {
    notifications: rows.map(toPublicInboxItem),
    unreadCount,
  };
}

export async function markAllInboxRead(userId: string) {
  await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
  return { unreadCount: 0 };
}

export async function setInboxItemRead(userId: string, id: string, read: boolean) {
  const result = await prisma.notification.updateMany({
    where: { id, userId },
    data: { readAt: read ? new Date() : null },
  });
  if (result.count === 0) throw new NotFoundError("Notification not found.");
  return { unreadCount: await unreadInboxCountForUser(userId) };
}

export async function deleteInboxItem(userId: string, id: string) {
  const result = await prisma.notification.deleteMany({
    where: { id, userId },
  });
  if (result.count === 0) throw new NotFoundError("Notification not found.");
  return { unreadCount: await unreadInboxCountForUser(userId) };
}

/** Deletes in-app Notification rows for this user only. Never touches ActivityLog. */
export async function deleteAllInboxItems(userId: string) {
  await prisma.notification.deleteMany({ where: { userId } });
  return { unreadCount: 0 };
}
