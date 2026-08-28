import type { TestingType } from "@prisma/client";

export function testingTypeLabel(type: TestingType | string) {
  if (type === "OPEN") return "Open testing";
  if (type === "INTERNAL") return "Internal testing";
  return "Closed testing";
}

export function defaultRequestName(appName: string, type: TestingType | string) {
  const trimmed = appName.trim() || "App";
  if (type === "OPEN") return `${trimmed} — Open Testing`;
  if (type === "INTERNAL") return `${trimmed} — Internal Testing`;
  return `${trimmed} — Closed Testing`;
}

export function defaultRequestDescription(appName: string, releaseNotes?: string | null) {
  const notes = releaseNotes?.trim();
  if (notes) return notes;
  const name = appName.trim() || "This app";
  return `${name} is currently available for testing.
Testers are invited to install the latest Google Play testing release
and provide feedback on functionality, usability and performance.`;
}

export function defaultTestingInstructions(type: TestingType | string) {
  if (type === "OPEN") {
    return `Open the Google Play testing link and join the test.
Install the latest available version and test the application normally.
Report any bugs, crashes or usability issues.`;
  }
  if (type === "INTERNAL") {
    return `Use the Google account associated with your Google Play access.
Open the testing link and install the available internal testing release.
Test the application and report any issues.`;
  }
  return `Use the Google account submitted to TestLoop.
Open the Google Play testing link.
Join the closed test if required.
Install the application and test the latest release.
Report bugs, crashes and usability issues.`;
}

export function testingTypeExplanation(type: TestingType | string) {
  if (type === "OPEN") {
    return {
      title: "Open testing detected",
      body: "This app is configured for Open testing. Testers can join through the Google Play testing link. No individual tester list is required.",
    };
  }
  if (type === "INTERNAL") {
    return {
      title: "Internal testing detected",
      body: "This app is configured for Internal testing. TestLoop will follow the requirements of the existing Google Play internal testing configuration.",
    };
  }
  return {
    title: "Closed testing detected",
    body: "Google Play controls individual tester membership for this track. TestLoop will collect tester Gmail addresses and provide the appropriate next step for Play Console access. No Google Play credentials are required.",
  };
}

export function defaultDurationDays() {
  return 14;
}

export function defaultTargetTesters(existing?: number | null) {
  return existing && existing > 0 ? existing : 12;
}
