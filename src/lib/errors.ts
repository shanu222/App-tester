export class AppError extends Error {
  status: number;
  code: string;
  expose: boolean;

  constructor(message: string, status = 400, code = "APP_ERROR") {
    super(message);
    this.status = status;
    this.code = code;
    this.expose = true;
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
  return "Something went wrong. Please try again.";
}
