import { google } from "googleapis";
import type { AdapterResult, PlayAppRecord, PlayTrackRecord } from "@/lib/integrations/types";
import { PLAY_EMAIL_LIST_LIMITATION } from "@/lib/integrations/capabilities";

export type ServiceAccountJson = {
  client_email: string;
  private_key: string;
  project_id?: string;
};

function publisherClient(sa: ServiceAccountJson) {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: sa.client_email,
      private_key: sa.private_key,
    },
    scopes: ["https://www.googleapis.com/auth/androidpublisher"],
  });
  return google.androidpublisher({ version: "v3", auth });
}

function reportingAuth(sa: ServiceAccountJson) {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: sa.client_email,
      private_key: sa.private_key,
    },
    scopes: ["https://www.googleapis.com/auth/playdeveloperreporting"],
  });
}

export async function testPlayAccess(
  sa: ServiceAccountJson,
  packageName?: string,
): Promise<AdapterResult<{ method: string; detail: string }>> {
  try {
    const apps = await searchPlayApps(sa);
    if (apps.ok && apps.data.length) {
      return {
        ok: true,
        data: {
          method: "playdeveloperreporting.apps.search",
          detail: `Verified. ${apps.data.length} accessible app(s) found.`,
        },
      };
    }
    if (packageName) {
      const publisher = publisherClient(sa);
      const edit = await publisher.edits.insert({ packageName });
      const editId = edit.data.id;
      if (editId) {
        await publisher.edits.delete({ packageName, editId });
      }
      return {
        ok: true,
        data: {
          method: "androidpublisher.edits.insert",
          detail: `Verified access to ${packageName}.`,
        },
      };
    }
    return {
      ok: false,
      error:
        apps.ok
          ? "Service account authenticated, but no apps were returned. Grant this service account access in Play Console → Users and permissions, then add an app package name to test edits."
          : apps.error,
      code: "PLAY_NO_APPS",
      manualFallback: "Add the app package name manually on My Apps.",
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Google Play authorization failed.",
      code: "PLAY_AUTH_ERROR",
    };
  }
}

export async function searchPlayApps(
  sa: ServiceAccountJson,
): Promise<AdapterResult<PlayAppRecord[]>> {
  try {
    const auth = await reportingAuth(sa).getClient();
    const token = await auth.getAccessToken();
    if (!token.token) {
      return { ok: false, error: "Could not obtain Play Reporting access token.", code: "PLAY_TOKEN" };
    }
    const response = await fetch(
      "https://playdeveloperreporting.googleapis.com/v1beta1/apps:search?pageSize=100",
      { headers: { Authorization: `Bearer ${token.token}` } },
    );
    const json = (await response.json()) as {
      apps?: Array<{ packageName?: string; displayName?: string }>;
      error?: { message?: string };
    };
    if (!response.ok) {
      return {
        ok: false,
        error: json.error?.message || `Play Reporting apps.search failed (${response.status}).`,
        code: "PLAY_APPS_SEARCH",
        manualFallback: "The Android Publisher API cannot list apps. Add package names manually.",
      };
    }
    return {
      ok: true,
      data: (json.apps || [])
        .filter((app) => app.packageName)
        .map((app) => ({
          packageName: app.packageName as string,
          displayName: app.displayName || app.packageName || "Untitled app",
        })),
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Play app search failed.",
      code: "PLAY_APPS_SEARCH",
      manualFallback: "Add apps manually by package name.",
    };
  }
}

export async function listPlayTracks(
  sa: ServiceAccountJson,
  packageName: string,
): Promise<AdapterResult<PlayTrackRecord[]>> {
  try {
    const publisher = publisherClient(sa);
    const edit = await publisher.edits.insert({ packageName });
    const editId = edit.data.id;
    if (!editId) {
      return { ok: false, error: "Could not open a Play Console edit.", code: "PLAY_EDIT" };
    }
    const tracks = await publisher.edits.tracks.list({ packageName, editId });
    await publisher.edits.delete({ packageName, editId });
    const rows = (tracks.data.tracks || []).map((track) => {
      const name = track.track || "unknown";
      let typeGuess: PlayTrackRecord["typeGuess"] = "CLOSED";
      if (name === "production") typeGuess = "PRODUCTION";
      else if (name === "beta") typeGuess = "OPEN";
      else if (name === "qa" || name === "internal") typeGuess = "INTERNAL";
      else if (name === "alpha") typeGuess = "CLOSED";
      return { track: name, typeGuess };
    });
    return { ok: true, data: rows };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not list tracks.",
      code: "PLAY_TRACKS",
      manualFallback: "Enter the track name from Play Console (for closed tests, use the custom track name).",
    };
  }
}

export async function getPlayTesterGroups(
  sa: ServiceAccountJson,
  packageName: string,
): Promise<AdapterResult<{ googleGroups: string[] }>> {
  try {
    const publisher = publisherClient(sa);
    const edit = await publisher.edits.insert({ packageName });
    const editId = edit.data.id;
    if (!editId) {
      return { ok: false, error: "Could not open a Play Console edit.", code: "PLAY_EDIT" };
    }
    const testers = await publisher.edits.testers.get({ packageName, editId });
    await publisher.edits.delete({ packageName, editId });
    return {
      ok: true,
      data: { googleGroups: testers.data.googleGroups || [] },
    };
  } catch (error) {
    return {
      ok: false,
      error:
        (error instanceof Error ? error.message : "Could not read testers.") +
        ` ${PLAY_EMAIL_LIST_LIMITATION}`,
      code: "PLAY_TESTERS",
    };
  }
}

export async function ensurePlayTesterGroup(
  sa: ServiceAccountJson,
  packageName: string,
  groupEmail: string,
): Promise<AdapterResult<{ googleGroups: string[] }>> {
  try {
    const publisher = publisherClient(sa);
    const edit = await publisher.edits.insert({ packageName });
    const editId = edit.data.id;
    if (!editId) {
      return { ok: false, error: "Could not open a Play Console edit.", code: "PLAY_EDIT" };
    }
    const current = await publisher.edits.testers.get({ packageName, editId });
    const groups = new Set(current.data.googleGroups || []);
    groups.add(groupEmail);
    await publisher.edits.testers.update({
      packageName,
      editId,
      requestBody: { googleGroups: [...groups] },
    });
    await publisher.edits.commit({ packageName, editId });
    return { ok: true, data: { googleGroups: [...groups] } };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not attach Google Group to the track testers resource.",
      code: "PLAY_TESTERS_UPDATE",
      manualFallback:
        "In Play Console, open the closed test track → Testers → Google Groups, and add the group email.",
    };
  }
}

export function testingLinkForPackage(packageName: string) {
  if (!packageName.trim()) return null;
  return `https://play.google.com/apps/testing/${packageName.trim()}`;
}
