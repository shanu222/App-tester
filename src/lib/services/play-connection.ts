import type { GooglePlayConnection, GooglePlayConnectionMethod, GooglePlayStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AppError, NotFoundError, mapInfrastructureError } from "@/lib/errors";
import { logActivity } from "@/lib/audit";
import { decryptJson, encryptJson } from "@/lib/encryption";
import {
  parseServiceAccount,
  runPlayDiagnostics,
  runPlayOAuthDiagnostics,
  type PlayDiagnostics,
} from "@/lib/integrations/play-diagnostics";
import {
  ANDROID_PUBLISHER_SCOPE,
  PLAY_OAUTH_SCOPES,
  emailFromIdToken,
  playAccessToken,
  playOAuthClient,
  playOAuthConfigured,
  type PlayCredentials,
} from "@/lib/integrations/play-auth";
import { listPlayTracks, searchPlayApps, type ServiceAccountJson } from "@/lib/integrations/play";
import { notifyPlaySyncIssue, notifyPlayTrackChange } from "@/lib/services/notifications";
import { canonicalPlayStoreUrl } from "@/lib/play-url";
import type { PlayTrackRecord } from "@/lib/integrations/types";
import {
  detectTestingConfiguration,
  parseTracksSnapshot,
  recommendTestingMode,
  summarizeConfiguration,
  type ConfigurationSummary,
  type TestingConfiguration,
  type TestingRecommendation,
} from "@/lib/integrations/play-config";
import { campaignTestingUrl } from "@/lib/integrations/play-testers";
import { createCampaign, ensureCampaignPublicFields } from "@/lib/services/campaigns";
import { withTimeout } from "@/lib/integrations/play-retry";
import {
  PLAY_DISCONNECT_PARTIAL,
  PLAY_NOT_CONNECTED_FEATURE,
  campaignDependsOnPlayConnection,
  stripPlayDisconnectedNote,
  withPlayDisconnectedNote,
} from "@/lib/play-disconnect";

/**
 * Shape of the credential blob held in GooglePlayConnection.encryptedCredentials.
 * It never leaves this module, and no field of it is ever returned to a client.
 */
type StoredPlayCredentials = {
  serviceAccountJson?: string;
  refreshToken?: string;
};

/** Everything the browser is allowed to know about a Play connection. */
export type SafePlayConnection = {
  connected: boolean;
  method: GooglePlayConnectionMethod | null;
  status: GooglePlayConnection["status"];
  accountEmail: string | null;
  cloudProjectId: string | null;
  scopes: string[];
  lastVerifiedAt: string | null;
  lastSyncAt: string | null;
  lastError: string | null;
  errorCode: string | null;
  oauthAvailable: boolean;
};

export function safePlayConnection(
  connection: GooglePlayConnection | null,
): SafePlayConnection {
  return {
    connected: connection?.status === "CONNECTED",
    method: connection?.method ?? null,
    status: connection?.status ?? "NOT_CONNECTED",
    accountEmail: connection?.googleAccountEmail ?? null,
    cloudProjectId: connection?.cloudProjectId ?? null,
    scopes: connection?.scopes ?? [],
    lastVerifiedAt: connection?.lastVerifiedAt?.toISOString() ?? null,
    lastSyncAt: connection?.lastSyncAt?.toISOString() ?? null,
    lastError: connection?.lastError ?? null,
    errorCode: connection?.errorCode ?? null,
    oauthAvailable: playOAuthConfigured(),
  };
}

export function getPlayConnection(userId: string) {
  return prisma.googlePlayConnection.findUnique({ where: { userId } });
}

/**
 * Decrypt the stored credentials for one developer.
 *
 * Every Play operation goes through here, which is what keeps the integration
 * multi-tenant: the connection is looked up by the caller's own user id, so one
 * developer's credentials can never be used to act on another's behalf.
 */
export async function requireConnectedPlay(userId: string) {
  const connection = await getPlayConnection(userId);
  if (!connection || connection.status !== "CONNECTED" || !connection.encryptedCredentials) {
    throw new AppError(PLAY_NOT_CONNECTED_FEATURE, 409, "PLAY_NOT_CONNECTED");
  }
  return connection;
}

export async function resolvePlayCredentials(userId: string): Promise<PlayCredentials> {
  const connection = await requireConnectedPlay(userId);
  if (!connection.encryptedCredentials) {
    throw new AppError(PLAY_NOT_CONNECTED_FEATURE, 409, "PLAY_NOT_CONNECTED");
  }

  let stored: StoredPlayCredentials;
  try {
    stored = decryptJson<StoredPlayCredentials>(connection.encryptedCredentials);
  } catch {
    throw new AppError(
      "Stored Google Play credentials could not be decrypted. This usually means ENCRYPTION_KEY changed. Reconnect Google Play.",
    );
  }

  if (connection.method === "SERVICE_ACCOUNT") {
    if (!stored.serviceAccountJson) {
      throw new AppError("The stored service account key is unreadable. Reconnect Google Play.");
    }
    return {
      method: "SERVICE_ACCOUNT",
      serviceAccount: JSON.parse(stored.serviceAccountJson) as ServiceAccountJson,
    };
  }

  if (!stored.refreshToken) {
    throw new AppError(
      "Google Play authorisation is missing its refresh token. Reconnect Google Play with Google.",
    );
  }
  return { method: "OAUTH", refreshToken: stored.refreshToken };
}

async function persist(input: {
  userId: string;
  method: GooglePlayConnectionMethod;
  diagnostics: PlayDiagnostics;
  credentials?: StoredPlayCredentials;
  scopes: string[];
}) {
  const { userId, method, diagnostics, credentials, scopes } = input;
  let encrypted: string | undefined;
  try {
    encrypted = credentials ? encryptJson(credentials) : undefined;
  } catch (error) {
    throw mapInfrastructureError(error) ?? error;
  }
  const shared = {
    method,
    status: diagnostics.connected ? ("CONNECTED" as const) : ("ERROR" as const),
    googleAccountEmail: diagnostics.accountEmail,
    cloudProjectId: diagnostics.projectId,
    scopes,
    lastVerifiedAt: diagnostics.connected ? new Date() : null,
    lastError: diagnostics.connected ? null : diagnostics.errorMessage,
    errorCode: diagnostics.connected ? null : diagnostics.errorCode,
  };
  return prisma.googlePlayConnection.upsert({
    where: { userId },
    update: { ...shared, ...(encrypted ? { encryptedCredentials: encrypted } : {}) },
    create: { userId, ...shared, encryptedCredentials: encrypted },
  }).catch((error) => {
    throw mapInfrastructureError(error) ?? error;
  });
}

/**
 * Verify a pasted service-account key against the real Play API and store it
 * only if Google accepted it. A rejected key is never written, so the
 * connection can never claim to be healthy on the strength of an unchecked
 * paste.
 */
export async function connectServiceAccount(input: {
  userId: string;
  serviceAccountJson: string;
  packageName?: string;
}): Promise<PlayDiagnostics> {
  const parsed = parseServiceAccount(input.serviceAccountJson);
  if (!parsed.ok) {
    throw new AppError(parsed.message);
  }

  const diagnostics = await runPlayDiagnostics(parsed.serviceAccount, input.packageName);

  try {
    await persist({
      userId: input.userId,
      method: "SERVICE_ACCOUNT",
      diagnostics,
      // Re-serialising the parsed JSON drops any stray formatting from the paste.
      credentials: diagnostics.connected
        ? { serviceAccountJson: JSON.stringify(JSON.parse(input.serviceAccountJson.trim())) }
        : undefined,
      scopes: [ANDROID_PUBLISHER_SCOPE],
    });
    await logActivity({
      userId: input.userId,
      action: diagnostics.connected ? "PLAY_CONNECTED" : "PLAY_CONNECT_FAILED",
      result: `service account · ${diagnostics.accountEmail ?? "unknown"}${
        diagnostics.connected ? "" : ` · ${diagnostics.errorCode ?? "error"}`
      }`,
    });
  } catch (error) {
    const mapped = mapInfrastructureError(error) ?? (error instanceof AppError ? error : null);
    if (!mapped) throw error;
    // Google already answered. Do not hide that behind a generic 500 — report
    // that the credentials worked (or failed) and that storing them did not.
    return {
      ...diagnostics,
      connected: false,
      errorCode: "PLAY_STORE_FAILED",
      errorMessage: mapped.message,
    };
  }

  if (diagnostics.connected) {
    await discoverAppsAfterConnect(input.userId);
  }
  return diagnostics;
}

/**
 * Complete the developer OAuth flow: exchange the code, verify Play access,
 * then store the refresh token encrypted. Nothing is marked connected until
 * Google's API has actually answered.
 */
export async function connectOAuthCode(input: {
  userId: string;
  code: string;
}): Promise<PlayDiagnostics> {
  if (!playOAuthConfigured()) {
    throw new AppError(
      "Google OAuth is not configured on this server. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET, or connect with a service account instead.",
    );
  }

  const client = playOAuthClient();
  let refreshToken: string | null = null;
  let email: string | null = null;
  try {
    const { tokens } = await withTimeout(() => client.getToken(input.code), 15_000);
    refreshToken = tokens.refresh_token ?? null;
    email = emailFromIdToken(tokens.id_token);
  } catch (error) {
    if (error instanceof Error && error.name === "PlayTimeoutError") {
      throw new AppError(
        "Google did not finish authorising in time. Start the Google Play connection again. No Google Play data was changed.",
      );
    }
    // The raw error can carry the authorization code, so it is not surfaced.
    throw new AppError(
      "Google rejected the authorisation response. Start the Google Play connection again.",
    );
  }

  if (!refreshToken) {
    throw new AppError(
      "Google did not return a refresh token, so TestLoop cannot keep the connection alive. Remove TestLoop at myaccount.google.com/permissions and connect again.",
    );
  }

  const token = refreshToken;
  const diagnostics = await runPlayOAuthDiagnostics({
    email,
    mintAccessToken: () =>
      playAccessToken({ method: "OAUTH", refreshToken: token }, [ANDROID_PUBLISHER_SCOPE]),
  });

  await persist({
    userId: input.userId,
    method: "OAUTH",
    diagnostics,
    credentials: diagnostics.connected ? { refreshToken: token } : undefined,
    scopes: PLAY_OAUTH_SCOPES,
  });

  await logActivity({
    userId: input.userId,
    action: diagnostics.connected ? "PLAY_CONNECTED" : "PLAY_CONNECT_FAILED",
    result: `oauth · ${email ?? "unknown account"}${
      diagnostics.connected ? "" : ` · ${diagnostics.errorCode ?? "error"}`
    }`,
  });

  if (diagnostics.connected) {
    await discoverAppsAfterConnect(input.userId);
  }
  return diagnostics;
}

/** Re-run the read-only checks against the stored credentials. */
export async function verifyPlayConnection(input: {
  userId: string;
  packageName?: string;
}): Promise<PlayDiagnostics> {
  const connection = await requireConnectedPlay(input.userId);
  const creds = await resolvePlayCredentials(input.userId);
  const diagnostics =
    creds.method === "SERVICE_ACCOUNT"
      ? await runPlayDiagnostics(
          {
            clientEmail: creds.serviceAccount.client_email,
            privateKey: (creds.serviceAccount.private_key || "").replace(/\\n/g, "\n"),
            projectId: creds.serviceAccount.project_id ?? null,
            privateKeyId: null,
            tokenUri: null,
          },
          input.packageName,
        )
      : await runPlayOAuthDiagnostics(
          {
            email: connection.googleAccountEmail,
            mintAccessToken: () => playAccessToken(creds, [ANDROID_PUBLISHER_SCOPE]),
          },
          input.packageName,
        );

  await prisma.googlePlayConnection.update({
    where: { userId: input.userId },
    data: {
      status: diagnostics.connected ? "CONNECTED" : "ERROR",
      lastVerifiedAt: diagnostics.connected ? new Date() : connection.lastVerifiedAt,
      lastError: diagnostics.connected ? null : diagnostics.errorMessage,
      errorCode: diagnostics.connected ? null : diagnostics.errorCode,
      googleAccountEmail: diagnostics.accountEmail ?? connection.googleAccountEmail,
    },
  });

  return diagnostics;
}

export type PlayDisconnectResult = {
  disconnected: boolean;
  cleanupCompleted: boolean;
  campaignsUnpublished: number;
  playAppsRemoved: number;
  appsUnsynced: number;
  error?: string;
};

/**
 * Remove TestLoop's synchronized Play cache and unpublish Play-dependent posts.
 *
 * This function must never call the Google Play API. It does not delete apps,
 * tracks, releases, testers, or any other Play Console resource.
 */
export async function cleanupPlayDependentTestLoopData(userId: string) {
  const campaigns = await prisma.campaign.findMany({
    where: { userId },
    include: { app: { select: { syncedFromPlay: true } } },
  });
  const dependent = campaigns.filter((campaign) => campaignDependsOnPlayConnection(campaign));

  for (const campaign of dependent) {
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: {
        published: false,
        testingUrl: null,
        webOptInUrl: null,
        androidOptInUrl: null,
        description: withPlayDisconnectedNote(campaign.description),
        ...(campaign.status === "COMPLETED" ? {} : { status: "ARCHIVED" as const }),
      },
    });
  }

  const unsynced = await prisma.app.updateMany({
    where: { userId, syncedFromPlay: true },
    data: {
      syncedFromPlay: false,
      lastSyncedAt: null,
      playConflictNote: null,
      googlePlayStatus: "NOT_CONFIGURED",
    },
  });

  await prisma.testingTrack.updateMany({
    where: { syncedFromPlay: true, app: { userId } },
    data: { testingLink: null },
  });

  const playAppsRemoved = await prisma.googlePlayApp.count({ where: { userId } });

  return {
    campaignsUnpublished: dependent.length,
    appsUnsynced: unsynced.count,
    playAppsRemoved,
  };
}

async function clearLegacyPlayIntegration(userId: string) {
  await prisma.integration.updateMany({
    where: { userId, provider: "GOOGLE_PLAY" },
    data: {
      status: "NOT_CONNECTED",
      encryptedCredentials: null,
      lastError: null,
      displayName: null,
    },
  });
}

/**
 * Disconnect Google Play for this TestLoop account only.
 *
 * Intentionally does not: delete Play apps, delete releases, remove Play
 * testers, modify tracks, unpublish Play apps, or change production.
 */
export async function disconnectPlay(userId: string): Promise<PlayDisconnectResult> {
  const connection = await getPlayConnection(userId);

  let cleanup = {
    campaignsUnpublished: 0,
    appsUnsynced: 0,
    playAppsRemoved: 0,
  };
  let cleanupCompleted = false;
  try {
    cleanup = await cleanupPlayDependentTestLoopData(userId);
    cleanupCompleted = true;
  } catch (error) {
    console.error("Play disconnect cleanup failed", error);
  }

  let disconnected = !connection;
  try {
    const remaining = await getPlayConnection(userId);
    if (remaining) {
      await prisma.googlePlayConnection.delete({ where: { userId } });
    }
    await clearLegacyPlayIntegration(userId);
    disconnected = true;
    if (connection) {
      await logActivity({
        userId,
        action: "PLAY_DISCONNECTED",
        result: connection.googleAccountEmail ?? connection.method,
      });
    }
  } catch (error) {
    disconnected = !(await getPlayConnection(userId));
    if (!disconnected) {
      throw mapInfrastructureError(error) ?? new AppError(
        "Google Play could not be disconnected. Try again.",
        500,
        "PLAY_DISCONNECT_FAILED",
      );
    }
  }

  if (!cleanupCompleted) {
    return {
      disconnected,
      cleanupCompleted: false,
      ...cleanup,
      error: PLAY_DISCONNECT_PARTIAL,
    };
  }

  return { disconnected, cleanupCompleted: true, ...cleanup };
}

export type DiscoveredApp = {
  id: string;
  packageName: string;
  name: string;
  iconUrl: string | null;
  selected: boolean;
  appId: string | null;
  lastSyncAt: string | null;
  tracks: PlayTrackRecord[];
  configuration: ConfigurationSummary;
  testloop: {
    testers: number;
    pendingPlayAction: number;
  };
};

export type PlayTrackDiscovery = {
  packageName: string;
  tracks: PlayTrackRecord[];
  configuration: TestingConfiguration;
  recommendation: TestingRecommendation;
  newTracks: string[];
  lastSyncAt: string;
};

function googlePlayStatusFromConfig(config: TestingConfiguration): GooglePlayStatus {
  if (config.openTesting.exists) return "OPEN_TESTING";
  if (config.closedTesting.exists) return "CLOSED_TESTING";
  if (config.internalTesting.exists) return "INTERNAL_TESTING";
  if (config.production.exists) return "PRODUCTION";
  return "NOT_CONFIGURED";
}

async function discoverAppsAfterConnect(userId: string) {
  try {
    await discoverPlayApps(userId, { syncTracks: false });
  } catch (error) {
    console.error("Play app discovery after connect failed", error);
  }
}

async function mapPool<T>(items: T[], concurrency: number, fn: (item: T) => Promise<void>) {
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const current = items[index++];
      await fn(current);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) || 1 }, () => worker()));
}

function toDiscoveredApp(row: {
  id: string;
  packageName: string;
  name: string;
  iconUrl: string | null;
  selected: boolean;
  appId: string | null;
  lastSyncAt: Date | null;
  tracksSnapshot: unknown;
}): DiscoveredApp {
  const tracks = parseTracksSnapshot(row.tracksSnapshot);
  return {
    id: row.id,
    packageName: row.packageName,
    name: row.name,
    iconUrl: row.iconUrl,
    selected: row.selected,
    appId: row.appId,
    lastSyncAt: row.lastSyncAt?.toISOString() ?? null,
    tracks,
    configuration: summarizeConfiguration(detectTestingConfiguration(tracks)),
    testloop: { testers: 0, pendingPlayAction: 0 },
  };
}

/**
 * Ask Google which applications this connection can see and cache the answer.
 * Android Publisher has no app-listing endpoint, so this uses the Play
 * Developer Reporting API; when that API is not enabled the failure is
 * reported rather than papered over with an empty list.
 */
export async function discoverPlayApps(userId: string, options?: { syncTracks?: boolean }) {
  const connection = await requireConnectedPlay(userId);

  const creds = await resolvePlayCredentials(userId);
  const result = await searchPlayApps(creds);
  if (!result.ok) {
    await prisma.googlePlayConnection.update({
      where: { userId },
      data: { lastError: result.error, errorCode: result.code },
    });
    await logActivity({
      userId,
      action: "PLAY_APP_DISCOVERY_FAILED",
      result: result.code,
    });
    await notifyPlaySyncIssue(userId).catch(() => undefined);
    throw new AppError(result.error);
  }

  const seen = result.data.map((app) => app.packageName);
  for (const app of result.data) {
    await prisma.googlePlayApp.upsert({
      where: {
        connectionId_packageName: { connectionId: connection.id, packageName: app.packageName },
      },
      update: { name: app.displayName, discoveredAt: new Date(), userId },
      create: {
        connectionId: connection.id,
        userId,
        packageName: app.packageName,
        name: app.displayName,
      },
    });
  }

  if (seen.length > 0) {
    await prisma.googlePlayApp.deleteMany({
      where: {
        connectionId: connection.id,
        selected: false,
        appId: null,
        packageName: { notIn: seen },
      },
    });
  }

  const syncedAt = new Date();
  await prisma.googlePlayConnection.update({
    where: { userId },
    data: { lastError: null, errorCode: null, lastSyncAt: syncedAt },
  });
  await logActivity({
    userId,
    action: "PLAY_APPS_DISCOVERED",
    result: `${result.data.length} app(s)`,
  });

  if (options?.syncTracks) {
    await syncAllPackageTracks(userId);
  }

  return listDiscoveredApps(userId);
}

export async function listDiscoveredApps(userId: string): Promise<DiscoveredApp[]> {
  const connection = await getPlayConnection(userId);
  if (!connection || connection.status !== "CONNECTED") return [];

  const rows = await prisma.googlePlayApp.findMany({
    where: { userId },
    orderBy: { name: "asc" },
  });
  const appIds = rows.map((row) => row.appId).filter((id): id is string => Boolean(id));
  const testers = appIds.length
    ? await prisma.testerCampaign.findMany({
        where: { userId, appId: { in: appIds } },
        select: { appId: true, status: true },
      })
    : [];
  const byApp = new Map<string, { testers: number; pendingPlayAction: number }>();
  for (const row of testers) {
    if (!row.appId) continue;
    const current = byApp.get(row.appId) || { testers: 0, pendingPlayAction: 0 };
    current.testers += 1;
    if (row.status === "ADDING") current.pendingPlayAction += 1;
    byApp.set(row.appId, current);
  }
  return rows.flatMap((row) => {
    try {
      const app = toDiscoveredApp(row);
      app.testloop = row.appId
        ? byApp.get(row.appId) || { testers: 0, pendingPlayAction: 0 }
        : { testers: 0, pendingPlayAction: 0 };
      return [app];
    } catch (error) {
      console.error("[testloop][play] skipped a cached Play app that could not be read", error);
      return [];
    }
  });
}

/**
 * Mark a discovered Play app as managed by TestLoop and link it to an App row.
 * The application itself is never copied into TestLoop; Play Console stays the
 * source of truth and the package name is the stable identifier.
 */
export async function selectPlayApp(input: { userId: string; packageName: string }) {
  const connection = await requireConnectedPlay(input.userId);

  const discovered = await prisma.googlePlayApp.findUnique({
    where: {
      connectionId_packageName: {
        connectionId: connection.id,
        packageName: input.packageName,
      },
    },
  });
  if (!discovered) {
    throw new NotFoundError(
      "That package is not in the apps Google Play returned for this connection. Refresh apps and try again.",
    );
  }

  const app = await prisma.app.upsert({
    where: { userId_packageName: { userId: input.userId, packageName: discovered.packageName } },
    update: { syncedFromPlay: true, lastSyncedAt: new Date(), name: discovered.name },
    create: {
      userId: input.userId,
      name: discovered.name,
      packageName: discovered.packageName,
      playStoreUrl: canonicalPlayStoreUrl(discovered.packageName),
      syncedFromPlay: true,
      lastSyncedAt: new Date(),
    },
  });

  await prisma.googlePlayApp.update({
    where: { id: discovered.id },
    data: { selected: true, appId: app.id },
  });

  await logActivity({
    userId: input.userId,
    action: "PLAY_APP_SELECTED",
    result: discovered.packageName,
  });

  return { app, packageName: discovered.packageName };
}

async function persistTestingTracks(input: {
  appId: string | null;
  packageName: string;
  tracks: PlayTrackRecord[];
}) {
  if (!input.appId) return;
  const testing = input.tracks.filter((track) => track.typeGuess !== "PRODUCTION");
  for (const track of testing) {
    const existing = await prisma.testingTrack.findFirst({
      where: { appId: input.appId, trackId: track.track },
    });
    const testingType = track.typeGuess as "INTERNAL" | "CLOSED" | "OPEN";
    const testingLink = campaignTestingUrl({
      testingType,
      packageName: input.packageName,
    }).url;
    if (existing) {
      await prisma.testingTrack.update({
        where: { id: existing.id },
        data: {
          name: track.displayName,
          testingType,
          syncedFromPlay: true,
          testingLink: existing.testingLink || testingLink,
        },
      });
    } else {
      await prisma.testingTrack.create({
        data: {
          appId: input.appId,
          name: track.displayName,
          trackId: track.track,
          testingType,
          testingLink,
          syncedFromPlay: true,
        },
      });
    }
  }

  const config = detectTestingConfiguration(input.tracks);
  await prisma.app.update({
    where: { id: input.appId },
    data: {
      lastSyncedAt: new Date(),
      syncedFromPlay: true,
      googlePlayStatus: googlePlayStatusFromConfig(config),
    },
  });
}

/** Read the real tracks for a package and persist the Play snapshot. */
export async function syncPackageTracks(input: {
  userId: string;
  packageName: string;
}): Promise<PlayTrackDiscovery> {
  const connection = await requireConnectedPlay(input.userId);

  const owned = await prisma.googlePlayApp.findUnique({
    where: {
      connectionId_packageName: {
        connectionId: connection.id,
        packageName: input.packageName,
      },
    },
  });
  if (!owned) {
    throw new NotFoundError("This app is no longer accessible through the connected Play Console account.");
  }

  const previous = parseTracksSnapshot(owned.tracksSnapshot).map((track) => track.track);
  const creds = await resolvePlayCredentials(input.userId);
  await logActivity({
    userId: input.userId,
    action: "PLAY_SYNC_STARTED",
    result: input.packageName,
  });
  const result = await listPlayTracks(creds, input.packageName);
  if (!result.ok) {
    await logActivity({
      userId: input.userId,
      action: "PLAY_TRACKS_FAILED",
      result: `${input.packageName} · ${result.code}`,
    });
    await notifyPlaySyncIssue(input.userId, owned.name).catch(() => undefined);
    throw new AppError(
      result.error,
      result.code === "PLAY_AUTH_EXPIRED" ? 409 : result.code === "PLAY_UNAVAILABLE" ? 503 : 400,
      result.code,
    );
  }

  const lastSyncAt = new Date();
  await prisma.googlePlayApp.update({
    where: { id: owned.id },
    data: { tracksSnapshot: result.data as Prisma.InputJsonValue, lastSyncAt },
  });
  await persistTestingTracks({
    appId: owned.appId,
    packageName: input.packageName,
    tracks: result.data,
  });

  const newTracks = result.data
    .map((track) => track.track)
    .filter((name) => previous.length > 0 && !previous.includes(name));
  const configuration = detectTestingConfiguration(result.data);

  await logActivity({
    userId: input.userId,
    action: "PLAY_TRACKS_DISCOVERED",
    result: `${input.packageName} · ${result.data.length} track(s)${
      newTracks.length ? ` · new: ${newTracks.join(", ")}` : ""
    }`,
  });
  if (newTracks.length) {
    await notifyPlayTrackChange(input.userId, owned.id, owned.name).catch(() => undefined);
  }

  return {
    packageName: input.packageName,
    tracks: result.data,
    configuration,
    recommendation: recommendTestingMode(configuration),
    newTracks,
    lastSyncAt: lastSyncAt.toISOString(),
  };
}

export async function syncAllPackageTracks(userId: string) {
  const apps = await prisma.googlePlayApp.findMany({
    where: { userId },
    select: { packageName: true },
    take: 20,
  });
  await mapPool(apps, 3, async (app) => {
    try {
      await syncPackageTracks({ userId, packageName: app.packageName });
    } catch (error) {
      console.error(`Play track sync failed for ${app.packageName}`, error);
    }
  });
}

/**
 * Full refresh: verify the connection, re-list apps, then re-read tracks.
 * TestLoop campaign and tester rows are not overwritten.
 */
export async function refreshFromGooglePlay(userId: string) {
  await logActivity({ userId, action: "PLAY_SYNC_STARTED", result: "refresh" });
  const diagnostics = await verifyPlayConnection({ userId });
  if (!diagnostics.connected) {
    await notifyPlaySyncIssue(userId).catch(() => undefined);
    throw new AppError(
      diagnostics.errorMessage || "Your Google Play authorization has expired. Reconnect Google Play to continue.",
      409,
      diagnostics.errorCode || "PLAY_AUTH_EXPIRED",
    );
  }
  const apps = await discoverPlayApps(userId, { syncTracks: true });
  const connection = await getPlayConnection(userId);
  await logActivity({
    userId,
    action: "PLAY_REFRESHED",
    result: `${apps.length} app(s)`,
  });
  return {
    apps,
    lastSyncAt: connection?.lastSyncAt?.toISOString() ?? new Date().toISOString(),
  };
}

/** Read the real tracks for a package. Ownership is enforced by connection lookup. */
export async function listTracksForPackage(input: { userId: string; packageName: string }) {
  return syncPackageTracks(input);
}

/**
 * Open or create a TestLoop campaign for a discovered Play testing track.
 * Production tracks are rejected — TestLoop never publishes to production here.
 */
export async function managePlayTrack(input: {
  userId: string;
  packageName: string;
  track: string;
}) {
  if (input.track.trim().toLowerCase() === "production") {
    throw new AppError(
      "Production is separate from testing. TestLoop will not publish this app to production from a testing action.",
    );
  }

  await requireConnectedPlay(input.userId);

  const { app } = await selectPlayApp({ userId: input.userId, packageName: input.packageName });
  const discovery = await syncPackageTracks({
    userId: input.userId,
    packageName: input.packageName,
  });
  const playTrack = discovery.tracks.find((track) => track.track === input.track);
  if (!playTrack) {
    throw new AppError("That track is not in the latest Google Play configuration for this app.");
  }
  if (playTrack.typeGuess === "PRODUCTION") {
    throw new AppError(
      "Production is separate from testing. TestLoop will not publish this app to production from a testing action.",
    );
  }

  const testingType = playTrack.typeGuess;
  const testingLink = campaignTestingUrl({
    testingType,
    packageName: app.packageName,
  }).url;

  let trackRow = await prisma.testingTrack.findFirst({
    where: { appId: app.id, trackId: playTrack.track },
  });
  if (!trackRow) {
    trackRow = await prisma.testingTrack.create({
      data: {
        appId: app.id,
        name: playTrack.displayName,
        trackId: playTrack.track,
        testingType,
        testingLink,
        syncedFromPlay: true,
      },
    });
  }

  const existing = await prisma.campaign.findFirst({
    where: { userId: input.userId, appId: app.id, playTrack: playTrack.track },
    include: { app: true },
    orderBy: { updatedAt: "desc" },
  });
  if (existing) {
    if (existing.status === "ARCHIVED" || !existing.published) {
      const restored = await prisma.campaign.update({
        where: { id: existing.id },
        data: {
          status: "ACTIVE",
          published: true,
          publishedAt: new Date(),
          startedAt: existing.startedAt ?? new Date(),
          testingUrl: testingLink,
          webOptInUrl: testingLink,
          trackId: trackRow.id,
          testingType,
          name: `${app.name} — ${playTrack.displayName}`,
          description: stripPlayDisconnectedNote(existing.description),
        },
      });
      await logActivity({
        userId: input.userId,
        campaignId: restored.id,
        action: "PLAY_CAMPAIGN_OPENED",
        result: `${app.packageName} · ${playTrack.track}`,
      });
      return { campaignId: restored.id, created: false, playTrack: playTrack.track };
    }
    const campaign = await ensureCampaignPublicFields(existing);
    await logActivity({
      userId: input.userId,
      campaignId: campaign.id,
      action: "PLAY_CAMPAIGN_OPENED",
      result: `${app.packageName} · ${playTrack.track}`,
    });
    return { campaignId: campaign.id, created: false, playTrack: playTrack.track };
  }

  const campaign = await createCampaign(input.userId, {
    name: `${app.name} — ${playTrack.displayName}`,
    appId: app.id,
    trackId: trackRow.id,
    playTrack: playTrack.track,
    testingType,
    published: true,
    skipPlayRefresh: true,
  });
  await logActivity({
    userId: input.userId,
    campaignId: campaign.id,
    action: "PLAY_CAMPAIGN_CREATED",
    result: `${app.packageName} · ${playTrack.track}`,
  });
  return { campaignId: campaign.id, created: true, playTrack: playTrack.track };
}
