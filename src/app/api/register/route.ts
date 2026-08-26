import { z } from "zod";
import { json, handleRouteError, parseJson } from "@/lib/http";
import { registerUser } from "@/lib/services/users";
import { env } from "@/lib/env";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().min(3),
  password: z.string().min(8),
});

export async function POST(request: Request) {
  try {
    const body = await parseJson(request, schema);
    const { user, verificationToken } = await registerUser(body);
    const verifyUrl = `${env.appUrl}/verify-email?token=${verificationToken}`;
    if (env.nodeEnv !== "production") {
      console.info("Email verification URL:", verifyUrl);
    }
    return json({
      ok: true,
      userId: user.id,
      verificationUrl: env.nodeEnv === "production" && env.resendApiKey ? undefined : verifyUrl,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
