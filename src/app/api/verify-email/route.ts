import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sha256 } from "@/lib/crypto";
import { env } from "@/lib/env";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(`${env.appUrl}/login?verify=missing`);
  }
  const row = await prisma.emailVerificationToken.findFirst({
    where: { tokenHash: sha256(token), usedAt: null, expiresAt: { gt: new Date() } },
  });
  if (!row) {
    return NextResponse.redirect(`${env.appUrl}/login?verify=invalid`);
  }
  await prisma.user.update({
    where: { id: row.userId },
    data: { emailVerified: new Date() },
  });
  await prisma.emailVerificationToken.update({
    where: { id: row.id },
    data: { usedAt: new Date() },
  });
  return NextResponse.redirect(`${env.appUrl}/login?verify=ok`);
}
