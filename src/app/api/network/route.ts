import { z } from "zod";
import { json, handleRouteError, parseJson } from "@/lib/http";
import { requireCompleteProfile, requireUser } from "@/auth";
import { prisma } from "@/lib/db";
import {
  acceptTestingRequest,
  confirmTestingGmail,
  listPublishedRequests,
  markParticipationManuallyAdded,
  markParticipationOptedIn,
  processTesterAccess,
  requestReciprocal,
  respondReciprocal,
  submitParticipationFeedback,
} from "@/lib/services/network";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(request.url);
    const requests = await listPublishedRequests(user.id, {
      testingType: searchParams.get("testingType") || undefined,
      reciprocal: searchParams.get("reciprocal") === "1",
    });
    return json({ requests });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireCompleteProfile();
    const body = await parseJson(
      request,
      z.object({
        action: z.enum([
          "accept",
          "consent",
          "retry-access",
          "manual-added",
          "opted-in",
          "feedback",
          "reciprocal-request",
          "reciprocal-respond",
        ]),
        campaignId: z.string().optional(),
        participationId: z.string().optional(),
        gmail: z.string().optional(),
        requesterAppId: z.string().optional(),
        targetId: z.string().optional(),
        reciprocalId: z.string().optional(),
        accept: z.boolean().optional(),
        overall: z.number().int().min(1).max(5).optional(),
        bugs: z.string().optional(),
        uiIssues: z.string().optional(),
        performance: z.string().optional(),
        suggestions: z.string().optional(),
      }),
    );
    if (body.action === "accept") {
      if (!body.campaignId) return json({ error: "campaignId required." }, 400);
      const participation = await acceptTestingRequest(user.id, body.campaignId);
      return json({ participation });
    }
    if (body.action === "consent") {
      if (!body.campaignId || !body.gmail) return json({ error: "campaignId and gmail required." }, 400);
      const participation = await confirmTestingGmail(user.id, body.campaignId, body.gmail);
      return json({
        participation: {
          id: participation.id,
          status: participation.status,
          lastError: participation.lastError,
          consentAt: participation.consentAt,
        },
      });
    }
    if (body.action === "retry-access") {
      if (!body.participationId) return json({ error: "participationId required." }, 400);
      const existing = await prisma.testingParticipation.findFirst({
        where: {
          id: body.participationId,
          OR: [{ ownerUserId: user.id }, { testerUserId: user.id }],
        },
      });
      if (!existing) return json({ error: "Not found." }, 404);
      const participation = await processTesterAccess(existing.id);
      return json({ participation: { id: participation.id, status: participation.status, lastError: participation.lastError } });
    }
    if (body.action === "manual-added") {
      if (!body.participationId) return json({ error: "participationId required." }, 400);
      const participation = await markParticipationManuallyAdded(user.id, body.participationId);
      return json({ participation: { id: participation.id, status: participation.status } });
    }
    if (body.action === "opted-in") {
      if (!body.participationId) return json({ error: "participationId required." }, 400);
      const participation = await markParticipationOptedIn(user.id, body.participationId);
      return json({ participation: { id: participation.id, status: participation.status } });
    }
    if (body.action === "feedback") {
      if (!body.participationId) return json({ error: "participationId required." }, 400);
      const feedback = await submitParticipationFeedback(user.id, body.participationId, body);
      return json({ feedback });
    }
    if (body.action === "reciprocal-request") {
      if (!body.targetId) return json({ error: "targetId required." }, 400);
      const row = await requestReciprocal(user.id, body.targetId, body.requesterAppId);
      return json({ reciprocal: row });
    }
    if (body.action === "reciprocal-respond") {
      if (!body.reciprocalId) return json({ error: "reciprocalId required." }, 400);
      const row = await respondReciprocal(user.id, body.reciprocalId, Boolean(body.accept));
      return json({ reciprocal: row });
    }
    return json({ error: "Unknown action." }, 400);
  } catch (error) {
    return handleRouteError(error);
  }
}
