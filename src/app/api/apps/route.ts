import { z } from "zod";
import { json, handleRouteError, parseJson } from "@/lib/http";
import { requireUser } from "@/auth";
import { listAppsWithStats, createApp } from "@/lib/services/apps";

const schema = z.object({
  name: z.string().min(2),
  packageName: z.string().min(3),
  testingType: z.enum(["INTERNAL", "CLOSED", "OPEN"]).optional(),
  testingTrack: z.string().optional(),
  googlePlayUrl: z.string().optional(),
  testingUrl: z.string().optional(),
  googlePlayLink: z.string().optional(),
  iconUrl: z.string().optional(),
  testerTarget: z.number().optional(),
});

export async function GET() {
  try {
    const user = await requireUser();
    const apps = await listAppsWithStats(user.id);
    return json({ apps });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await parseJson(request, schema);
    const app = await createApp(user.id, body);
    return json({ app }, 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
