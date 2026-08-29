import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "../src/lib/errors";
import {
  OTP_EXPIRED,
  OTP_INCORRECT,
  OTP_SEND_FAILED,
} from "../src/lib/auth/firebase-auth-messages";

const { otpStore, sendSmtp, verifyToken, randomIntInclusive } = vi.hoisted(() => {
  const otpStore: {
    row: {
      id: string;
      email: string;
      firebaseUid: string;
      codeHash: string;
      expiresAt: Date;
      attempts: number;
      consumedAt: Date | null;
      verifiedAt: Date | null;
    } | null;
  } = { row: null };
  return {
    otpStore,
    sendSmtp: vi.fn(),
    verifyToken: vi.fn(),
    randomIntInclusive: vi.fn(() => 123456),
  };
});

vi.mock("@/lib/db", () => ({
  prisma: {
    emailSignupOtp: {
      findUnique: vi.fn(async ({ where }: { where: { firebaseUid: string } }) =>
        otpStore.row?.firebaseUid === where.firebaseUid ? otpStore.row : null,
      ),
      upsert: vi.fn(async ({ create, update }: { create: Record<string, unknown>; update: Record<string, unknown> }) => {
        otpStore.row = {
          id: otpStore.row?.id || "otp_1",
          email: String(update.email ?? create.email),
          firebaseUid: String(create.firebaseUid ?? otpStore.row?.firebaseUid),
          codeHash: String(update.codeHash ?? create.codeHash),
          expiresAt: (update.expiresAt ?? create.expiresAt) as Date,
          attempts: Number(update.attempts ?? create.attempts ?? 0),
          consumedAt: (update.consumedAt as Date | null | undefined) ?? null,
          verifiedAt: otpStore.row?.verifiedAt ?? null,
        };
        return otpStore.row;
      }),
      update: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        if (!otpStore.row) throw new Error("missing");
        otpStore.row = { ...otpStore.row, ...data } as typeof otpStore.row;
        return otpStore.row;
      }),
    },
  },
}));

vi.mock("@/lib/smtp", () => ({
  sendSmtpEmail: (...args: unknown[]) => sendSmtp(...args),
}));

vi.mock("@/lib/firebase/verify", () => ({
  verifyFirebaseIdToken: (...args: unknown[]) => verifyToken(...args),
}));

vi.mock("@/lib/crypto", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/lib/crypto")>();
  return { ...actual, randomIntInclusive };
});

const identity = {
  uid: "uid_1",
  email: "dev@example.com",
  emailVerified: false,
  provider: "password",
  providers: ["password"],
};

describe("email/password signup OTP", () => {
  beforeEach(() => {
    otpStore.row = null;
    sendSmtp.mockReset();
    verifyToken.mockReset();
    randomIntInclusive.mockReturnValue(123456);
    verifyToken.mockResolvedValue(identity);
    sendSmtp.mockResolvedValue({ ok: true });
  });

  it("stores a hashed code, emails it, and verifies it once", async () => {
    const { sendPasswordSignupEmailOtp, confirmPasswordSignupEmailOtp, isPasswordEmailOtpVerified } = await import(
      "../src/lib/auth/email-signup-otp"
    );

    await sendPasswordSignupEmailOtp("token");
    expect(sendSmtp).toHaveBeenCalledTimes(1);
    const mailed = sendSmtp.mock.calls[0][0] as { text: string; html: string };
    expect(mailed.text).toContain("123456");
    expect(mailed.html).toContain("123456");
    expect(otpStore.row?.codeHash).toBeTruthy();
    expect(otpStore.row?.codeHash).not.toContain("123456");

    expect(await isPasswordEmailOtpVerified("uid_1", "dev@example.com")).toBe(false);

    await confirmPasswordSignupEmailOtp("token", "123456");
    expect(otpStore.row?.verifiedAt).toBeInstanceOf(Date);
    expect(otpStore.row?.consumedAt).toBeInstanceOf(Date);
    expect(otpStore.row?.codeHash).toBe("consumed");
    expect(await isPasswordEmailOtpVerified("uid_1", "dev@example.com")).toBe(true);

    if (otpStore.row) otpStore.row.verifiedAt = null;
    await expect(confirmPasswordSignupEmailOtp("token", "123456")).rejects.toMatchObject({
      message: OTP_EXPIRED,
      code: "OTP_EXPIRED",
    });
  });

  it("rejects an incorrect code and an expired code", async () => {
    const { sendPasswordSignupEmailOtp, confirmPasswordSignupEmailOtp } = await import(
      "../src/lib/auth/email-signup-otp"
    );

    await sendPasswordSignupEmailOtp("token");
    await expect(confirmPasswordSignupEmailOtp("token", "000000")).rejects.toMatchObject({
      message: OTP_INCORRECT,
      code: "OTP_INCORRECT",
    });

    if (otpStore.row) otpStore.row.expiresAt = new Date(Date.now() - 1000);
    await expect(confirmPasswordSignupEmailOtp("token", "123456")).rejects.toMatchObject({
      message: OTP_EXPIRED,
      code: "OTP_EXPIRED",
    });
  });

  it("replaces the previous code on resend and reports failed delivery", async () => {
    const { sendPasswordSignupEmailOtp, confirmPasswordSignupEmailOtp } = await import(
      "../src/lib/auth/email-signup-otp"
    );

    await sendPasswordSignupEmailOtp("token");
    const firstHash = otpStore.row?.codeHash;
    randomIntInclusive.mockReturnValue(654321);
    await sendPasswordSignupEmailOtp("token");
    expect(otpStore.row?.codeHash).not.toBe(firstHash);
    await expect(confirmPasswordSignupEmailOtp("token", "123456")).rejects.toBeInstanceOf(AppError);
    await confirmPasswordSignupEmailOtp("token", "654321");
    expect(otpStore.row?.verifiedAt).toBeTruthy();

    otpStore.row = null;
    sendSmtp.mockResolvedValue({ ok: false, error: "down" });
    await expect(sendPasswordSignupEmailOtp("token")).rejects.toMatchObject({
      message: OTP_SEND_FAILED,
      code: "OTP_DELIVERY_FAILED",
    });
  });
});
