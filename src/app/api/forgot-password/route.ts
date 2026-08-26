import { z } from "zod";
import { json, handleRouteError, parseJson } from "@/lib/http";
import { prisma } from "@/lib/db";
import { randomToken, sha256 } from "@/lib/crypto";
import { env } from "@/lib/env";

const schema = z.object({ email: z.string().min(3) });

export async function POST(request: Request) {
  try {
    const { email } = await parseJson(request, schema);
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (!user) {
      return json({ ok: true });
    }
    const token = randomToken();
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: sha256(token),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      },
    });
    const resetUrl = `${env.appUrl}/reset-password?token=${token}`;
    if (env.nodeEnv !== "production") console.info("Password reset URL:", resetUrl);
    return json({
      ok: true,
      resetUrl: env.nodeEnv === "production" && env.resendApiKey ? undefined : resetUrl,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
