import type { TestingType } from "@prisma/client";
import { optionalHttpUrl } from "@/lib/manual-app";

export function fieldsForManagedTestingType(type: TestingType | string) {
  return {
    testingUrl: type === "OPEN" || type === "CLOSED" || type === "INTERNAL",
    testingInstructions: true,
    requiredTestersNote: type === "CLOSED" || type === "INTERNAL",
  };
}

export function validateManagedCampaignSetup(input: {
  testingType: TestingType | string;
  testingUrl?: string | null;
  testingInstructions?: string | null;
}) {
  const url = optionalHttpUrl(input.testingUrl);
  if (!url.ok) return { ok: false as const, error: url.error };
  if (input.testingType !== "INTERNAL" && !url.url) {
    return { ok: false as const, error: "Add the Google Play testing link testers will use to join." };
  }
  if (input.testingType === "INTERNAL" && !url.url) {
    return { ok: false as const, error: "Add the internal testing link testers will use." };
  }
  return {
    ok: true as const,
    testingUrl: url.url,
    testingInstructions: input.testingInstructions?.trim() || null,
  };
}

export function testerDisplayLabel(index: number) {
  return `Tester ${index + 1}`;
}
