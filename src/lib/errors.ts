export class AppError extends Error {
  status: number;
  code: string;
  expose: boolean;
  details?: Record<string, unknown>;

  constructor(
    message: string,
    status = 400,
    code = "APP_ERROR",
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.expose = true;
    this.details = details;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Workspace is not available.") {
    super(message, 401, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You do not have access to this resource.") {
    super(message, 403, "FORBIDDEN");
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Not found.") {
    super(message, 404, "NOT_FOUND");
  }
}

export class RateLimitError extends AppError {
  constructor(message = "Daily outreach limit reached.") {
    super(message, 429, "RATE_LIMIT");
  }
}

export class IntegrationUnavailableError extends AppError {
  constructor(message: string) {
    super(message, 409, "INTEGRATION_UNAVAILABLE");
  }
}

export function publicErrorMessage(error: unknown) {
  if (error instanceof AppError && error.expose) return error.message;
  const mapped = mapInfrastructureError(error);
  if (mapped) return mapped.message;
  return "An unexpected error occurred. Please try again.";
}

/**
 * Turns infrastructure failures (missing ENCRYPTION_KEY, unmigrated tables)
 * into an actionable message. Google Play wording is used only when the
 * failure is actually about Play credentials or the Play connection table.
 */
export function mapInfrastructureError(error: unknown): AppError | null {
  const code = prismaErrorCode(error);
  const message = errorMessage(error);
  const model = prismaModelName(error);
  const playRelated = isPlayInfrastructureFailure(message, model);

  if (/ENCRYPTION_KEY is required/i.test(message) || /Invalid encrypted payload/i.test(message)) {
    return new AppError(
      "This server cannot store Google Play credentials because ENCRYPTION_KEY is missing or invalid. Set ENCRYPTION_KEY (64 hex characters) on the server and retry.",
      500,
      "ENCRYPTION_KEY_MISSING",
    );
  }

  if (code === "P2021" || code === "P2010" || /does not exist/i.test(message)) {
    if (playRelated) {
      return new AppError(
        "The Google Play connection table is missing from the database. Apply pending Prisma migrations (`prisma migrate deploy`) and retry.",
        500,
        "PLAY_SCHEMA_MISSING",
      );
    }
    return new AppError(
      "A required database table is missing. Apply pending Prisma migrations (`prisma migrate deploy`) and retry.",
      500,
      "SCHEMA_MISSING",
    );
  }

  if (code === "P2002") {
    if (playRelated) {
      return new AppError("A Google Play connection already exists for this account. Disconnect it, then connect again.", 409, "PLAY_CONNECTION_EXISTS");
    }
    return new AppError("That record already exists.", 409, "UNIQUE_CONSTRAINT");
  }

  if (code) {
    if (playRelated) {
      return new AppError(
        "The Google Play connection could not be saved to the database. Check that migrations have been applied and retry.",
        500,
        "PLAY_PERSIST_FAILED",
      );
    }
    return new AppError(
      "This request could not be saved. If this continues, apply pending database migrations and retry.",
      500,
      "PERSIST_FAILED",
    );
  }

  return null;
}

export function prismaErrorCode(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  const record = error as { code?: unknown; name?: unknown };
  if (typeof record.code === "string" && /^P\d{4}$/.test(record.code)) return record.code;
  const cause = "cause" in error ? (error as { cause?: unknown }).cause : undefined;
  if (cause && typeof cause === "object" && typeof (cause as { code?: unknown }).code === "string") {
    const nested = (cause as { code: string }).code;
    if (/^P\d{4}$/.test(nested)) return nested;
  }
  return null;
}

/** Logs DATABASE_ERROR without query payloads or secrets, then returns a safe AppError. */
export function logDatabaseError(context: string, error: unknown) {
  const prismaCode = prismaErrorCode(error);
  console.error(`[DATABASE_ERROR] context=${context} prismaCode=${prismaCode || "none"}`);
  const mapped = mapInfrastructureError(error);
  if (mapped) {
    return new AppError(mapped.message, mapped.status, "DATABASE_ERROR");
  }
  return new AppError(
    "This request could not be saved. If this continues, apply pending database migrations and retry.",
    503,
    "DATABASE_ERROR",
  );
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === "object" && "message" in error && typeof (error as { message: unknown }).message === "string") {
    return (error as { message: string }).message;
  }
  return "";
}

function isPlayInfrastructureFailure(message: string, model: string | null) {
  if (model && /googleplay|playconnection/i.test(model)) return true;
  return /GooglePlayConnection|play credentials|google play connection/i.test(message);
}

function prismaModelName(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  const meta = "meta" in error ? (error as { meta?: { modelName?: unknown } }).meta : undefined;
  if (meta && typeof meta.modelName === "string") return meta.modelName;
  return null;
}
