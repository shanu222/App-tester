import { createHmac, timingSafeEqual } from "crypto";
import { env } from "@/lib/env";
import { randomToken, sha256 } from "@/lib/crypto";

export const PAYMENT_CONFIRM_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type PaymentConfirmPayload = {
  v: 1;
  pid: string;
  exp: number;
  n: string;
};

function signBody(body: string) {
  return createHmac("sha256", env.authSecret).update(body).digest("base64url");
}

function signaturesMatch(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function issuePaymentConfirmToken(paymentPublicId: string, now = Date.now()) {
  const nonce = randomToken(32);
  const payload: PaymentConfirmPayload = {
    v: 1,
    pid: paymentPublicId,
    exp: Math.floor((now + PAYMENT_CONFIRM_TTL_MS) / 1000),
    n: nonce,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return {
    token: `${body}.${signBody(body)}`,
    nonceHash: sha256(nonce),
    expiresAt: new Date(payload.exp * 1000),
  };
}

export function verifyPaymentConfirmToken(token: string, now = Date.now()): PaymentConfirmPayload | null {
  const trimmed = token.trim();
  const dot = trimmed.lastIndexOf(".");
  if (dot <= 0) return null;
  const body = trimmed.slice(0, dot);
  const sig = trimmed.slice(dot + 1);
  if (!body || !sig || !signaturesMatch(signBody(body), sig)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as PaymentConfirmPayload;
    if (parsed.v !== 1 || typeof parsed.pid !== "string" || typeof parsed.n !== "string") return null;
    if (!Number.isFinite(parsed.exp) || parsed.exp * 1000 <= now) return null;
    if (!parsed.pid || !parsed.n) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function paymentConfirmNonceHash(nonce: string) {
  return sha256(nonce);
}
