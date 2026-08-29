import { createHmac, randomBytes } from "crypto";
import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/db";
import { decryptSecret, encryptSecret } from "@/lib/encryption";
import { env } from "@/lib/env";

type PlayDb = Prisma.TransactionClient | PrismaClient;

function vaultPepper() {
  return env.encryptionKey.trim() || env.authSecret;
}

/** HMAC fingerprint of key identity — not reversible to client_email or private_key. */
export function playServiceAccountFingerprint(privateKeyId: string | null, clientEmail: string) {
  return createHmac("sha256", vaultPepper())
    .update(`play-sa:${privateKeyId || ""}:${clientEmail}`)
    .digest("hex");
}

export function maskServiceAccountIdentifier(email: string | null | undefined): string | null {
  const trimmed = email?.trim() || "";
  const at = trimmed.indexOf("@");
  if (at < 1) return null;
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  const suffix = domain.split(".").slice(-2).join(".") || "appspot.com";
  return `${local.slice(0, 1)}••••@••••.${suffix}`;
}

export async function readPlayServiceAccountJson(userId: string): Promise<string | null> {
  const row = await prisma.playServiceAccountSecret.findUnique({
    where: { userId },
    select: { ciphertext: true },
  });
  if (!row?.ciphertext) return null;
  try {
    return decryptSecret(row.ciphertext);
  } catch {
    return null;
  }
}

export async function writePlayServiceAccountJson(input: {
  userId: string;
  json: string;
  fingerprint: string;
}) {
  const existing = await prisma.playServiceAccountSecret.findUnique({
    where: { userId: input.userId },
    select: { id: true },
  });
  const ciphertext = encryptSecret(input.json);
  if (existing) {
    await prisma.playServiceAccountSecret.update({
      where: { id: existing.id },
      data: {
        ciphertext: encryptSecret(randomBytes(32).toString("hex")),
        fingerprint: "",
      },
    });
    await prisma.playServiceAccountSecret.update({
      where: { id: existing.id },
      data: {
        ciphertext,
        fingerprint: input.fingerprint,
        rotatedAt: new Date(),
      },
    });
    return;
  }
  await prisma.playServiceAccountSecret.create({
    data: {
      userId: input.userId,
      ciphertext,
      fingerprint: input.fingerprint,
    },
  });
}

/** Overwrite ciphertext then delete so disconnect/rotation cannot leave a readable copy. */
export async function shredPlayServiceAccountSecret(userId: string, tx: PlayDb = prisma) {
  const row = await tx.playServiceAccountSecret.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!row) return;
  await tx.playServiceAccountSecret.update({
    where: { id: row.id },
    data: {
      ciphertext: encryptSecret(randomBytes(48).toString("hex")),
      fingerprint: "",
    },
  });
  await tx.playServiceAccountSecret.delete({ where: { id: row.id } });
}

export async function playServiceAccountSecretPresent(userId: string) {
  const row = await prisma.playServiceAccountSecret.findUnique({
    where: { userId },
    select: { id: true },
  });
  return Boolean(row);
}
