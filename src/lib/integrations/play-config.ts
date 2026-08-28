import type { PlayTrackRecord } from "@/lib/integrations/types";

export type PlayTrackKind = "INTERNAL" | "CLOSED" | "OPEN" | "PRODUCTION";

export const PLAY_API_UNAVAILABLE = "Not available through Google Play API";

/**
 * Google's standard Android Publisher track ids, plus every other name treated
 * as a closed-testing track. Closed testing is never assumed to be literally
 * named "closed".
 */
export function classifyPlayTrack(trackName: string): PlayTrackKind {
  const name = trackName.trim().toLowerCase();
  if (name === "production") return "PRODUCTION";
  if (name === "beta") return "OPEN";
  if (name === "qa" || name === "internal") return "INTERNAL";
  return "CLOSED";
}

export function playTrackDisplayName(trackName: string, kind: PlayTrackKind = classifyPlayTrack(trackName)) {
  if (kind === "OPEN") return "Open testing";
  if (kind === "INTERNAL") return "Internal testing";
  if (kind === "PRODUCTION") return "Production";
  if (trackName.trim().toLowerCase() === "alpha") return "Closed testing (alpha)";
  return humanizeTrackName(trackName);
}

function humanizeTrackName(trackName: string) {
  const trimmed = trackName.trim();
  if (!trimmed) return "Closed testing";
  return trimmed
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function isReleaseActive(status: string | null | undefined) {
  const value = (status || "").toLowerCase();
  return value === "completed" || value === "inprogress";
}

/** A track is configured only when Play returned release or version evidence. */
export function trackHasDetectedConfiguration(track: {
  releaseStatus?: string | null;
  releaseName?: string | null;
  versionCodes?: string[];
}) {
  return Boolean(
    track.releaseStatus ||
      track.releaseName ||
      (track.versionCodes && track.versionCodes.length > 0),
  );
}

export type PlayUiStatusKind =
  | "active"
  | "draft"
  | "inProgress"
  | "halted"
  | "configured"
  | "notConfigured"
  | "unknown"
  | "error";

export type PlayUiStatus = {
  kind: PlayUiStatusKind;
  label: string;
  symbol: string;
};

/**
 * Map a Play release/track into a status the developer can actually read.
 * "Connected" is never used here — that word is reserved for the Play account.
 */
export function playTrackUiStatus(input: {
  exists: boolean;
  releaseStatus: string | null | undefined;
  error?: boolean;
  unsynced?: boolean;
  detected?: boolean;
}): PlayUiStatus {
  if (input.error) return { kind: "error", label: "Error", symbol: "✕" };
  if (input.unsynced) {
    return { kind: "unknown", label: "Not yet synchronized", symbol: "?" };
  }
  if (!input.exists) return { kind: "notConfigured", label: "Not configured", symbol: "○" };
  const status = (input.releaseStatus || "").toLowerCase();
  if (status === "completed") return { kind: "active", label: "Active", symbol: "✓" };
  if (status === "inprogress") return { kind: "inProgress", label: "In progress", symbol: "◐" };
  if (status === "draft") return { kind: "draft", label: "Draft", symbol: "●" };
  if (status === "halted") return { kind: "halted", label: "Action required", symbol: "⚠" };
  if (input.detected || input.releaseStatus) {
    return { kind: "configured", label: "Configured", symbol: "✓" };
  }
  return {
    kind: "unknown",
    label: "Not available through Google Play API",
    symbol: "?",
  };
}

export type TestingModeState = {
  exists: boolean;
  active: boolean;
  tracks: PlayTrackRecord[];
};

export type TestingConfiguration = {
  internalTesting: TestingModeState;
  openTesting: TestingModeState;
  closedTesting: TestingModeState;
  production: TestingModeState;
  testingTrackCount: number;
};

function modeFrom(tracks: PlayTrackRecord[]): TestingModeState {
  return {
    exists: tracks.length > 0,
    active: tracks.some((track) => isReleaseActive(track.releaseStatus)),
    tracks,
  };
}

/**
 * Inspect real Play tracks. Never hard-codes "this app uses closed testing".
 */
export function detectTestingConfiguration(tracks: PlayTrackRecord[]): TestingConfiguration {
  const internal: PlayTrackRecord[] = [];
  const open: PlayTrackRecord[] = [];
  const closed: PlayTrackRecord[] = [];
  const production: PlayTrackRecord[] = [];

  for (const track of tracks) {
    const kind = track.typeGuess || classifyPlayTrack(track.track);
    if (kind === "INTERNAL") internal.push(track);
    else if (kind === "OPEN") open.push(track);
    else if (kind === "PRODUCTION") production.push(track);
    else closed.push(track);
  }

  const internalTesting = modeFrom(internal);
  const openTesting = modeFrom(open);
  const closedTesting = modeFrom(closed);
  return {
    internalTesting,
    openTesting,
    closedTesting,
    production: modeFrom(production),
    testingTrackCount: internal.length + open.length + closed.length,
  };
}

export type RecommendationAlternative = {
  kind: Exclude<PlayTrackKind, "PRODUCTION">;
  title: string;
  reason: string;
  track?: string;
};

export type TestingRecommendation = {
  primary: PlayTrackKind | "NONE" | "CHOOSE";
  title: string;
  reason: string;
  cta: string;
  track?: string;
  alternatives: RecommendationAlternative[];
  ambiguous: boolean;
};

/**
 * Suggestions only. Never mutates Play configuration.
 */
export function recommendTestingMode(config: TestingConfiguration): TestingRecommendation {
  const open = config.openTesting.exists;
  const closed = config.closedTesting.exists;
  const internal = config.internalTesting.exists;
  const closedTracks = config.closedTesting.tracks;

  if (!open && !closed && !internal) {
    return {
      primary: "NONE",
      title: "No active testing configuration detected",
      reason: "Configure testing in Google Play Console first. TestLoop will not create or change Play tracks automatically.",
      cta: "Set up testing in Play Console",
      alternatives: [],
      ambiguous: false,
    };
  }

  if (open && !closed && !internal) {
    const track = config.openTesting.tracks[0];
    return {
      primary: "OPEN",
      title: "Open testing",
      reason:
        "This app already has an active open testing track. Open testing is suitable for TestLoop’s automated tester onboarding because users can join the test through Google Play without being individually managed through a closed tester list.",
      cta: "Manage Open Testing",
      track: track?.track,
      alternatives: [],
      ambiguous: false,
    };
  }

  if (internal && !closed && !open) {
    const track = config.internalTesting.tracks[0];
    return {
      primary: "INTERNAL",
      title: "Internal testing",
      reason: "Your app currently has an internal testing track. This is suitable for a small QA team.",
      cta: "Manage Internal Testing",
      track: track?.track,
      alternatives: [
        {
          kind: "OPEN",
          title: "Set up open testing",
          reason: "Want to reach a wider beta audience? Create an open testing track in Play Console, then refresh TestLoop.",
        },
      ],
      ambiguous: false,
    };
  }

  if (closed && !open && !internal) {
    if (closedTracks.length > 1) {
      return {
        primary: "CHOOSE",
        title: "Closed testing",
        reason: "Your app already has restricted testing tracks configured. Choose which closed testing track you want to manage.",
        cta: "Choose a closed track",
        alternatives: closedTracks.map((track) => ({
          kind: "CLOSED" as const,
          title: track.displayName || playTrackDisplayName(track.track, "CLOSED"),
          reason: "Restricted tester access is controlled by Google Play.",
          track: track.track,
        })),
        ambiguous: false,
      };
    }
    const track = closedTracks[0];
    return {
      primary: "CLOSED",
      title: "Closed testing",
      reason:
        "This app has an active closed testing track. TestLoop can collect tester Gmail addresses and manage tester requests, but individual closed-track email-list membership must be completed through Google Play Console.",
      cta: "Manage Closed Testing",
      track: track?.track,
      alternatives: [],
      ambiguous: false,
    };
  }

  const alternatives: RecommendationAlternative[] = [];
  if (closed) {
    alternatives.push({
      kind: "CLOSED",
      title: "Closed testing",
      reason: "Use this when you want controlled tester access.",
      track: closedTracks.length === 1 ? closedTracks[0]?.track : undefined,
    });
  }
  if (internal) {
    alternatives.push({
      kind: "INTERNAL",
      title: "Internal testing",
      reason: "Use this for a smaller QA or internal testing group.",
      track: config.internalTesting.tracks[0]?.track,
    });
  }

  if (open) {
    return {
      primary: "OPEN",
      title: "Open testing",
      reason:
        "Multiple testing modes detected. Open testing is recommended for TestLoop tester onboarding because users can join through Google Play without being individually managed on a closed tester list. This is a recommendation only — TestLoop will not change your Play Console tracks.",
      cta: "Manage Open Testing",
      track: config.openTesting.tracks[0]?.track,
      alternatives,
      ambiguous: true,
    };
  }

  return {
    primary: closed ? "CLOSED" : "INTERNAL",
    title: closed ? "Closed testing" : "Internal testing",
    reason:
      "Multiple testing modes detected. Choose the workflow that matches this campaign. TestLoop will not change your Play Console tracks.",
    cta: closed ? "Manage Closed Testing" : "Manage Internal Testing",
    track: closed ? closedTracks[0]?.track : config.internalTesting.tracks[0]?.track,
    alternatives,
    ambiguous: true,
  };
}

export function summarizeConfiguration(config: TestingConfiguration) {
  return {
    internal: config.internalTesting.exists,
    internalActive: config.internalTesting.active,
    internalConfigured: config.internalTesting.tracks.some(trackHasDetectedConfiguration),
    open: config.openTesting.exists,
    openActive: config.openTesting.active,
    openConfigured: config.openTesting.tracks.some(trackHasDetectedConfiguration),
    closed: config.closedTesting.exists,
    closedActive: config.closedTesting.active,
    closedConfigured: config.closedTesting.tracks.some(trackHasDetectedConfiguration),
    closedCount: config.closedTesting.tracks.length,
    production: config.production.exists,
    productionActive: config.production.active,
    productionConfigured: config.production.tracks.some(trackHasDetectedConfiguration),
    testingTrackCount: config.testingTrackCount,
    configuredTrackCount:
      config.internalTesting.tracks.filter(trackHasDetectedConfiguration).length +
      config.openTesting.tracks.filter(trackHasDetectedConfiguration).length +
      config.closedTesting.tracks.filter(trackHasDetectedConfiguration).length,
  };
}

export type ConfigurationSummary = ReturnType<typeof summarizeConfiguration>;

export function playConsoleSetupUrl() {
  return "https://play.google.com/console";
}

function isTrackRecord(value: unknown): value is PlayTrackRecord {
  if (!value || typeof value !== "object") return false;
  const row = value as Partial<PlayTrackRecord>;
  return typeof row.track === "string";
}

/** Reconstruct cached Play tracks without inventing fields Google did not return. */
export function parseTracksSnapshot(value: unknown): PlayTrackRecord[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isTrackRecord).map((row) => {
    const typeGuess = row.typeGuess || classifyPlayTrack(row.track);
    return {
      track: row.track,
      typeGuess,
      displayName: row.displayName || playTrackDisplayName(row.track, typeGuess),
      releaseName: row.releaseName ?? null,
      versionCodes: Array.isArray(row.versionCodes) ? row.versionCodes.map(String) : [],
      releaseStatus: row.releaseStatus ?? null,
      userFraction: typeof row.userFraction === "number" ? row.userFraction : null,
      releaseNotes: row.releaseNotes ?? null,
      googleGroupCount: typeof row.googleGroupCount === "number" ? row.googleGroupCount : null,
    };
  });
}

function maxVersionCode(track: PlayTrackRecord) {
  const codes = track.versionCodes.map(Number).filter((value) => !Number.isNaN(value));
  return codes.length ? Math.max(...codes) : 0;
}

/** Prefer a live release, then configured evidence, then highest version, then name. */
export function comparePlayTracks(a: PlayTrackRecord, b: PlayTrackRecord) {
  const aActive = isReleaseActive(a.releaseStatus) ? 1 : 0;
  const bActive = isReleaseActive(b.releaseStatus) ? 1 : 0;
  if (bActive !== aActive) return bActive - aActive;
  const aDetected = trackHasDetectedConfiguration(a) ? 1 : 0;
  const bDetected = trackHasDetectedConfiguration(b) ? 1 : 0;
  if (bDetected !== aDetected) return bDetected - aDetected;
  const version = maxVersionCode(b) - maxVersionCode(a);
  if (version !== 0) return version;
  return a.track.localeCompare(b.track);
}

function pickRankedTrack(tracks: PlayTrackRecord[]) {
  if (!tracks.length) return null;
  return tracks.slice().sort(comparePlayTracks)[0] || null;
}

export type PreferredTestingTrack = {
  track: PlayTrackRecord;
  testingType: Exclude<PlayTrackKind, "PRODUCTION">;
  reason: string;
  ambiguous: boolean;
};

/**
 * Deterministically choose the testing track TestLoop should publish against.
 * Never invents a track. Returns null when Play reported no testing tracks.
 */
export function preferDetectedTrack(config: TestingConfiguration): PreferredTestingTrack | null {
  const recommendation = recommendTestingMode(config);
  if (recommendation.primary === "NONE") return null;

  if (recommendation.primary === "OPEN") {
    const track = pickRankedTrack(config.openTesting.tracks);
    if (!track) return null;
    return {
      track,
      testingType: "OPEN",
      reason: recommendation.reason,
      ambiguous: recommendation.ambiguous,
    };
  }

  if (recommendation.primary === "INTERNAL") {
    const track = pickRankedTrack(config.internalTesting.tracks);
    if (!track) return null;
    return {
      track,
      testingType: "INTERNAL",
      reason: recommendation.reason,
      ambiguous: recommendation.ambiguous,
    };
  }

  const closed = pickRankedTrack(config.closedTesting.tracks);
  if (closed) {
    return {
      track: closed,
      testingType: "CLOSED",
      reason:
        recommendation.primary === "CHOOSE"
          ? "Multiple closed testing tracks were detected. TestLoop selected the track with the most current active release from Google Play."
          : recommendation.reason,
      ambiguous: recommendation.primary === "CHOOSE" || recommendation.ambiguous,
    };
  }

  const fallback =
    pickRankedTrack(config.openTesting.tracks) || pickRankedTrack(config.internalTesting.tracks);
  if (!fallback || fallback.typeGuess === "PRODUCTION") return null;
  return {
    track: fallback,
    testingType: fallback.typeGuess,
    reason: recommendation.reason,
    ambiguous: recommendation.ambiguous,
  };
}

/** Stable snapshot of Play-reported track fields used to detect stale publish data. */
export function playTrackFingerprint(track: PlayTrackRecord) {
  return [
    track.track,
    track.typeGuess,
    track.releaseStatus ?? "",
    track.releaseName ?? "",
    [...track.versionCodes].sort().join(","),
  ].join("|");
}
