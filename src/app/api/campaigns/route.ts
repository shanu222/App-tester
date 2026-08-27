import { z } from "zod";
import { json, handleRouteError, parseJson } from "@/lib/http";
import { requireCompleteProfile, requireUser } from "@/auth";
import { createCampaign, listCampaigns, publishCampaign, transitionCampaign } from "@/lib/services/campaigns";
import type { CampaignStatus } from "@prisma/client";

const createSchema = z.object({
  name: z.string().min(2),
  appId: z.string().min(1),
  trackId: z.string().optional(),
  playTrack: z.string().max(120).optional(),
  sourceId: z.string().optional(),
  targetTesters: z.number().int().min(1).max(200).optional(),
  testingType: z.enum(["INTERNAL", "CLOSED", "OPEN"]).optional(),
  playStoreUrl: z.string().optional(),
  webOptInUrl: z.string().optional(),
  androidOptInUrl: z.string().optional(),
  durationDays: z.number().int().min(1).max(90).optional(),
  description: z.string().max(4000).optional(),
  testingInstructions: z.string().max(4000).optional(),
  reciprocalOpen: z.boolean().optional(),
  published: z.boolean().optional(),
});

export async function GET() {
  try {
    const user = await requireUser();
    const campaigns = await listCampaigns(user.id);
    return json({ campaigns });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireCompleteProfile();
    const body = await parseJson(request, createSchema);
    const campaign = await createCampaign(user.id, body);
    return json({ campaign }, 201);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    const body = await parseJson(
      request,
      z.object({
        id: z.string(),
        status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "COMPLETED", "ARCHIVED"]).optional(),
        publish: z.boolean().optional(),
      }),
    );
    if (body.publish) {
      const campaign = await publishCampaign(user.id, body.id);
      return json({ campaign });
    }
    if (!body.status) return json({ error: "status or publish is required." }, 400);
    const campaign = await transitionCampaign(user.id, body.id, body.status as CampaignStatus);
    return json({ campaign });
  } catch (error) {
    return handleRouteError(error);
  }
}
