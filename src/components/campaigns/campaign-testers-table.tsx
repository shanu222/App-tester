"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/fields";
import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { EmptyState, StatusBadge } from "@/components/ui/widgets";
import type { TesterStatus } from "@prisma/client";
import { CopyButton } from "@/components/ui/copy-button";
import { formatPlayTimestamp } from "@/components/play/play-connection-panel";

export type CampaignTesterRow = {
  id: string;
  testerId: string;
  name: string | null;
  email: string | null;
  status: TesterStatus;
  joinedAt: string | null;
  lastActivityAt: string | null;
};

export function CampaignTestersTable({ testers }: { testers: CampaignTesterRow[] }) {
  const [query, setQuery] = useState("");
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return testers;
    return testers.filter(
      (row) =>
        (row.email || "").toLowerCase().includes(needle) ||
        (row.name || "").toLowerCase().includes(needle),
    );
  }, [query, testers]);

  if (testers.length === 0) {
    return (
      <EmptyState
        title="No tester records yet"
        body="Testers appear here when they join the TestLoop testing page or when you add them."
      />
    );
  }

  return (
    <div>
      <div className="relative mb-3 max-w-sm">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          aria-hidden
        />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search tester…"
          aria-label="Search testers"
          className="pl-9"
        />
      </div>
      <TableWrap>
        <Table>
          <thead>
            <tr>
              <Th>Gmail</Th>
              <Th>Status</Th>
              <Th>Joined</Th>
              <Th>Last activity</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <Tr key={row.id}>
                <Td>
                  <Link className="font-medium text-brand hover:underline" href={`/testers/${row.testerId}`}>
                    {row.email || row.name || "Unnamed"}
                  </Link>
                </Td>
                <Td>
                  <StatusBadge status={row.status} />
                </Td>
                <Td className="text-muted">{formatPlayTimestamp(row.joinedAt) || "—"}</Td>
                <Td className="text-muted">{formatPlayTimestamp(row.lastActivityAt) || "—"}</Td>
                <Td>
                  {row.email ? <CopyButton value={row.email} label="Copy email" /> : "—"}
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </TableWrap>
      {visible.length === 0 ? <p className="mt-3 text-sm text-muted">No testers match that search.</p> : null}
    </div>
  );
}
