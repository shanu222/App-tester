import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";

const PROFILE_TYPES = ["INDIE", "STARTUP_FOUNDER", "SOFTWARE_DEVELOPER", "ANDROID_DEVELOPER", "TEAM"] as const;

export type DeveloperProfileInput = {
  name: string;
  developerName: string;
  company?: string;
  country: string;
  city?: string;
  developerType: string;
  yearsExperience?: number;
  platforms: string[];
  technologies?: string;
  website?: string;
  github?: string;
  linkedin?: string;
  bio?: string;
  testingGmail?: string;
};

export function sanitizeUser<T extends { passwordHash?: string | null }>(user: T) {
  const rest = { ...user };
  delete rest.passwordHash;
  return rest;
}

export async function completeProfile(userId: string, input: DeveloperProfileInput) {
  if (!input.name.trim()) throw new AppError("Full name is required.");
  if (!input.developerName.trim()) throw new AppError("Developer name / company is required.");
  if (!input.country.trim()) throw new AppError("Country is required.");
  if (!input.developerType.trim()) throw new AppError("Developer type is required.");
  return prisma.user.update({
    where: { id: userId },
    data: {
      name: input.name.trim(),
      developerName: input.developerName.trim(),
      company: input.company?.trim() || input.developerName.trim(),
      country: input.country.trim(),
      city: input.city?.trim() || null,
      developerType: input.developerType.trim(),
      yearsExperience: input.yearsExperience ?? null,
      platforms: input.platforms,
      technologies: input.technologies?.trim() || null,
      website: input.website?.trim() || null,
      github: input.github?.trim() || null,
      linkedin: input.linkedin?.trim() || null,
      bio: input.bio?.trim() || null,
      testingGmail: input.testingGmail?.trim().toLowerCase() || null,
      profileCompleted: true,
      onboardingStep: Math.max(2, 2),
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

export { PROFILE_TYPES };
