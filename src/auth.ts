import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { DEFAULT_TEMPLATES } from "@/lib/templates";

const DEFAULT_EMAIL = (process.env.DEFAULT_USER_EMAIL || "owner@local").trim().toLowerCase();

export async function requireUser() {
  const user = await prisma.user.upsert({
    where: { email: DEFAULT_EMAIL },
    update: {
      deletedAt: null,
    },
    create: {
      email: DEFAULT_EMAIL,
      name: "Owner",
      developerName: "My Studio",
      emailVerified: new Date(),
      demoMode: env.demoMode,
      settings: { create: {} },
      templates: {
        create: Object.entries(DEFAULT_TEMPLATES).map(([key, value]) => ({
          key,
          name: value.name,
          subject: value.subject,
          body: value.body,
        })),
      },
    },
  });

  const settings = await prisma.userSettings.findUnique({ where: { userId: user.id } });
  if (!settings) {
    await prisma.userSettings.create({ data: { userId: user.id } });
  }

  const templateCount = await prisma.messageTemplate.count({
    where: { userId: user.id, campaignId: null },
  });
  if (templateCount === 0) {
    await prisma.messageTemplate.createMany({
      data: Object.entries(DEFAULT_TEMPLATES).map(([key, value]) => ({
        userId: user.id,
        key,
        name: value.name,
        subject: value.subject,
        body: value.body,
      })),
    });
  }

  return user;
}

export async function requireUserId() {
  const user = await requireUser();
  return user.id;
}
