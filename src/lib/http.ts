import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError, mapInfrastructureError, publicErrorMessage } from "@/lib/errors";

export function json<T>(data: T, init?: number | ResponseInit) {
  const responseInit = typeof init === "number" ? { status: init } : init;
  return NextResponse.json(data, responseInit);
}

export function handleRouteError(error: unknown) {
  if (error instanceof ZodError) {
    console.error("[VALIDATION_ERROR] schema=request");
    return json(
      { error: "Validation failed.", code: "VALIDATION_ERROR", details: error.issues.map((issue) => issue.message) },
      400,
    );
  }
  if (error instanceof AppError) {
    if (error.status >= 500) {
      console.error(`[${error.code}]`);
    }
    return json(
      { error: error.message, code: error.code, ...(error.details || {}) },
      error.status,
    );
  }
  const mapped = mapInfrastructureError(error);
  if (mapped) {
    console.error(`[DATABASE_ERROR] code=${mapped.code}`);
    return json({ error: mapped.message, code: mapped.code }, mapped.status);
  }
  console.error(error);
  return json({ error: publicErrorMessage(error) }, 500);
}

export async function parseJson<T>(request: Request, schema: { parse: (data: unknown) => T }) {
  const body = await request.json().catch(() => ({}));
  return schema.parse(body);
}
