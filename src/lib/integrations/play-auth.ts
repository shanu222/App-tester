import { google } from "googleapis";
import { env } from "@/lib/env";
import { ANDROID_PUBLISHER_SCOPE, PLAY_REPORTING_SCOPE } from "@/lib/integrations/play-scopes";
import type { ServiceAccountJson } from "@/lib/integrations/play";

export { ANDROID_PUBLISHER_SCOPE, PLAY_REPORTING_SCOPE };

/**
 * Scopes requested during the developer OAuth flow. Android Publisher is the
 * only Play permission asked for; openid/email exist solely so the callback can
 * name the account that authorised, which the connection card displays.
 */
export const PLAY_OAUTH_SCOPES = [ANDROID_PUBLISHER_SCOPE, "openid", "email"];

/**
 * Holds the encrypted OAuth state so the callback can confirm the flow was
 * started by this browser. Lives here rather than in a route file because
 * route modules may only export request handlers.
 */
export const PLAY_OAUTH_STATE_COOKIE = "play_oauth_state";

/**
 * Either way a developer can authorise TestLoop against their Play Console.
 * Every Play call takes this so callers never branch on the connection method.
 */
export type PlayCredentials =
  | { method: "SERVICE_ACCOUNT"; serviceAccount: ServiceAccountJson }
  | { method: "OAUTH"; refreshToken: string };

/**
 * googleapis bundles its own copy of google-auth-library, so importing
 * OAuth2Client from the top-level package yields a structurally identical but
 * nominally different type. Deriving it from the client we actually construct
 * keeps the two in sync.
 */
type PlayOAuthClient = InstanceType<typeof google.auth.OAuth2>;
type PlayServiceAccountAuth = InstanceType<typeof google.auth.GoogleAuth>;

export function playOAuthConfigured() {
  return Boolean(env.googleClientId && env.googleClientSecret);
}

export function playOAuthRedirectUri() {
  return `${env.appUrl.replace(/\/$/, "")}/api/google-play/oauth/callback`;
}

export function playOAuthClient(): PlayOAuthClient {
  return new google.auth.OAuth2(
    env.googleClientId,
    env.googleClientSecret,
    playOAuthRedirectUri(),
  );
}

/**
 * `prompt=consent` with `access_type=offline` is what forces Google to return a
 * refresh token. Without it a re-authorising developer gets an access token
 * only, and the connection would silently stop working within the hour.
 */
export function playOAuthAuthorizationUrl(state: string) {
  return playOAuthClient().generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: false,
    scope: PLAY_OAUTH_SCOPES,
    state,
  });
}

function serviceAccountCredentials(sa: ServiceAccountJson) {
  return {
    client_email: sa.client_email,
    // A key pasted through a form can arrive with escaped newlines.
    private_key: (sa.private_key || "").replace(/\\n/g, "\n"),
  };
}

/**
 * Build an authenticated client for the given scopes. Service accounts sign a
 * JWT per scope set; OAuth connections replay the stored refresh token.
 */
export function playAuth(creds: PlayCredentials, scopes: string[]) {
  if (creds.method === "SERVICE_ACCOUNT") {
    return new google.auth.GoogleAuth({
      credentials: serviceAccountCredentials(creds.serviceAccount),
      scopes,
    });
  }
  const client = playOAuthClient();
  client.setCredentials({ refresh_token: creds.refreshToken });
  return client;
}

export function publisherClient(creds: PlayCredentials) {
  return google.androidpublisher({
    version: "v3",
    auth: playAuth(creds, [ANDROID_PUBLISHER_SCOPE]) as never,
  });
}

/** Mint a bearer token for APIs called over plain fetch rather than a client. */
export async function playAccessToken(
  creds: PlayCredentials,
  scopes: string[],
): Promise<string | null> {
  const auth = playAuth(creds, scopes);
  if (creds.method === "OAUTH") {
    const token = await (auth as PlayOAuthClient).getAccessToken();
    return token.token ?? null;
  }
  const client = await (auth as PlayServiceAccountAuth).getClient();
  const token = await client.getAccessToken();
  return token.token ?? null;
}

/**
 * Read the email out of the id_token Google returned from the token endpoint.
 * The token arrived directly from Google over TLS in exchange for our client
 * secret, so the payload is read without a second round trip to verify it.
 */
export function emailFromIdToken(idToken: string | null | undefined): string | null {
  if (!idToken) return null;
  const payload = idToken.split(".")[1];
  if (!payload) return null;
  try {
    const decoded = JSON.parse(
      Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"),
    ) as { email?: string };
    return decoded.email?.toLowerCase() ?? null;
  } catch {
    return null;
  }
}
