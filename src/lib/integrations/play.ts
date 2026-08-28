import type { AdapterResult, PlayAppRecord, PlayTrackRecord } from "@/lib/integrations/types";
import { parseGoogleApiError, readJsonBody, redactSecrets } from "@/lib/integrations/google-api-error";
import {
  PLAY_REPORTING_SCOPE,
  playAccessToken,
  publisherClient,
  type PlayCredentials,
} from "@/lib/integrations/play-auth";
import {
  classifyPlayTrack,
  playTrackDisplayName,
} from "@/lib/integrations/play-config";
import { mapPlayFailure } from "@/lib/integrations/play-errors";
import {
  isGoogleGroupAddress,
  mergeGoogleGroups,
  PLAY_ENROLLMENT_FAILED,
  PLAY_INTERNAL_TESTER_LIMIT_NOTE,
  PLAY_TESTER_API_LIMITATION,
} from "@/lib/integrations/play-testers";
import { normalizeEmail } from "@/lib/email-extract";

export type ServiceAccountJson = {
  client_email: string;
  private_key: string;
  project_id?: string;
};

/**
 * googleapis wraps failures in a GaxiosError whose body still holds Google's
 * error envelope. Pull the real message out instead of reporting a bare stack.
 */
function describeGoogleError(error: unknown, fallback: string) {
  const gaxios = error as {
    response?: { status?: number; data?: unknown };
    message?: string;
  };
  if (gaxios?.response?.data) {
    const parsed = parseGoogleApiError(gaxios.response.status ?? 0, gaxios.response.data);
    const suffix = parsed.status ? ` (${parsed.status})` : "";
    return `${parsed.message}${suffix}`;
  }
  if (typeof gaxios?.message === "string" && gaxios.message) return redactSecrets(gaxios.message);
  return fallback;
}

/**
 * Android Publisher v3 has no endpoint that lists the apps in a developer
 * account, so app discovery uses the Play Developer Reporting API. That is a
 * different API with its own scope and its own enablement switch, which is why
 * it can fail while the Android Publisher connection is healthy.
 */
export async function searchPlayApps(
  creds: PlayCredentials,
): Promise<AdapterResult<PlayAppRecord[]>> {
  try {
    const token = await playAccessToken(creds, [PLAY_REPORTING_SCOPE]);
    if (!token) {
      return {
        ok: false,
        error: "Could not obtain a Play Developer Reporting access token for this connection.",
        code: "PLAY_TOKEN",
        manualFallback: "Add apps manually by package name.",
      };
    }
    const response = await fetch(
      "https://playdeveloperreporting.googleapis.com/v1beta1/apps:search?pageSize=100",
      { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
    );
    const body = await readJsonBody(response);
    if (!response.ok) {
      const parsed = parseGoogleApiError(response.status, body);
      const notEnabled =
        parsed.reason === "SERVICE_DISABLED" || /has not been used in project|is disabled/i.test(parsed.message);
      return {
        ok: false,
        error: notEnabled
          ? `The Google Play Developer Reporting API is not enabled for this connection's Google Cloud project, so apps cannot be listed automatically. ${parsed.message}`
          : `${parsed.message}${parsed.status ? ` (${parsed.status})` : ""}`,
        code: notEnabled ? "PLAY_REPORTING_NOT_ENABLED" : "PLAY_APPS_SEARCH",
        manualFallback: "Add package names manually on My Apps. Android Publisher cannot list apps.",
      };
    }
    const payload = body as { apps?: Array<{ packageName?: string; displayName?: string }> };
    return {
      ok: true,
      data: (payload.apps || [])
        .filter((app) => app.packageName)
        .map((app) => ({
          packageName: app.packageName as string,
          displayName: app.displayName || app.packageName || "Untitled app",
        })),
    };
  } catch (error) {
    const mapped = mapPlayFailure(error, describeGoogleError(error, "Play app search failed."));
    return {
      ok: false,
      error: mapped.message,
      code: mapped.code === "PLAY_ERROR" ? "PLAY_APPS_SEARCH" : mapped.code,
      manualFallback: "Add apps manually by package name.",
    };
  }
}

export async function listPlayTracks(
  creds: PlayCredentials,
  packageName: string,
): Promise<AdapterResult<PlayTrackRecord[]>> {
  try {
    const publisher = publisherClient(creds);
    const edit = await publisher.edits.insert({ packageName });
    const editId = edit.data.id;
    if (!editId) {
      return { ok: false, error: "Could not open a Play Console edit.", code: "PLAY_EDIT" };
    }
    try {
      const tracks = await publisher.edits.tracks.list({ packageName, editId });
      const rows: PlayTrackRecord[] = [];
      for (const track of tracks.data.tracks || []) {
        const name = track.track || "unknown";
        const typeGuess = classifyPlayTrack(name);
        const releases = track.releases || [];
        const current =
          releases.find((release) => release.status === "completed") ||
          releases.find((release) => release.status === "inProgress") ||
          releases.at(-1);
        const notes = current?.releaseNotes?.[0]?.text?.trim() || null;
        let googleGroupCount: number | null = null;
        try {
          const testers = await publisher.edits.testers.get({ packageName, editId, track: name });
          googleGroupCount = (testers.data.googleGroups || []).length;
        } catch {
          googleGroupCount = null;
        }
        rows.push({
          track: name,
          typeGuess,
          displayName: playTrackDisplayName(name, typeGuess),
          releaseName: current?.name ?? null,
          versionCodes: (current?.versionCodes || []).map(String),
          releaseStatus: current?.status ?? null,
          userFraction: typeof current?.userFraction === "number" ? current.userFraction : null,
          releaseNotes: notes,
          googleGroupCount,
        });
      }
      return { ok: true, data: rows };
    } finally {
      await publisher.edits.delete({ packageName, editId }).catch(() => undefined);
    }
  } catch (error) {
    const mapped = mapPlayFailure(error, describeGoogleError(error, "Could not list tracks."));
    return {
      ok: false,
      error: mapped.message,
      code: mapped.code === "PLAY_ERROR" ? "PLAY_TRACKS" : mapped.code,
      manualFallback: "Enter the track name from Play Console (for closed tests, use the custom track name).",
    };
  }
}

export function testingLinkForPackage(packageName: string) {
  if (!packageName.trim()) return null;
  return `https://play.google.com/apps/testing/${packageName.trim()}`;
}

export type PlayEnrollmentOutcome =
  | "OPEN_OPT_IN"
  | "ENROLLED"
  | "ALREADY_ENROLLED"
  | "UNSUPPORTED"
  | "TRACK_MISSING"
  | "LIMIT_REACHED"
  | "FAILED";

export type PlayEnrollmentResult = {
  ok: boolean;
  outcome: PlayEnrollmentOutcome;
  googleGroups: string[];
  error?: string;
  code?: string;
};

function httpStatus(error: unknown) {
  return (error as { response?: { status?: number } })?.response?.status;
}

/**
 * Enroll a tester on an existing Play track using the app owner's credentials.
 *
 * Open tracks are not written: testers join through Google's opt-in URL.
 * Closed/internal tracks use edits.testers, which only accepts Google Groups.
 * Individual Gmail addresses are not added, and existing groups are never replaced.
 */
export async function enrollPlayTrackTester(input: {
  creds: PlayCredentials;
  packageName: string;
  track: string;
  email: string;
  testingType: "OPEN" | "CLOSED" | "INTERNAL";
}): Promise<PlayEnrollmentResult> {
  const email = normalizeEmail(input.email);
  try {
    const publisher = publisherClient(input.creds);
    const edit = await publisher.edits.insert({ packageName: input.packageName });
    const editId = edit.data.id;
    if (!editId) {
      return { ok: false, outcome: "FAILED", googleGroups: [], error: "Could not open a Play Console edit.", code: "PLAY_EDIT" };
    }
    const discard = () =>
      publisher.edits.delete({ packageName: input.packageName, editId }).catch(() => undefined);

    let committed = false;
    let groups: string[] = [];
    try {
      try {
        await publisher.edits.tracks.get({
          packageName: input.packageName,
          editId,
          track: input.track,
        });
      } catch (error) {
        if (httpStatus(error) === 404) {
          await discard();
          return {
            ok: false,
            outcome: "TRACK_MISSING",
            googleGroups: [],
            error: "The selected testing track is not available in Google Play for this app.",
            code: "PLAY_TRACK_MISSING",
          };
        }
        throw error;
      }

      try {
        const testers = await publisher.edits.testers.get({
          packageName: input.packageName,
          editId,
          track: input.track,
        });
        groups = testers.data.googleGroups || [];
      } catch (error) {
        if (httpStatus(error) !== 404) {
          await discard();
          const mapped = mapPlayFailure(error, describeGoogleError(error, PLAY_ENROLLMENT_FAILED));
          return { ok: false, outcome: "FAILED", googleGroups: [], error: mapped.message, code: mapped.code };
        }
      }

      if (input.testingType === "OPEN") {
        await discard();
        return { ok: true, outcome: "OPEN_OPT_IN", googleGroups: groups };
      }

      const merged = mergeGoogleGroups(groups, email);
      if (merged.alreadyPresent) {
        await discard();
        return { ok: true, outcome: "ALREADY_ENROLLED", googleGroups: groups };
      }

      if (!isGoogleGroupAddress(email)) {
        await discard();
        return {
          ok: false,
          outcome: "UNSUPPORTED",
          googleGroups: groups,
          error: PLAY_TESTER_API_LIMITATION,
          code: "PLAY_EMAIL_LIST_UNSUPPORTED",
        };
      }

      await publisher.edits.testers.update({
        packageName: input.packageName,
        editId,
        track: input.track,
        requestBody: { googleGroups: merged.groups },
      });
      await publisher.edits.commit({ packageName: input.packageName, editId });
      committed = true;
    } catch (error) {
      if (!committed) await discard();
      const mapped = mapPlayFailure(error, describeGoogleError(error, PLAY_ENROLLMENT_FAILED));
      const blob = `${mapped.message} ${error instanceof Error ? error.message : ""}`;
      if (/100|tester limit|too many testers/i.test(blob) && input.testingType === "INTERNAL") {
        return {
          ok: false,
          outcome: "LIMIT_REACHED",
          googleGroups: groups,
          error: PLAY_INTERNAL_TESTER_LIMIT_NOTE,
          code: "PLAY_INTERNAL_LIMIT",
        };
      }
      return { ok: false, outcome: "FAILED", googleGroups: groups, error: mapped.message, code: mapped.code };
    }

    const verify = await publisher.edits.insert({ packageName: input.packageName });
    const verifyId = verify.data.id;
    if (!verifyId) {
      return {
        ok: false,
        outcome: "FAILED",
        googleGroups: groups,
        error: "Google Play accepted the edit but TestLoop could not verify the tester list.",
        code: "PLAY_VERIFY",
      };
    }
    try {
      const testers = await publisher.edits.testers.get({
        packageName: input.packageName,
        editId: verifyId,
        track: input.track,
      });
      const verifiedGroups = testers.data.googleGroups || [];
      const present = verifiedGroups.some((group) => normalizeEmail(group) === email);
      if (!present) {
        return {
          ok: false,
          outcome: "FAILED",
          googleGroups: verifiedGroups,
          error: "Google Play did not confirm this address on the tester list. Existing testers were not replaced.",
          code: "PLAY_NOT_VERIFIED",
        };
      }
      return { ok: true, outcome: "ENROLLED", googleGroups: verifiedGroups };
    } finally {
      await publisher.edits.delete({ packageName: input.packageName, editId: verifyId }).catch(() => undefined);
    }
  } catch (error) {
    const mapped = mapPlayFailure(error, describeGoogleError(error, PLAY_ENROLLMENT_FAILED));
    return { ok: false, outcome: "FAILED", googleGroups: [], error: mapped.message, code: mapped.code };
  }
}

