import { z } from "zod";
import { json, handleRouteError, parseJson } from "@/lib/http";
import {
  confirmPasswordSignupEmailOtp,
  sendPasswordSignupEmailOtp,
} from "@/lib/auth/email-signup-otp";

const schema = z.object({
  action: z.enum(["send", "verify"]),
  idToken: z.string().min(1),
  code: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await parseJson(request, schema);
    if (body.action === "send") {
      const result = await sendPasswordSignupEmailOtp(body.idToken);
      return json({ ok: true, ...result });
    }
    const code = body.code?.trim() || "";
    if (!code) {
      return json({ error: "Enter the verification code.", code: "OTP_INCORRECT" }, 400);
    }
    const result = await confirmPasswordSignupEmailOtp(body.idToken, code);
    return json({ ok: true, ...result });
  } catch (error) {
    return handleRouteError(error);
  }
}
