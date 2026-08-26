import { prisma } from "@/lib/db";
import { decryptJson, encryptJson } from "@/lib/encryption";
import { isDemoMode } from "@/lib/env";
import type { IntegrationProvider, IntegrationStatus } from "@prisma/client";

export type StoredCredentials = Record<string, string | undefined>;

export async function upsertIntegration(input: {
  userId: string;
  provider: IntegrationProvider;
  status: IntegrationStatus;
  displayName?: string;
  credentials?: StoredCredentials;
  scopes?: string[];
  lastError?: string | null;
  capabilities?: unknown;
  metadata?: unknown;
  externalAccountId?: string;
}) {
  const encryptedCredentials = input.credentials
    ? encryptJson(input.credentials)
    : undefined;
  return prisma.integration.upsert({
    where: { userId_provider: { userId: input.userId, provider: input.provider } },
    update: {
      status: input.status,
      displayName: input.displayName,
      encryptedCredentials,
      scopes: input.scopes,
      lastError: input.lastError ?? null,
      capabilities: input.capabilities as object | undefined,
      metadata: input.metadata as object | undefined,
      externalAccountId: input.externalAccountId,
      lastTestAt: new Date(),
      isDemo: isDemoMode(),
    },
    create: {
      userId: input.userId,
      provider: input.provider,
      status: input.status,
      displayName: input.displayName,
      encryptedCredentials,
      scopes: input.scopes || [],
      lastError: input.lastError ?? null,
      capabilities: input.capabilities as object | undefined,
      metadata: input.metadata as object | undefined,
      externalAccountId: input.externalAccountId,
      isDemo: isDemoMode(),
    },
  });
}

export function readCredentials(encrypted?: string | null): StoredCredentials | null {
  if (!encrypted) return null;
  try {
    return decryptJson<StoredCredentials>(encrypted);
  } catch {
    return null;
  }
}

export async function markIntegrationError(
  userId: string,
  provider: IntegrationProvider,
  error: string,
) {
  await prisma.integration.updateMany({
    where: { userId, provider },
    data: { status: "ERROR", lastError: error },
  });
}

export async function markIntegrationExpired(
  userId: string,
  provider: IntegrationProvider,
) {
  await prisma.integration.updateMany({
    where: { userId, provider },
    data: { status: "EXPIRED", lastError: "Authorization expired. Reconnect this integration." },
  });
  await prisma.notification.create({
    data: {
      userId,
      type: "integration",
      title: `${provider} authorization expired`,
      body: "Reconnect this integration to resume automated workflows.",
      href: "/integrations",
    },
  });
}
