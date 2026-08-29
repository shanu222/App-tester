import { json } from "@/lib/http";
import { googleOAuthConfigured, isDemoMode, smtpConfigured } from "@/lib/env";
import { firebaseAuthConfigured } from "@/lib/firebase/config";
import { credentialsEncryptionConfigured } from "@/lib/encryption";
import { prisma } from "@/lib/db";
import { describePaddleConfig } from "@/lib/paddle/config";

/** Tables written while a Firebase login bootstraps its developer record. */
const LOGIN_TABLES = ["User", "UserSettings", "MessageTemplate"];

async function paddleSchemaStatus() {
  try {
    const columns = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = 'ManagedTestingPayment'
        AND column_name = 'paddleTransactionId'
    `;
    const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = current_schema() AND table_name = 'PaddleWebhookEvent'
    `;
    const enums = await prisma.$queryRaw<Array<{ enumlabel: string }>>`
      SELECT e.enumlabel
      FROM pg_enum e
      JOIN pg_type t ON e.enumtypid = t.oid
      WHERE t.typname = 'ManagedPaymentProvider' AND e.enumlabel = 'PADDLE'
    `;
    return {
      paddleTransactionId: columns.length > 0,
      webhookTable: tables.length > 0,
      providerEnum: enums.length > 0,
    };
  } catch {
    return null;
  }
}

async function databaseStatus() {
  try {
    await prisma.user.findFirst({ select: { id: true, role: true, profileCompleted: true } });
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Database check failed." };
  }

  const status: {
    ok: boolean;
    missingLoginTables?: string[] | null;
    pendingMigrations?: string[] | null;
  } = { ok: true };

  try {
    const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name FROM information_schema.tables WHERE table_schema = current_schema()
    `;
    const present = new Set(tables.map((row) => row.table_name));
    status.missingLoginTables = LOGIN_TABLES.filter((table) => !present.has(table));
  } catch {
    status.missingLoginTables = null;
  }

  try {
    const migrations = await prisma.$queryRaw<Array<{ migration_name: string; applied: boolean }>>`
      SELECT migration_name, (finished_at IS NOT NULL AND rolled_back_at IS NULL) AS applied
      FROM _prisma_migrations
      ORDER BY started_at
    `;
    status.pendingMigrations = migrations.filter((row) => !row.applied).map((row) => row.migration_name);
  } catch {
    status.pendingMigrations = null;
  }

  status.ok = !status.missingLoginTables?.length;
  return status;
}

export async function GET() {
  const database = await databaseStatus();
  return json({
    ok: database.ok,
    service: "testloop",
    demoMode: isDemoMode(),
    time: new Date().toISOString(),
    database,
    // Login is Firebase-only. Google Cloud OAuth is for Gmail and Play access.
    signIn: { provider: "firebase", configured: firebaseAuthConfigured() },
    googleApiAccess: { configured: googleOAuthConfigured() },
    credentialsAtRest: { configured: credentialsEncryptionConfigured() },
    smtp: { configured: smtpConfigured() },
    paddle: { ...describePaddleConfig(), schema: await paddleSchemaStatus() },
  });
}
