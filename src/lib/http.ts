import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError, publicErrorMessage } from "@/lib/errors";

export function json<T>(data: T, init?: number | ResponseInit) {
  const responseInit = typeof init === "number" ? { status: init } : init;
  return NextResponse.json(data, responseInit);
}

export function handleRouteError(error: unknown) {
  if (error instanceof ZodError) {
    return json(
      { error: "Validation failed.", details: error.issues.map((issue) => issue.message) },
      400,
    );
  }
  if (error instanceof AppError) {
    return json({ error: error.message, code: error.code }, error.status);
  }
  console.error(error);
  return json({ error: publicErrorMessage(error) }, 500);
}

export async function parseJson<T>(request: Request, schema: { parse: (data: unknown) => T }) {
  const body = await request.json().catch(() => ({}));
  return schema.parse(body);
}
