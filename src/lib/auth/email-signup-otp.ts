import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { sha256, secureCompare, randomIntInclusive } from "@/lib/crypto";
import { verifyFirebaseIdToken } from "@/lib/firebase/verify";
import { sendSmtpEmail } from "@/lib/smtp";
import { wrapEmail } from "@/lib/notifications/templates";
import {
  isPasswordAuthProvider,
  passwordSignInConflictsWithGoogle,
} from "@/lib/auth/auth-method-conflict";
import {
  OTP_EXPIRED,
  OTP_INCORRECT,
  OTP_SEND_FAILED,
} from "@/lib/auth/firebase-auth-messages";

export const EMAIL_OTP_TTL_MS = 15 * 60 * 1000;
export const EMAIL_OTP_MAX_ATTEMPTS = 5;

function hashSignupOtp(uid: string, email: string, code: string) {
  return sha256(`${uid}:${email}:${code}:${env.authSecret}`);
}

function generateSignupOtpCode() {
  return String(randomIntInclusive(100000, 999999));
}

function signupOtpEmail(code: string) {
  const html = wrapEmail(
    `<p>Use this code to verify your TestLoop email address.</p>
     <p style="font-size:28px;font-weight:700;letter-spacing:0.24em;text-align:center;margin:24px 0">${code}</p>
     <p style="color:#64748b;font-size:13px">This code expires in 15 minutes and can be used only once. If you did not create a TestLoop account, you can ignore this email.</p>`,
  );
  const text = `Use this code to verify your TestLoop email address.\n\n${code}\n\nThis code expires in 15 minutes and can be used only once.`;
  return { subject: "Your TestLoop verification code", html, text };
}

async function requirePasswordIdentity(idToken: string) {
  const identity = await verifyFirebaseIdToken(idToken);
  if (!identity) {
    throw new AppError("Sign-in expired. Enter your email and password again.", 401, "OTP_AUTH");
  }
  if (!isPasswordAuthProvider(identity.provider) || passwordSignInConflictsWithGoogle(identity.providers)) {
    throw new AppError("This verification method is only for email and password accounts.", 400, "OTP_WRONG_PROVIDER");
  }
  return identity;
}

export async function isPasswordEmailOtpVerified(uid: string, email: string) {
  const row = await prisma.emailSignupOtp.findUnique({ where: { firebaseUid: uid } });
  if (!row?.verifiedAt) return false;
  return row.email === email.trim().toLowerCase();
}

export async function sendPasswordSignupEmailOtp(idToken: string) {
  const identity = await requirePasswordIdentity(idToken);
  if (identity.emailVerified || (await isPasswordEmailOtpVerified(identity.uid, identity.email))) {
    return { alreadyVerified: true as const };
  }

  const code = generateSignupOtpCode();
  const now = Date.now();
  await prisma.emailSignupOtp.upsert({
    where: { firebaseUid: identity.uid },
    create: {
      email: identity.email,
      firebaseUid: identity.uid,
      codeHash: hashSignupOtp(identity.uid, identity.email, code),
      expiresAt: new Date(now + EMAIL_OTP_TTL_MS),
      attempts: 0,
    },
    update: {
      email: identity.email,
      codeHash: hashSignupOtp(identity.uid, identity.email, code),
      expiresAt: new Date(now + EMAIL_OTP_TTL_MS),
      attempts: 0,
      consumedAt: null,
    },
  });

  const mail = signupOtpEmail(code);
  const sent = await sendSmtpEmail({ to: identity.email, subject: mail.subject, text: mail.text, html: mail.html });
  if (!sent.ok) {
    throw new AppError(OTP_SEND_FAILED, 502, "OTP_DELIVERY_FAILED");
  }
  return { alreadyVerified: false as const };
}

export async function confirmPasswordSignupEmailOtp(idToken: string, code: string) {
  const identity = await requirePasswordIdentity(idToken);
  if (identity.emailVerified || (await isPasswordEmailOtpVerified(identity.uid, identity.email))) {
    return { verified: true as const };
  }

  const row = await prisma.emailSignupOtp.findUnique({ where: { firebaseUid: identity.uid } });
  const now = new Date();
  if (!row || row.consumedAt || row.expiresAt <= now || row.attempts >= EMAIL_OTP_MAX_ATTEMPTS) {
    throw new AppError(OTP_EXPIRED, 400, "OTP_EXPIRED");
  }

  const normalized = code.replace(/\s+/g, "");
  if (!secureCompare(row.codeHash, hashSignupOtp(identity.uid, identity.email, normalized))) {
    const attempts = row.attempts + 1;
    await prisma.emailSignupOtp.update({
      where: { id: row.id },
      data: { attempts },
    });
    throw new AppError(attempts >= EMAIL_OTP_MAX_ATTEMPTS ? OTP_EXPIRED : OTP_INCORRECT, 400, attempts >= EMAIL_OTP_MAX_ATTEMPTS ? "OTP_EXPIRED" : "OTP_INCORRECT");
  }

  await prisma.emailSignupOtp.update({
    where: { id: row.id },
    data: {
      consumedAt: now,
      verifiedAt: now,
      codeHash: "consumed",
    },
  });
  return { verified: true as const };
}
