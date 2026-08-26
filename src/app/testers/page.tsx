import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";
import { EmptyState, StatusBadge } from "@/components/ui/widgets";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

export default async function TestersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; campaignId?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const testers = await prisma.tester.findMany({
    where: {
      userId: user.id,
      ...(params.q
        ? {
            OR: [
              { name: { contains: params.q, mode: "insensitive" } },
              { emailNormalized: { contains: params.q.toLowerCase() } },
            ],
          }
        : {}),
    },
    include: {
      campaigns: { include: { campaign: { include: { app: true } } }, take: 1, orderBy: { updatedAt: "desc" } },
    },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });

  return (
    <AppShell title="Testers">
      <form className="mb-4">
        <input
          name="q"
          defaultValue={params.q}
          placeholder="Search name or email"
          className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
        />
      </form>
      {testers.length === 0 ? (
        <EmptyState title="No testers yet" body="Confirm a Gmail from a reply or add a tester manually." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-950 text-left text-xs uppercase text-slate-400">
              <tr>
                <th className="px-3 py-3">Name</th>
                <th className="px-3 py-3">Email</th>
                <th className="px-3 py-3">Source</th>
                <th className="px-3 py-3">App</th>
                <th className="px-3 py-3">Campaign</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Contacted</th>
                <th className="px-3 py-3">Opt-in</th>
              </tr>
            </thead>
            <tbody>
              {testers.map((tester) => {
                const row = tester.campaigns[0];
                return (
                  <tr key={tester.id} className="border-t border-slate-800">
                    <td className="px-3 py-3">
                      <Link className="text-sky-300" href={`/testers/${tester.id}`}>
                        {tester.name || "Unnamed"}
                      </Link>
                    </td>
                    <td className="px-3 py-3">{tester.email || "—"}</td>
                    <td className="px-3 py-3">{tester.sourceLabel || "—"}</td>
                    <td className="px-3 py-3">{row?.campaign.app.name || "—"}</td>
                    <td className="px-3 py-3">{row?.campaign.name || "—"}</td>
                    <td className="px-3 py-3">{row ? <StatusBadge status={row.status} /> : "—"}</td>
                    <td className="px-3 py-3">{formatDate(row?.dateContacted)}</td>
                    <td className="px-3 py-3">{row?.optedIn ? "Yes" : "Pending"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
