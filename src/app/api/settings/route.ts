import { z } from "zod";
import { json, handleRouteError, parseJson } from "@/lib/http";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";
import { sanitizeUser } from "@/lib/services/users";
import { omitNotificationSecrets } from "@/lib/services/notifications";

export async function GET() {
  try {
    const user = await requireUser();
    const settings = await prisma.userSettings.findUnique({ where: { userId: user.id } });
    const templates = await prisma.messageTemplate.findMany({ where: { userId: user.id } });
    const safeSettings = settings ? omitNotificationSecrets(settings) : settings;
    return json({ user: sanitizeUser(user), settings: safeSettings, templates });
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
        name: z.string().optional(),
        developerName: z.string().optional(),
        company: z.string().optional(),
        commentsPerHour: z.number().int().min(1).max(20).optional(),
        commentsPerDay: z.number().int().min(1).max(50).optional(),
        processedPostsPerDay: z.number().int().min(1).max(200).optional(),
        messagesPerDay: z.number().int().min(1).max(100).optional(),
        requireCommentApproval: z.boolean().optional(),
        allowAutomatedEmail: z.boolean().optional(),
        notifyOpportunities: z.boolean().optional(),
        notifyReplies: z.boolean().optional(),
        notifyTesters: z.boolean().optional(),
        notifyIntegrations: z.boolean().optional(),
        notifyFeedback: z.boolean().optional(),
        playClosedTestTarget: z.number().int().min(1).optional(),
        playClosedTestDays: z.number().int().min(1).optional(),
        defaultKeywords: z.array(z.string()).optional(),
      }),
    );
    if (body.name || body.developerName || body.company) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          name: body.name || user.name,
          developerName: body.developerName || user.developerName,
          company: body.company || user.company,
        },
      });
    }
    const settings = await prisma.userSettings.upsert({
      where: { userId: user.id },
      update: {
        commentsPerHour: body.commentsPerHour,
        commentsPerDay: body.commentsPerDay,
        processedPostsPerDay: body.processedPostsPerDay,
        messagesPerDay: body.messagesPerDay,
        requireCommentApproval: body.requireCommentApproval,
        allowAutomatedEmail: body.allowAutomatedEmail,
        notifyOpportunities: body.notifyOpportunities,
        notifyReplies: body.notifyReplies,
        notifyTesters: body.notifyTesters,
        notifyIntegrations: body.notifyIntegrations,
        notifyFeedback: body.notifyFeedback,
        playClosedTestTarget: body.playClosedTestTarget,
        playClosedTestDays: body.playClosedTestDays,
        defaultKeywords: body.defaultKeywords,
      },
      create: { userId: user.id },
    });
    return json({ settings: omitNotificationSecrets(settings) });
  } catch (error) {
    return handleRouteError(error);
  }
}
