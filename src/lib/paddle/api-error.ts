import { AppError } from "@/lib/errors";

const CHECKOUT_USER_MESSAGE =
  "Paddle checkout could not be started. Pay with EasyPaisa, JazzCash, SadaPay, NayaPay, or Binance instead, or try Paddle again.";

export type PaddleFailureKind =
  | "PADDLE_CONFIGURATION_ERROR"
  | "PADDLE_AUTHENTICATION_ERROR"
  | "PADDLE_TRANSACTION_CREATION_ERROR"
  | "DATABASE_ERROR"
  | "VALIDATION_ERROR";

export type ParsedPaddleApiError = {
  status: number | null;
  code: string;
  requestId: string | null;
  name: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/** Extracts Paddle API metadata. Never returns credential values. */
export function parsePaddleApiError(error: unknown): ParsedPaddleApiError {
  const record = asRecord(error);
  const nested = record ? asRecord(record.error) : null;
  const meta = record ? asRecord(record.meta) : nested ? asRecord(nested.meta) : null;
  const code =
    readString(record?.code) ||
    readString(nested?.code) ||
    (error instanceof Error ? error.name : "error");
  const statusRaw = record?.status ?? record?.statusCode ?? nested?.status;
  const status = typeof statusRaw === "number" && statusRaw > 0 ? statusRaw : inferStatusFromCode(code);
  const requestId =
    readString(record?.requestId) ||
    readString(record?.request_id) ||
    readString(meta?.request_id) ||
    readString(meta?.requestId);
  return {
    status,
    code,
    requestId,
    name: error instanceof Error ? error.name : "error",
  };
}

function inferStatusFromCode(code: string) {
  const normalized = code.toLowerCase();
  if (normalized.includes("authentication") || normalized === "unauthorized") return 401;
  if (normalized === "forbidden" || normalized.includes("permission")) return 403;
  if (normalized === "not_found" || normalized === "entity_not_found") return 404;
  if (normalized.includes("too_many") || normalized === "rate_limited") return 429;
  if (normalized.includes("validation") || normalized === "bad_request" || normalized === "invalid_request") return 400;
  return null;
}

export function classifyPaddleApiFailure(parsed: ParsedPaddleApiError): Exclude<PaddleFailureKind, "DATABASE_ERROR" | "VALIDATION_ERROR"> {
  const code = parsed.code.toLowerCase();
  const status = parsed.status;
  if (
    status === 401 ||
    status === 403 ||
    code.includes("authentication") ||
    code === "forbidden" ||
    code === "unauthorized"
  ) {
    return "PADDLE_AUTHENTICATION_ERROR";
  }
  if (
    status === 404 ||
    code === "not_found" ||
    code === "entity_not_found" ||
    code.includes("configuration")
  ) {
    return "PADDLE_CONFIGURATION_ERROR";
  }
  return "PADDLE_TRANSACTION_CREATION_ERROR";
}

export function logPaddleFailure(kind: PaddleFailureKind, extra: Record<string, string | number | null | undefined> = {}) {
  const parts = Object.entries(extra)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => `${key}=${value}`);
  console.error(`[Paddle] ${kind}${parts.length ? ` ${parts.join(" ")}` : ""}`);
}

export function paddleCheckoutFailure(error: unknown) {
  const parsed = parsePaddleApiError(error);
  const kind = classifyPaddleApiFailure(parsed);
  logPaddleFailure(kind, {
    status: parsed.status,
    code: parsed.code,
    requestId: parsed.requestId,
    name: parsed.name,
  });
  return new AppError(CHECKOUT_USER_MESSAGE, 503, kind);
}

export function paddleConfigurationError(reason: string, missingNames: string[] = []) {
  logPaddleFailure("PADDLE_CONFIGURATION_ERROR", {
    reason,
    missing: missingNames.join(",") || undefined,
  });
  return new AppError(
    missingNames.length
      ? "Paddle sandbox checkout is not configured yet. Choose EasyPaisa, JazzCash, SadaPay, NayaPay, or Binance."
      : CHECKOUT_USER_MESSAGE,
    503,
    "PADDLE_CONFIGURATION_ERROR",
  );
}
