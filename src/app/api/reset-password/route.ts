import { z } from "zod";
import { hash } from "bcryptjs";
import { json, handleRouteError, parseJson } from "@/lib/http";
import { prisma } from "@/lib/db";
import { sha256 } from "@/lib/crypto";
import { AppError } from "@/lib/errors";

const schema = z.object({
  token: z.string().min(10),
  password: z.string().min(8),
});

export async function POST(request: Request) {
  try {
    const { token, password } = await parseJson(request, schema);
    const row = await prisma.passwordResetToken.findFirst({
      where: { tokenHash: sha256(token), usedAt: null, expiresAt: { gt: new Date() } },
    });
    if (!row) throw new AppError("Reset link is invalid or expired.");
    await prisma.user.update({
      where: { id: row.userId },
      data: { passwordHash: await hash(password, 12) },
    });
    await prisma.passwordResetToken.update({
      where: { id: row.id },
      data: { usedAt: new Date() },
    });
    return json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
