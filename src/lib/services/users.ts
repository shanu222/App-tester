import { hash } from "bcryptjs";
import { prisma } from "@/lib/db";
import { DEFAULT_TEMPLATES } from "@/lib/templates";
import { isDemoMode } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { randomToken, sha256 } from "@/lib/crypto";

export async function registerUser(input: {
  email: string;
  password: string;
  name: string;
}) {
  const email = input.email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new AppError("An account with this email already exists.");
  if (input.password.length < 8) {
    throw new AppError("Password must be at least 8 characters.");
  }
  const passwordHash = await hash(input.password, 12);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name: input.name.trim(),
      demoMode: isDemoMode(),
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
  const token = randomToken();
  await prisma.emailVerificationToken.create({
    data: {
      userId: user.id,
      tokenHash: sha256(token),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
    },
  });
  return { user, verificationToken: token };
}

export async function completeProfile(
  userId: string,
  input: { name: string; developerName?: string; company?: string },
) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      name: input.name,
      developerName: input.developerName,
      company: input.company,
      onboardingStep: Math.max(1, 1),
    },
  });
}

export async function markOnboardingStep(userId: string, step: number, completed = false) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      onboardingStep: step,
      onboardingCompleted: completed,
    },
  });
}
