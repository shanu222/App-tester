import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";
import { EmptyState, StatusBadge } from "@/components/ui/widgets";
import { Input } from "@/components/ui/fields";
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
      <form className="mb-4" role="search">
        <label htmlFor="tester-search" className="sr-only">
          Search testers
        </label>
        <Input
          id="tester-search"
          name="q"
          defaultValue={params.q}
          placeholder="Search name or email"
          className="max-w-md"
        />
      </form>
      {testers.length === 0 ? (
        <EmptyState
          title="No testers yet"
          body="Testers appear after a developer consents to share Gmail, or after you add one from a campaign."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
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
                <th className="px-3 py-3">Added</th>
                <th className="px-3 py-3">Testing</th>
              </tr>
            </thead>
            <tbody>
              {testers.map((tester) => {
                const row = tester.campaigns[0];
                return (
                  <tr key={tester.id} className="border-t border-slate-800">
                    <td className="px-3 py-3">
                      <Link className="text-emerald-300 hover:underline" href={`/testers/${tester.id}`}>
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
                    <td className="px-3 py-3">{formatDate(row?.dateAdded || tester.createdAt)}</td>
                    <td className="px-3 py-3">
                      {row && ["TESTING", "FEEDBACK_REQUESTED", "FEEDBACK_RECEIVED", "COMPLETED"].includes(row.status)
                        ? "Activity detected"
                        : "—"}
                    </td>
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
