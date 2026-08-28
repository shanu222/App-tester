import type { TestingType } from "@prisma/client";
import type { TesterAccessMode } from "@/lib/integrations/play-testers";

export type PublicTestingPage = {
  slug: string;
  campaignId: string;
  campaignName: string;
  appName: string;
  packageName: string | null;
  iconUrl: string | null;
  testingType: TestingType;
  trackLabel: string;
  developerName: string;
  country: string | null;
  instructions: string | null;
  description: string | null;
  versionLabel: string | null;
  pageUrl: string;
  durationDays: number;
  targetTesters: number;
  testersReceived: number;
  remaining: number;
  joinKind: "open" | "google_group" | "individual";
  publicAccessLabel: string;
  groupConfigured: true | false | "unknown";
};

export type PublicJoinResult = {
  outcome: "READY" | "REGISTERED" | "FAILED";
  statusLabel: string;
  detail: string;
  email: string;
  appName: string;
  packageName: string | null;
  trackLabel: string;
  developerName: string;
  optInUrl: string | null;
  groupJoinUrl?: string | null;
  publicAccessLabel?: string;
  joinKind?: "open" | "google_group" | "individual";
  steps: string[];
  mode: TesterAccessMode;
};
