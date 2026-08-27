import type { IntegrationStatus } from "@prisma/client";

export type IntegrationHealth = {
  provider: string;
  status: IntegrationStatus;
  lastSyncAt: Date | null;
  lastError: string | null;
  capabilities: string[];
  limitation: string | null;
};

export type AdapterResult<T> = {
  ok: true;
  data: T;
  simulated?: false;
} | {
  ok: false;
  error: string;
  code: string;
  unavailable?: boolean;
  manualFallback?: string;
};

export type FacebookPostRecord = {
  id: string;
  message: string;
  createdTime: string | null;
  permalink: string | null;
  fromName: string | null;
  fromId: string | null;
};

export type PlayAppRecord = {
  packageName: string;
  displayName: string;
};

export type PlayTrackRecord = {
  track: string;
  typeGuess: "INTERNAL" | "CLOSED" | "OPEN" | "PRODUCTION";
  displayName: string;
  /** Real release state read back from Play, never inferred. */
  releaseName: string | null;
  versionCodes: string[];
  releaseStatus: string | null;
  userFraction: number | null;
  releaseNotes: string | null;
  /**
   * Count of Google Groups on the testers resource, or null when the API did
   * not return tester configuration. Individual email lists are never present.
   */
  googleGroupCount: number | null;
};
