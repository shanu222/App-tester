import { bindAuthUrlToRequest } from "@/lib/apply-auth-url";
import { takeAuthErrorType } from "@/lib/auth-error";
import { handlers } from "@/auth";
import { NextRequest } from "next/server";

async function handle(req: NextRequest, method: "GET" | "POST") {
  bindAuthUrlToRequest(req.nextUrl.origin);
  const response = await (method === "GET" ? handlers.GET(req) : handlers.POST(req));

  const location = response.headers.get("location");
  const errorType = takeAuthErrorType();
  if (!location || !errorType || !location.includes("/login-error")) return response;

  const target = new URL(location, req.nextUrl.origin);
  target.searchParams.set("reason", errorType);
  const headers = new Headers(response.headers);
  headers.set("location", target.toString());
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export function GET(req: NextRequest) {
  return handle(req, "GET");
}

export function POST(req: NextRequest) {
  return handle(req, "POST");
}
