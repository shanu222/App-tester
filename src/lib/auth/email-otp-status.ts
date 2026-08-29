import { prisma } from "@/lib/db";

export async function isPasswordEmailOtpVerified(uid: string, email: string) {
  const row = await prisma.emailSignupOtp.findUnique({ where: { firebaseUid: uid } });
  if (!row?.verifiedAt) return false;
  return row.email === email.trim().toLowerCase();
}
