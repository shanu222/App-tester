import { z } from "zod";
import { json, handleRouteError, parseJson } from "@/lib/http";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";
import { markOnboardingStep } from "@/lib/services/users";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await parseJson(
      request,
      z.object({
        step: z.number().int().min(0).max(10),
        completed: z.boolean().optional(),
      }),
    );
    const updated = await markOnboardingStep(user.id, body.step, body.completed);
    return json({ user: updated });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function GET() {
  try {
    const user = await requireUser();
    const integrations = await prisma.integration.findMany({ where: { userId: user.id } });
    const apps = await prisma.app.count({ where: { userId: user.id } });
    const campaigns = await prisma.campaign.count({ where: { userId: user.id } });
    return json({
      step: user.onboardingStep,
      completed: user.onboardingCompleted,
      hasFacebook: integrations.some((item) => item.provider === "FACEBOOK" && item.status === "CONNECTED"),
      hasGoogle: integrations.some((item) => item.provider === "GOOGLE" && item.status === "CONNECTED"),
      hasPlay: integrations.some((item) => item.provider === "GOOGLE_PLAY" && item.status === "CONNECTED"),
      apps,
      campaigns,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
