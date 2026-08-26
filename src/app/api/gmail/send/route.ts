import { z } from "zod";
import { json, handleRouteError, parseJson } from "@/lib/http";
import { requireUser } from "@/auth";
import { sendInvitation } from "@/lib/services/invitations";
import { prisma } from "@/lib/db";
import { readCredentials } from "@/lib/integrations/store";
import { sendGmail } from "@/lib/integrations/gmail";
import { AppError } from "@/lib/errors";
import { assertOutreachAllowed, recordOutreach } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await parseJson(
      request,
      z.object({
        testerCampaignId: z.string().optional(),
        sendEmail: z.boolean().optional(),
        to: z.string().optional(),
        subject: z.string().optional(),
        body: z.string().optional(),
      }),
    );
    if (body.testerCampaignId) {
      const result = await sendInvitation({
        userId: user.id,
        testerCampaignId: body.testerCampaignId,
        sendEmail: body.sendEmail,
      });
      return json(result);
    }
    if (!body.to || !body.subject || !body.body) {
      throw new AppError("Provide to, subject, and body.");
    }
    const settings = await prisma.userSettings.findUnique({ where: { userId: user.id } });
    if (!settings?.allowAutomatedEmail) {
      throw new AppError("Automated email is disabled in Settings.");
    }
    await assertOutreachAllowed(user.id, "EMAIL");
    const gmail = await prisma.integration.findUnique({
      where: { userId_provider: { userId: user.id, provider: "GMAIL" } },
    });
    const creds = readCredentials(gmail?.encryptedCredentials);
    if (!creds?.refreshToken) throw new AppError("Gmail is not connected.");
    const sent = await sendGmail({
      refreshToken: creds.refreshToken,
      from: creds.email || "me",
      to: body.to,
      subject: body.subject,
      body: body.body,
    });
    if (!sent.ok) throw new AppError(sent.error);
    await recordOutreach(user.id, "EMAIL");
    return json({ id: sent.data.id });
  } catch (error) {
    return handleRouteError(error);
  }
}
