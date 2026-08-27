import type { TestingType } from "@prisma/client";
import type { TesterAccessMode } from "@/lib/integrations/play-testers";

export type PublicTestingPage = {
  slug: string;
  campaignId: string;
  campaignName: string;
  appName: string;
  packageName: string;
  iconUrl: string | null;
  testingType: TestingType;
  trackLabel: string;
  developerName: string;
  instructions: string | null;
  description: string | null;
  pageUrl: string;
};

export type PublicJoinResult = {
  outcome: "READY" | "REGISTERED" | "FAILED";
  statusLabel: string;
  detail: string;
  email: string;
  appName: string;
  packageName: string;
  trackLabel: string;
  developerName: string;
  optInUrl: string | null;
  steps: string[];
  mode: TesterAccessMode;
};
