import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";
import { EmptyState, StatusBadge } from "@/components/ui/widgets";
import { Input } from "@/components/ui/fields";
import { Button } from "@/components/ui/button";
import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import { Search } from "lucide-react";
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
    <AppShell title="Testers" description="Everyone who has consented to test one of your apps.">
      <form className="mb-5 flex max-w-lg gap-2" role="search">
        <label htmlFor="tester-search" className="sr-only">
          Search testers
        </label>
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
          <Input
            id="tester-search"
            name="q"
            defaultValue={params.q}
            placeholder="Search name or email"
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>
      {testers.length === 0 ? (
        <EmptyState
          title="No testers yet"
          body="Testers appear after a developer consents to share Gmail, or after you add one from a campaign."
        />
      ) : (
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>Source</Th>
                <Th>App</Th>
                <Th>Campaign</Th>
                <Th>Status</Th>
                <Th>Contacted</Th>
                <Th>Opt-in (TestLoop)</Th>
                <Th>Play confirmed</Th>
                <Th>Testing</Th>
              </tr>
            </thead>
            <tbody>
              {testers.map((tester) => {
                const row = tester.campaigns[0];
                const active =
                  row &&
                  ["TESTING", "FEEDBACK_REQUESTED", "FEEDBACK_RECEIVED", "COMPLETED"].includes(row.status);
                return (
                  <Tr key={tester.id}>
                    <Td>
                      <Link
                        className="font-medium text-brand hover:underline"
                        href={`/testers/${tester.id}`}
                      >
                        {tester.name || "Unnamed"}
                      </Link>
                    </Td>
                    <Td className="text-muted">{tester.email || "—"}</Td>
                    <Td className="text-muted">{tester.sourceLabel || "—"}</Td>
                    <Td>{row?.campaign.app.name || "—"}</Td>
                    <Td>{row?.campaign.name || "—"}</Td>
                    <Td>{row ? <StatusBadge status={row.status} /> : "—"}</Td>
                    <Td className="whitespace-nowrap text-muted">{formatDate(row?.dateContacted)}</Td>
                    <Td>{row?.optedIn ? "Recorded in TestLoop" : "—"}</Td>
                    <Td className="whitespace-nowrap text-muted">
                      {row?.accessAdded ? formatDate(row.dateAdded) : "—"}
                    </Td>
                    <Td className="text-muted">{active ? "Activity detected" : "—"}</Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        </TableWrap>
      )}
    </AppShell>
  );
}
