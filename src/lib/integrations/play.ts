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
