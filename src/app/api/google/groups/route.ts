import { z } from "zod";
import { json, handleRouteError, parseJson } from "@/lib/http";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";
import { upsertIntegration } from "@/lib/integrations/store";
import { GROUPS_API_LIMITATION } from "@/lib/integrations/capabilities";
import { AppError } from "@/lib/errors";
import type { ServiceAccountJson } from "@/lib/integrations/play";

export async function GET() {
  try {
    const user = await requireUser();
    const groups = await prisma.googleGroup.findMany({ where: { userId: user.id } });
    return json({ groups, limitation: GROUPS_API_LIMITATION });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await parseJson(
      request,
      z.object({
        email: z.string().min(3),
        name: z.string().optional(),
        serviceAccountJson: z.string().optional(),
        adminEmail: z.string().optional(),
      }),
    );
    const email = body.email.trim().toLowerCase();
    if (body.serviceAccountJson) {
      let parsed: ServiceAccountJson;
      try {
        parsed = JSON.parse(body.serviceAccountJson) as ServiceAccountJson;
      } catch {
        throw new AppError("Workspace service account JSON is invalid.");
      }
      await upsertIntegration({
        userId: user.id,
        provider: "GOOGLE_WORKSPACE",
        status: "CONNECTED",
        displayName: parsed.client_email,
        credentials: {
          serviceAccountJson: JSON.stringify(parsed),
          adminEmail: body.adminEmail,
        },
        capabilities: { "groups.members.manage": true },
      });
    }
    const group = await prisma.googleGroup.upsert({
      where: { userId_email: { userId: user.id, email } },
      update: { name: body.name, canManageMembers: Boolean(body.serviceAccountJson) },
      create: {
        userId: user.id,
        email,
        name: body.name,
        canManageMembers: Boolean(body.serviceAccountJson),
        limitationNote: body.serviceAccountJson ? null : GROUPS_API_LIMITATION,
      },
    });
    return json({ group });
  } catch (error) {
    return handleRouteError(error);
  }
}
