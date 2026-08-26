import { z } from "zod";
import { json, handleRouteError, parseJson } from "@/lib/http";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";
import { upsertIntegration } from "@/lib/integrations/store";
import { redactSecrets } from "@/lib/integrations/google-api-error";
import {
  parseServiceAccount,
  runPlayDiagnostics,
  type PlayDiagnostics,
} from "@/lib/integrations/play-diagnostics";

const schema = z.object({
  serviceAccountJson: z.string().min(20),
  packageName: z.string().trim().max(255).optional(),
});

/**
 * Verifies a Google Play service account with read-only Android Publisher calls
 * and returns the real diagnostic. This route never answers with a generic
 * failure: every branch carries an errorCode plus Google's own message.
 */
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await parseJson(request, schema);

    // Validate before anything is written, so an unusable key is never stored.
    const parsed = parseServiceAccount(body.serviceAccountJson);
    if (!parsed.ok) {
      return json(
        {
          connected: false,
          serviceAccountEmail: null,
          projectId: null,
          apiReachable: false,
          playConsoleAuthorized: false,
          packageAccessible: null,
          errorCode: "INVALID_SERVICE_ACCOUNT_JSON",
          errorMessage: parsed.message,
        },
        400,
      );
    }

    const diagnostics = await runPlayDiagnostics(parsed.serviceAccount, body.packageName);

    try {
      await persist(user.id, body.serviceAccountJson, diagnostics);
    } catch (cause) {
      // The Google check already produced a verdict. Report the storage problem
      // plainly rather than masking it as a Google error.
      const message = redactSecrets(cause instanceof Error ? cause.message : "Unknown storage error.");
      console.error("[testloop][play] could not store Play credentials:", message);
      return json(
        {
          ...diagnostics,
          connected: false,
          errorCode: diagnostics.errorCode ?? "PLAY_STORAGE_FAILED",
          errorMessage: `${diagnostics.errorMessage ? `${diagnostics.errorMessage} ` : ""}The Google check finished, but TestLoop could not save this integration: ${message}`,
        },
        500,
      );
    }

    return json(diagnostics, diagnostics.connected ? 200 : 409);
  } catch (error) {
    return handleRouteError(error);
  }
}

async function persist(userId: string, serviceAccountJson: string, diagnostics: PlayDiagnostics) {
  await upsertIntegration({
    userId,
    provider: "GOOGLE_PLAY",
    status: diagnostics.connected ? "CONNECTED" : "ERROR",
    displayName: diagnostics.serviceAccountEmail ?? undefined,
    externalAccountId: diagnostics.projectId ?? undefined,
    scopes: [diagnostics.scope],
    // Only persist the key once Google has accepted it. Passing undefined
    // leaves any previously verified credentials in place.
    credentials: diagnostics.connected
      ? { serviceAccountJson: JSON.stringify(JSON.parse(serviceAccountJson.trim())) }
      : undefined,
    lastError: diagnostics.connected ? null : diagnostics.errorMessage,
    capabilities: {
      // Android Publisher has no app-listing endpoint; discovery needs the
      // separate Play Developer Reporting API, which this check does not cover.
      "play.apps.search": false,
      "play.tracks.read": diagnostics.packageAccessible === true,
      "play.testers.googleGroups": diagnostics.playConsoleAuthorized,
      "play.testers.emailList": false,
      "play.install.perTester": false,
    },
    metadata: {
      apiReachable: diagnostics.apiReachable,
      playConsoleAuthorized: diagnostics.playConsoleAuthorized,
      packageAccessible: diagnostics.packageAccessible,
      checkedPackageName: diagnostics.checkedPackageName,
      errorCode: diagnostics.errorCode,
      googleStatus: diagnostics.googleStatus,
      checkedAt: diagnostics.checkedAt,
    },
  });
}

export async function GET() {
  try {
    const user = await requireUser();
    // Explicit field list: never spread the row, so encryptedCredentials cannot
    // leak if the schema gains or renames a secret-bearing column.
    const integrations = await prisma.integration.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        provider: true,
        status: true,
        displayName: true,
        scopes: true,
        externalAccountId: true,
        lastSyncAt: true,
        lastTestAt: true,
        lastError: true,
        capabilities: true,
        metadata: true,
        isDemo: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return json({ integrations });
  } catch (error) {
    return handleRouteError(error);
  }
}
