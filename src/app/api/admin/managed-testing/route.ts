import { z } from "zod";
import { json, handleRouteError, parseJson } from "@/lib/http";
import { requireAdmin } from "@/auth";
import {
  adminAddManagedTester,
  adminAllocateTesters,
  adminListManagedTesting,
  adminMarkPaymentFailed,
  adminMarkPaymentPaid,
} from "@/lib/services/managed-testing";

export async function GET() {
  try {
    await requireAdmin();
    const data = await adminListManagedTesting();
    return json(data);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = await parseJson(
      request,
      z.object({
        action: z.enum(["mark-paid", "mark-failed", "add-tester", "allocate"]),
        paymentPublicId: z.string().optional(),
        campaignPublicId: z.string().optional(),
        name: z.string().optional(),
        email: z.string().optional(),
        googleAccountEmail: z.string().optional().nullable(),
        consented: z.boolean().optional(),
      }),
    );
    if (body.action === "mark-paid") {
      if (!body.paymentPublicId) return json({ error: "Payment required." }, 400);
      const result = await adminMarkPaymentPaid(body.paymentPublicId);
      return json({ ok: true, ...result });
    }
    if (body.action === "mark-failed") {
      if (!body.paymentPublicId) return json({ error: "Payment required." }, 400);
      await adminMarkPaymentFailed(body.paymentPublicId);
      return json({ ok: true });
    }
    if (body.action === "allocate") {
      if (!body.campaignPublicId) return json({ error: "Campaign required." }, 400);
      const result = await adminAllocateTesters(body.campaignPublicId);
      return json({ ok: true, ...result });
    }
    if (!body.name || !body.email) return json({ error: "Name and email are required." }, 400);
    const tester = await adminAddManagedTester({
      name: body.name,
      email: body.email,
      googleAccountEmail: body.googleAccountEmail,
      consented: body.consented,
    });
    return json({ ok: true, publicId: tester.publicId });
  } catch (error) {
    return handleRouteError(error);
  }
}
