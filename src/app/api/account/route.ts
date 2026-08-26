import { json, handleRouteError } from "@/lib/http";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";

export async function DELETE() {
  try {
    const user = await requireUser();
    await prisma.user.update({
      where: { id: user.id },
      data: {
        deletedAt: new Date(),
        email: `deleted-${user.id}@invalid.local`,
        passwordHash: null,
        name: "Deleted user",
      },
    });
    await prisma.integration.updateMany({
      where: { userId: user.id },
      data: { encryptedCredentials: null, status: "NOT_CONNECTED" },
    });
    await prisma.session.deleteMany({ where: { userId: user.id } });
    return json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
