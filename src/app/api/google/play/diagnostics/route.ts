import { json, handleRouteError } from "@/lib/http";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";
import { readCredentials } from "@/lib/integrations/store";
import {
  ANDROID_PUBLISHER_SCOPE,
  parseServiceAccount,
  runPlayDiagnostics,
  type PlayDiagnostics,
  type PlayErrorCode,
} from "@/lib/integrations/play-diagnostics";
import { ForbiddenError } from "@/lib/errors";

function emptyResult(
  errorCode: PlayErrorCode,
  errorMessage: string,
  packageName: string | null,
): PlayDiagnostics {
  return {
    connected: false,
    serviceAccountEmail: null,
    projectId: null,
    apiReachable: false,
    playConsoleAuthorized: false,
    packageAccessible: packageName ? false : null,
    errorCode,
    errorMessage,
    googleStatus: null,
    googleReason: null,
    googleMessage: null,
    httpStatus: null,
    checkedPackageName: packageName,
    scope: ANDROID_PUBLISHER_SCOPE,
    detail: null,
    checkedAt: new Date().toISOString(),
  };
}

/**
 * Live read-only diagnostic for the stored Google Play service account.
 * Returns only non-sensitive facts: no private key, no access token, no raw JSON.
 *
 * Admins may pass ?userId= to diagnose another developer's connection.
 */
export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const url = new URL(request.url);
    const packageName = url.searchParams.get("packageName")?.trim() || undefined;
    const requestedUserId = url.searchParams.get("userId")?.trim();

    if (requestedUserId && requestedUserId !== user.id && user.role !== "ADMIN") {
      throw new ForbiddenError("Only admins can run diagnostics for another developer.");
    }
    const targetUserId = requestedUserId || user.id;

    const integration = await prisma.integration.findUnique({
      where: { userId_provider: { userId: targetUserId, provider: "GOOGLE_PLAY" } },
      select: { encryptedCredentials: true, status: true, lastError: true, lastTestAt: true },
    });

    if (!integration) {
      return json(
        emptyResult(
          "PLAY_NOT_CONNECTED",
          "No Google Play service account has been uploaded for this developer yet.",
          packageName ?? null,
        ),
        200,
      );
    }

    const credentials = readCredentials(integration.encryptedCredentials);
    if (!credentials?.serviceAccountJson) {
      return json(
        emptyResult(
          "PLAY_CREDENTIALS_UNREADABLE",
          "Stored Google Play credentials could not be decrypted. This usually means ENCRYPTION_KEY changed since they were saved. Upload the service account JSON again.",
          packageName ?? null,
        ),
        200,
      );
    }

    const parsed = parseServiceAccount(credentials.serviceAccountJson);
    if (!parsed.ok) {
      return json(
        emptyResult("INVALID_SERVICE_ACCOUNT_JSON", parsed.message, packageName ?? null),
        200,
      );
    }

    const diagnostics = await runPlayDiagnostics(parsed.serviceAccount, packageName);

    // Keep the stored status honest with what Google just reported.
    await prisma.integration.updateMany({
      where: { userId: targetUserId, provider: "GOOGLE_PLAY" },
      data: {
        status: diagnostics.connected ? "CONNECTED" : "ERROR",
        lastError: diagnostics.connected ? null : diagnostics.errorMessage,
        lastTestAt: new Date(),
      },
    });

    return json(diagnostics, 200);
  } catch (error) {
    return handleRouteError(error);
  }
}
