import { json, handleRouteError } from "@/lib/http";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const user = await requireUser();
    const integrations = await prisma.integration.findMany({
      where: { userId: user.id },
    });
    return json({
      integrations: integrations.map((item) => ({
        id: item.id,
        provider: item.provider,
        status: item.status,
        displayName: item.displayName,
        lastSyncAt: item.lastSyncAt,
        lastTestAt: item.lastTestAt,
        lastError: item.lastError,
        capabilities: item.capabilities,
        scopes: item.scopes,
      })),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get("provider");
    if (!provider) return json({ error: "provider required" }, 400);
    await prisma.integration.updateMany({
      where: { userId: user.id, provider: provider as never },
      data: {
        status: "NOT_CONNECTED",
        encryptedCredentials: null,
        lastError: null,
        displayName: null,
      },
    });
    return json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
