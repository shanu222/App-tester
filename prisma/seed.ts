import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { DEFAULT_TEMPLATES } from "../src/lib/templates";

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === "production" && process.env.DEMO_MODE === "true") {
    throw new Error("Refusing to seed demo data in production.");
  }

  const email = "demo@testerbridge.dev";
  const passwordHash = await hash("Demo12345!", 12);
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash,
      name: "Demo Developer",
      developerName: "NET360 Labs",
      company: "NET360 Labs",
      onboardingCompleted: true,
      onboardingStep: 10,
      demoMode: true,
      emailVerified: new Date(),
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

  const app = await prisma.app.upsert({
    where: { userId_packageName: { userId: user.id, packageName: "com.example.net360" } },
    update: {},
    create: {
      userId: user.id,
      name: "NET360 Preparation",
      packageName: "com.example.net360",
      testingType: "CLOSED",
      webOptInUrl: "https://play.google.com/apps/testing/com.example.net360",
      playStoreUrl: "https://play.google.com/store/apps/details?id=com.example.net360",
      isDemo: true,
    },
  });

  const group = await prisma.googleGroup.upsert({
    where: { userId_email: { userId: user.id, email: "net360-testers@googlegroups.com" } },
    update: {},
    create: {
      userId: user.id,
      email: "net360-testers@googlegroups.com",
      name: "NET360 testers",
      canManageMembers: false,
      limitationNote: "DEMO MODE group — membership is not applied to Google.",
    },
  });

  const source = await prisma.facebookSource.upsert({
    where: { userId_externalId: { userId: user.id, externalId: "demo-android-testing" } },
    update: {},
    create: {
      userId: user.id,
      type: "MANUAL_GROUP",
      externalId: "demo-android-testing",
      name: "Android App Testing",
      canReadPosts: false,
      canComment: false,
      canMonitorReplies: false,
      limitationNote: "DEMO MODE source",
      isDemo: true,
    },
  });

  await prisma.campaign.upsert({
    where: { telemetryToken: "demo-net360-token" },
    update: {},
    create: {
      userId: user.id,
      appId: app.id,
      sourceId: source.id,
      googleGroupId: group.id,
      name: "NET360 Closed Testing — August 2026",
      status: "ACTIVE",
      testingType: "CLOSED",
      targetTesters: 12,
      requiredTesters: 12,
      webOptInUrl: "https://play.google.com/apps/testing/com.example.net360",
      telemetryToken: "demo-net360-token",
      isDemo: true,
      startedAt: new Date(),
    },
  });

  console.log("Seeded demo@testerbridge.dev / Demo12345!");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
