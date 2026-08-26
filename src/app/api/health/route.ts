import { json } from "@/lib/http";
import { googleOAuthConfigured, isDemoMode } from "@/lib/env";
import { firebaseAuthConfigured } from "@/lib/firebase/config";
import { googleLoginCallbackUrl } from "@/lib/canonical";
import { prisma } from "@/lib/db";

/** Reads the exact columns the Google/Firebase login path needs before creating a session. */
async function databaseStatus() {
  try {
    await prisma.user.findFirst({ select: { id: true, role: true, profileCompleted: true } });
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Database check failed." };
  }
  try {
    const migrations = await prisma.$queryRaw<Array<{ migration_name: string; applied: boolean }>>`
      SELECT migration_name, (finished_at IS NOT NULL AND rolled_back_at IS NULL) AS applied
      FROM _prisma_migrations
      ORDER BY started_at
    `;
    return {
      ok: true,
      pendingMigrations: migrations.filter((row) => !row.applied).map((row) => row.migration_name),
    };
  } catch {
    return { ok: true, pendingMigrations: null };
  }
}

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const database = await databaseStatus();
  return json({
    ok: database.ok,
    service: "testloop",
    demoMode: isDemoMode(),
    time: new Date().toISOString(),
    database,
    googleOAuth: {
      configured: googleOAuthConfigured(),
      callbackUrl: googleLoginCallbackUrl(origin),
    },
    firebaseAuth: { configured: firebaseAuthConfigured() },
  });
}
