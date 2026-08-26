import { z } from "zod";
import { json, handleRouteError, parseJson } from "@/lib/http";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";
import { setTesterStatus, confirmTesterEmail, blockTester } from "@/lib/services/testers";
import type { TesterStatus } from "@prisma/client";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const tester = await prisma.tester.findFirst({
      where: { id, userId: user.id },
      include: {
        campaigns: { include: { campaign: { include: { app: true } } } },
        statusHistory: { orderBy: { createdAt: "asc" } },
        feedback: true,
        invitations: true,
        messages: { orderBy: { createdAt: "desc" }, take: 50 },
      },
    });
    if (!tester) throw new NotFoundError("Tester not found.");
    return json({ tester });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const body = await parseJson(
      request,
      z.object({
        testerCampaignId: z.string(),
        status: z.string().optional(),
        email: z.string().optional(),
        confirmEmail: z.boolean().optional(),
        block: z.boolean().optional(),
        ourTestStatus: z.enum(["PENDING", "CONFIRMED", "TESTING", "COMPLETED"]).optional(),
        theirTestStatus: z.enum(["PENDING", "CONFIRMED", "TESTING", "COMPLETED"]).optional(),
        theirAppName: z.string().optional(),
        theirPlayLink: z.string().optional(),
        optedIn: z.boolean().optional(),
      }),
    );
    if (body.block) {
      await blockTester(user.id, id, "Blocked from tester detail");
    }
    if (body.confirmEmail && body.email) {
      await confirmTesterEmail({
        userId: user.id,
        testerCampaignId: body.testerCampaignId,
        email: body.email,
      });
    }
    if (body.status) {
      await setTesterStatus({
        userId: user.id,
        testerCampaignId: body.testerCampaignId,
        to: body.status as TesterStatus,
        note: "Manual status change",
      });
    }
    if (body.optedIn) {
      await setTesterStatus({
        userId: user.id,
        testerCampaignId: body.testerCampaignId,
        to: "OPTED_IN",
        note: "Opt-in recorded by user. Verify official status in Play Console.",
      });
    }
    if (body.ourTestStatus || body.theirTestStatus || body.theirAppName) {
      await prisma.testerCampaign.updateMany({
        where: { id: body.testerCampaignId, userId: user.id },
        data: {
          ourTestStatus: body.ourTestStatus,
          theirTestStatus: body.theirTestStatus,
          theirAppName: body.theirAppName,
          theirPlayLink: body.theirPlayLink,
        },
      });
    }
    return json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
