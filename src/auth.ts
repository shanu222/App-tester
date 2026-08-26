import { headers } from "next/headers";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { DEFAULT_TEMPLATES } from "@/lib/templates";
import { ensureCatalogApps } from "@/lib/services/apps";

const DEFAULT_EMAIL = (process.env.DEFAULT_USER_EMAIL || "owner@local").trim().toLowerCase();

const templateRows = () =>
  Object.entries(DEFAULT_TEMPLATES).map(([key, value]) => ({
    key,
    name: value.name,
    subject: value.subject,
    body: value.body,
  }));

async function ensureSettingsAndTemplates(userId: string) {
  try {
    await prisma.userSettings.create({ data: { userId } });
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) {
      throw error;
    }
  }

  const templateCount = await prisma.messageTemplate.count({
    where: { userId, campaignId: null },
  });
  if (templateCount === 0) {
    try {
      await prisma.messageTemplate.createMany({
        data: templateRows().map((row) => ({ userId, ...row })),
      });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) {
        throw error;
      }
    }
  }
}

async function loadOrCreateDefaultUser() {
  const existing = await prisma.user.findUnique({ where: { email: DEFAULT_EMAIL } });
  if (existing) {
    const user = existing.deletedAt
      ? await prisma.user.update({
          where: { id: existing.id },
          data: { deletedAt: null },
        })
      : existing;
    await ensureSettingsAndTemplates(user.id);
    await ensureCatalogApps(user.id);
    return user;
  }

  try {
    const created = await prisma.user.create({
      data: {
        email: DEFAULT_EMAIL,
        name: "Owner",
        developerName: "My Studio",
        emailVerified: new Date(),
        demoMode: env.demoMode,
        settings: { create: {} },
        templates: { create: templateRows() },
      },
    });
    await ensureCatalogApps(created.id);
    return created;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const user = await prisma.user.findUnique({ where: { email: DEFAULT_EMAIL } });
      if (user) {
        await ensureSettingsAndTemplates(user.id);
        await ensureCatalogApps(user.id);
        return user;
      }
    }
    throw error;
  }
}

let inflight: Promise<Awaited<ReturnType<typeof loadOrCreateDefaultUser>>> | null = null;

export async function requireUser() {
  await headers();
  if (!inflight) {
    inflight = loadOrCreateDefaultUser().finally(() => {
      inflight = null;
    });
  }
  return inflight;
}

export async function requireUserId() {
  const user = await requireUser();
  return user.id;
}
