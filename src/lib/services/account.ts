import { prisma } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";

/**
 * Permanently remove a TestLoop user and all of their TestLoop records.
 * Never calls Google Play or other external account APIs.
 */
export async function deleteTestLoopAccount(userId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { id: true, email: true },
  });
  if (!user) throw new NotFoundError("Account not found.");

  await prisma.$transaction(
    async (tx) => {
      const assigned = await tx.managedCampaignTester.findMany({
        where: { campaign: { userId } },
        select: { testerId: true },
      });
      const testerIds = Array.from(new Set(assigned.map((row) => row.testerId)));

      await tx.managedTestingCampaign.deleteMany({ where: { userId } });

      if (testerIds.length) {
        const stillAssigned = await tx.managedCampaignTester.findMany({
          where: { testerId: { in: testerIds } },
          select: { testerId: true },
        });
        const busy = new Set(stillAssigned.map((row) => row.testerId));
        const free = testerIds.filter((id) => !busy.has(id));
        if (free.length) {
          await tx.managedTester.updateMany({
            where: { id: { in: free } },
            data: { currentlyAssigned: false },
          });
        }
      }

      await tx.managedTestingPayment.deleteMany({ where: { userId } });
      await tx.telemetryEvent.deleteMany({ where: { userId } });
      await tx.developerBlock.deleteMany({ where: { blockedId: userId } });
      await tx.verificationToken.deleteMany({ where: { identifier: user.email } });
      await tx.user.delete({ where: { id: userId } });
    },
    { timeout: 60_000 },
  );
}
