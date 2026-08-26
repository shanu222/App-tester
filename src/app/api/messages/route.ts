import { z } from "zod";
import { json, handleRouteError, parseJson } from "@/lib/http";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";
import { extractEmails } from "@/lib/email-extract";
import { createOrGetTester, setTesterStatus } from "@/lib/services/testers";
import { logActivity, notify } from "@/lib/audit";
import { FACEBOOK_GROUP_LIMITATION } from "@/lib/integrations/capabilities";
import { gmailRequestReply } from "@/lib/templates";

export async function GET() {
  try {
    const user = await requireUser();
    const messages = await prisma.message.findMany({
      where: { userId: user.id },
      include: { tester: true, campaign: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return json({
      messages,
      inboxLimitation:
        "Automatic reply monitoring is unavailable for Facebook Group connections. Paste replies manually. Page comments can be synced when a Page token is connected.",
    });
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
        campaignId: z.string(),
        testerCampaignId: z.string().optional(),
        opportunityId: z.string().optional(),
        personName: z.string().optional(),
        text: z.string().min(1),
      }),
    );
    const emails = extractEmails(body.text);
    const preferred = emails.find((item) => item.isGmail) ?? emails[0];
    const campaign = await prisma.campaign.findFirst({
      where: { id: body.campaignId, userId: user.id },
      include: { app: true },
    });
    if (!preferred) {
      const message = await prisma.message.create({
        data: {
          userId: user.id,
          campaignId: body.campaignId,
          direction: "inbound",
          channel: "MANUAL",
          body: body.text,
        },
      });
      return json({
        message,
        emails: [],
        preferred: null,
        needsGmail: true,
        suggestedReply: gmailRequestReply(campaign?.app.name || "the app"),
        inboxLimitation: FACEBOOK_GROUP_LIMITATION,
      });
    }
    const created = await createOrGetTester({
      userId: user.id,
      campaignId: body.campaignId,
      email: preferred.normalized,
      name: body.personName,
      opportunityId: body.opportunityId,
      sourceLabel: "Pasted reply",
    });
    const testerId = created.tester.id;
    if (created.testerCampaign.status === "DISCOVERED" || created.testerCampaign.status === "CONTACTED") {
      await setTesterStatus({
        userId: user.id,
        testerCampaignId: created.testerCampaign.id,
        to: "REPLIED",
        note: "Pasted reply",
      });
    }
    if (!created.testerCampaign.dateEmailReceived) {
      await setTesterStatus({
        userId: user.id,
        testerCampaignId: created.testerCampaign.id,
        to: "EMAIL_RECEIVED",
        note: preferred.normalized,
      });
    }
    await notify({
      userId: user.id,
      type: "reply",
      title: "Tester replied with Gmail",
      body: `${preferred.normalized} · ${preferred.label}`,
      href: `/testers/${testerId}`,
      campaignId: body.campaignId,
    });
    await logActivity({
      userId: user.id,
      campaignId: body.campaignId,
      testerId,
      action: "REPLY_RECEIVED",
      result: preferred.normalized,
    });
    const message = await prisma.message.create({
      data: {
        userId: user.id,
        campaignId: body.campaignId,
        testerId,
        direction: "inbound",
        channel: "MANUAL",
        body: body.text,
        extractedEmail: preferred?.normalized,
      },
    });
    return json({
      message,
      emails,
      preferred,
      inboxLimitation: FACEBOOK_GROUP_LIMITATION,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
