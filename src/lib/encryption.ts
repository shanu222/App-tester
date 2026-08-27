import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";
import { env } from "./env";

const ALGO = "aes-256-gcm";
const INSECURE_AUTH_SECRET = "dev-only-insecure-secret-change-me";

function keyMaterial() {
  const configured = env.encryptionKey.trim();
  if (configured) return configured;
  // Hosts that already have AUTH_SECRET (required for sessions) can encrypt
  // Play credentials without a separate ENCRYPTION_KEY. Prefer setting
  // ENCRYPTION_KEY explicitly; changing it later requires reconnecting Play.
  if (env.authSecret && env.authSecret !== INSECURE_AUTH_SECRET) return env.authSecret;
  return "";
}

function keyBuffer() {
  const raw = keyMaterial();
  if (!raw) {
    if (env.nodeEnv === "production") {
      throw new Error("ENCRYPTION_KEY is required in production.");
    }
    return scryptSync("testerbridge-dev-only-key", "testerbridge", 32);
  }
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    return Buffer.from(raw, "hex");
  }
  return scryptSync(raw, "testerbridge-encryption", 32);
}

/** True when Play/Gmail credentials can be encrypted at rest on this server. */
export function credentialsEncryptionConfigured() {
  return Boolean(keyMaterial()) || env.nodeEnv !== "production";
}

export function encryptSecret(plaintext: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, keyBuffer(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptSecret(payload: string) {
  const [ivHex, tagHex, dataHex] = payload.split(":");
  if (!ivHex || !tagHex || !dataHex) {
    throw new Error("Invalid encrypted payload.");
  }
  const decipher = createDecipheriv(ALGO, keyBuffer(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataHex, "hex")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

export function encryptJson(value: unknown) {
  return encryptSecret(JSON.stringify(value));
}

export function decryptJson<T>(payload: string): T {
  return JSON.parse(decryptSecret(payload)) as T;
}
