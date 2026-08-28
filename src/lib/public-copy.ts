import type { TestingType } from "@prisma/client";
import type { PublicJoinResult, PublicTestingPage } from "@/lib/testing-page";
import { testingTypeLabel } from "@/lib/campaign-autofill";

export function publicJoinDetail(type: TestingType, outcome: PublicJoinResult["outcome"]) {
  if (outcome === "FAILED") {
    return "This testing request could not be completed. Try again, or contact the developer.";
  }
  if (type === "OPEN") {
    return "You're ready to test. Open Google Play to join and install the app.";
  }
  if (type === "INTERNAL") {
    return "Your tester request has been registered. Testing access is controlled by Google Play.";
  }
  return "Your tester request has been registered. Additional Google Play action may be required.";
}

export function publicVersionLabel(value: string | null | undefined) {
  if (!value) return null;
  if (/^version code\b/i.test(value.trim())) return null;
  return value;
}

export function sanitizePublicTestingPage(page: PublicTestingPage) {
  return {
    slug: page.slug,
    campaignName: page.campaignName,
    appName: page.appName,
    iconUrl: page.iconUrl,
    testingType: page.testingType,
    testingTypeLabel: testingTypeLabel(page.testingType),
    developerName: page.developerName,
    country: page.country,
    instructions: page.instructions,
    description: page.description,
    versionLabel: publicVersionLabel(page.versionLabel),
    durationDays: page.durationDays,
    targetTesters: page.targetTesters,
    testersReceived: page.testersReceived,
    remaining: page.remaining,
    joinKind: page.joinKind,
    publicAccessLabel: page.publicAccessLabel,
  };
}

export function sanitizePublicJoinResult(result: PublicJoinResult) {
  return {
    outcome: result.outcome,
    statusLabel: result.statusLabel,
    detail: result.detail,
    email: result.email,
    appName: result.appName,
    testingTypeLabel: testingTypeLabelFromTrack(result.trackLabel, result.mode),
    developerName: result.developerName,
    optInUrl: result.optInUrl,
    groupJoinUrl: result.groupJoinUrl ?? null,
    publicAccessLabel: result.publicAccessLabel,
    joinKind: result.joinKind,
  };
}

function testingTypeLabelFromTrack(trackLabel: string, mode: PublicJoinResult["mode"]) {
  if (mode === "OPEN_OPT_IN") return testingTypeLabel("OPEN");
  const value = trackLabel.toLowerCase();
  if (value.includes("open")) return testingTypeLabel("OPEN");
  if (value.includes("internal")) return testingTypeLabel("INTERNAL");
  return testingTypeLabel("CLOSED");
}

export function slotsLabel(remaining: number, target: number, received: number) {
  if (target <= 0) return received ? `${received} testers joined` : "Open for testers";
  if (remaining <= 0) return "No testing slots available";
  if (received <= 0) return `${remaining} testing slots available`;
  return `${received} of ${target} testers joined`;
}
