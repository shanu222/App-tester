import { prisma } from "@/lib/db";

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
