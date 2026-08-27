import type { GooglePlayConnection, GooglePlayConnectionMethod } from "@prisma/client";
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
import { canonicalPlayStoreUrl } from "@/lib/play-url";

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
export async function resolvePlayCredentials(userId: string): Promise<PlayCredentials> {
  const connection = await getPlayConnection(userId);
  if (!connection) {
    throw new AppError("Google Play is not connected. Connect it on the Google Play page first.");
  }
  if (!connection.encryptedCredentials) {
    throw new AppError(
      "Google Play credentials are missing. Reconnect Google Play with a service account or Google OAuth.",
    );
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
    const { tokens } = await client.getToken(input.code);
    refreshToken = tokens.refresh_token ?? null;
    email = emailFromIdToken(tokens.id_token);
  } catch {
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

  return diagnostics;
}

/** Re-run the read-only checks against the stored credentials. */
export async function verifyPlayConnection(input: {
  userId: string;
  packageName?: string;
}): Promise<PlayDiagnostics> {
  const connection = await getPlayConnection(input.userId);
  if (!connection) throw new NotFoundError("Google Play is not connected.");

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

export async function disconnectPlay(userId: string) {
  const connection = await getPlayConnection(userId);
  if (!connection) return { disconnected: false };
  // Cascade removes the discovered app cache; managed App rows are untouched.
  await prisma.googlePlayConnection.delete({ where: { userId } });
  await logActivity({
    userId,
    action: "PLAY_DISCONNECTED",
    result: connection.googleAccountEmail ?? connection.method,
  });
  return { disconnected: true };
}

export type DiscoveredApp = {
  id: string;
  packageName: string;
  name: string;
  iconUrl: string | null;
  selected: boolean;
  appId: string | null;
};

/**
 * Ask Google which applications this connection can see and cache the answer.
 * Android Publisher has no app-listing endpoint, so this uses the Play
 * Developer Reporting API; when that API is not enabled the failure is
 * reported rather than papered over with an empty list.
 */
export async function discoverPlayApps(userId: string) {
  const connection = await getPlayConnection(userId);
  if (!connection) throw new NotFoundError("Google Play is not connected.");

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
    throw new AppError(result.error);
  }

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

  await prisma.googlePlayConnection.update({
    where: { userId },
    data: { lastError: null, errorCode: null },
  });
  await logActivity({
    userId,
    action: "PLAY_APPS_DISCOVERED",
    result: `${result.data.length} app(s)`,
  });

  return listDiscoveredApps(userId);
}

export async function listDiscoveredApps(userId: string): Promise<DiscoveredApp[]> {
  const rows = await prisma.googlePlayApp.findMany({
    where: { userId },
    orderBy: { name: "asc" },
    select: {
      id: true,
      packageName: true,
      name: true,
      iconUrl: true,
      selected: true,
      appId: true,
    },
  });
  return rows;
}

/**
 * Mark a discovered Play app as managed by TestLoop and link it to an App row.
 * The application itself is never copied into TestLoop; Play Console stays the
 * source of truth and the package name is the stable identifier.
 */
export async function selectPlayApp(input: { userId: string; packageName: string }) {
  const connection = await getPlayConnection(input.userId);
  if (!connection) throw new NotFoundError("Google Play is not connected.");

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
    update: { syncedFromPlay: true, lastSyncedAt: new Date() },
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

/** Read the real tracks for a package. Ownership is enforced by connection lookup. */
export async function listTracksForPackage(input: { userId: string; packageName: string }) {
  const connection = await getPlayConnection(input.userId);
  if (!connection) throw new NotFoundError("Google Play is not connected.");

  const owned = await prisma.googlePlayApp.findUnique({
    where: {
      connectionId_packageName: {
        connectionId: connection.id,
        packageName: input.packageName,
      },
    },
    select: { id: true },
  });
  if (!owned) {
    throw new NotFoundError("This connection has no access to that package.");
  }

  const creds = await resolvePlayCredentials(input.userId);
  const result = await listPlayTracks(creds, input.packageName);
  if (!result.ok) {
    await logActivity({
      userId: input.userId,
      action: "PLAY_TRACKS_FAILED",
      result: `${input.packageName} · ${result.code}`,
    });
    throw new AppError(result.error);
  }
  return result.data;
}
