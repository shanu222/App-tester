import { z } from "zod";
import { json, handleRouteError, parseJson } from "@/lib/http";
import { requireUser } from "@/auth";
import {
  cancelPendingNotificationEmail,
  getNotificationSettings,
  requestNotificationEmail,
  resendNotificationVerification,
  saveNotificationPreferences,
  sendTestNotificationEmail,
} from "@/lib/services/notifications";

const prefsSchema = z.object({
  testerJoined: z.boolean().optional(),
  testerAccepted: z.boolean().optional(),
  testerActionRequired: z.boolean().optional(),
  testerConfirmed: z.boolean().optional(),
  testerOnboardingIssue: z.boolean().optional(),
  playSyncIssues: z.boolean().optional(),
  playTrackChanges: z.boolean().optional(),
  playActionRequired: z.boolean().optional(),
  requestActivity: z.boolean().optional(),
  requestArchived: z.boolean().optional(),
  requestCompleted: z.boolean().optional(),
  dailySummary: z.boolean().optional(),
  managedTesting: z.boolean().optional(),
});

export async function GET() {
  try {
    const user = await requireUser();
    const settings = await getNotificationSettings(user.id);
    return json({ settings });
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
        action: z.enum(["set-email", "resend", "cancel-pending", "test", "save"]),
        email: z.string().optional(),
        enabled: z.boolean().optional(),
        preferences: prefsSchema.optional(),
        frequency: z.enum(["realtime", "daily", "weekly", "disabled"]).optional(),
        time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/).optional(),
        timezone: z.string().min(1).max(80).optional(),
        weekday: z.number().int().min(0).max(6).optional(),
      }),
    );
    if (body.action === "set-email") {
      if (!body.email) return json({ error: "email required." }, 400);
      const result = await requestNotificationEmail(user.id, body.email);
      return json({ ok: true, ...result });
    }
    if (body.action === "resend") {
      const result = await resendNotificationVerification(user.id);
      return json({ ok: true, ...result });
    }
    if (body.action === "cancel-pending") {
      const result = await cancelPendingNotificationEmail(user.id);
      return json({ ok: true, ...result });
    }
    if (body.action === "test") {
      await sendTestNotificationEmail(user.id);
      return json({ ok: true });
    }
    await saveNotificationPreferences(user.id, {
      enabled: body.enabled,
      preferences: body.preferences,
      schedule: {
        frequency: body.frequency,
        time: body.time,
        timezone: body.timezone,
        weekday: body.weekday,
      },
    });
    const settings = await getNotificationSettings(user.id);
    return json({ ok: true, settings });
  } catch (error) {
    return handleRouteError(error);
  }
}
