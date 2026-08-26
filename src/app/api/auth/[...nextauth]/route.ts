import { bindAuthUrlToRequest } from "@/lib/apply-auth-url";
import { handlers } from "@/auth";
import { NextRequest } from "next/server";

function withRequestHost(req: NextRequest) {
  bindAuthUrlToRequest(req.nextUrl.origin);
  return req;
}

export function GET(req: NextRequest) {
  return handlers.GET(withRequestHost(req));
}

export function POST(req: NextRequest) {
  return handlers.POST(withRequestHost(req));
}
