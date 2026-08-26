import { json } from "@/lib/http";
import { isDemoMode } from "@/lib/env";

export async function GET() {
  return json({
    ok: true,
    service: "testerbridge",
    demoMode: isDemoMode(),
    time: new Date().toISOString(),
  });
}
