import { createHash, randomBytes, randomInt, timingSafeEqual } from "crypto";

export function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function contentHash(value: string) {
  return sha256(value.trim().replace(/\s+/g, " ").toLowerCase());
}

export function randomToken(bytes = 32) {
  return randomBytes(bytes).toString("hex");
}

export function hourKey(date = new Date()) {
  return date.toISOString().slice(0, 13);
}

export function dayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function randomId(prefix = "") {
  return `${prefix}${randomBytes(8).toString("hex")}`;
}

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function secureCompare(a: string, b: string) {
  const left = Buffer.from(sha256(a));
  const right = Buffer.from(sha256(b));
  return left.length === right.length && timingSafeEqual(left, right);
}

export function randomIntInclusive(min: number, max: number) {
  return randomInt(min, max + 1);
}
