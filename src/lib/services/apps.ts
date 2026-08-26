import { prisma } from "@/lib/db";
import { isDemoMode } from "@/lib/env";
import { NotFoundError, AppError } from "@/lib/errors";
import { testingLinkForPackage } from "@/lib/integrations/play";
import { logActivity } from "@/lib/audit";

export async function createApp(
  userId: string,
  input: {
    name: string;
    packageName: string;
    testingType?: "INTERNAL" | "CLOSED" | "OPEN";
    testingTrack?: string;
    googlePlayLink?: string;
    googleGroupEmail?: string;
    testerTarget?: number;
  },
) {
  const packageName = input.packageName.trim();
  if (!/^[a-zA-Z][\w]*(\.[a-zA-Z][\w]*)+$/.test(packageName)) {
    throw new AppError("Package name must look like com.example.app.");
  }
  const existing = await prisma.app.findUnique({
    where: { userId_packageName: { userId, packageName } },
  });
  if (existing) throw new AppError("An app with this package name already exists.");
  const optIn = input.googlePlayLink || testingLinkForPackage(packageName);
  const app = await prisma.app.create({
    data: {
      userId,
      name: input.name.trim(),
      packageName,
      testingType: input.testingType || "CLOSED",
      webOptInUrl: optIn || undefined,
      playStoreUrl: `https://play.google.com/store/apps/details?id=${packageName}`,
      isDemo: isDemoMode(),
      tracks: input.testingTrack
        ? {
            create: {
              name: input.testingTrack,
              trackId: input.testingTrack,
              testingType: input.testingType || "CLOSED",
              googleGroupEmail: input.googleGroupEmail,
              testingLink: optIn || undefined,
            },
          }
        : undefined,
    },
    include: { tracks: true },
  });
  if (input.googleGroupEmail) {
    await prisma.googleGroup.upsert({
      where: { userId_email: { userId, email: input.googleGroupEmail.toLowerCase() } },
      update: {},
      create: {
        userId,
        email: input.googleGroupEmail.toLowerCase(),
        name: `${app.name} testers`,
        canManageMembers: false,
        limitationNote:
          "Membership management depends on Google Workspace Admin SDK access. Otherwise add members manually.",
      },
    });
  }
  await logActivity({ userId, action: "APP_CREATED", result: app.packageName });
  return app;
}

export async function getApp(userId: string, id: string) {
  const app = await prisma.app.findFirst({
    where: { id, userId },
    include: { tracks: true, campaigns: true },
  });
  if (!app) throw new NotFoundError("App not found.");
  return app;
}
