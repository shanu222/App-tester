"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionLabel } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/widgets";
import { TestingRequestActionButton } from "@/components/campaigns/testing-request-actions";
import { TestingTypeBadge } from "@/components/ui/testing-type-badge";
import { FilterButtons } from "@/components/ui/filter-pills";

export type TestingRequestCardData = {
  id: string;
  name: string;
  status: string;
  published: boolean;
  testingType: string;
  playTrack: string | null;
  targetTesters: number;
  testerCount: number;
  durationDays: number;
  publicSlug: string | null;
  updatedAt: string;
  pausedAt: string | null;
  appName: string;
  packageName: string;
  playConnected: boolean;
};

function requestState(row: TestingRequestCardData) {
  if (row.status === "ARCHIVED" || row.status === "COMPLETED") return "archived" as const;
  if (row.status === "PAUSED" || (row.status === "ACTIVE" && !row.published)) return "stopped" as const;
  if (row.published && row.status === "ACTIVE") return "active" as const;
  return "draft" as const;
}

function testerLine(row: TestingRequestCardData) {
  if (row.testerCount <= 0) return `${row.targetTesters} testing slots available`;
  return `${row.testerCount} / ${row.targetTesters} testers`;
}

function RequestCard({ row }: { row: TestingRequestCardData }) {
  const state = requestState(row);
  const statusLabel =
    state === "active" ? "ACTIVE" : state === "stopped" ? "STOPPED" : state === "archived" ? "ARCHIVED" : "DRAFT";
  const openHref =
    state === "active" && row.publicSlug ? `/test/${row.publicSlug}` : `/campaigns/${row.id}`;

  return (
    <article className="rounded-card border border-line bg-white p-4 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-medium text-slate-900">{row.appName}</h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <TestingTypeBadge type={row.testingType} />
            {row.playTrack ? <span className="text-xs text-muted">{row.playTrack}</span> : null}
          </div>
        </div>
        <Badge tone={state === "active" ? "good" : state === "stopped" ? "warn" : "neutral"}>
          {statusLabel}
        </Badge>
      </div>
      <p className="mt-3 text-sm text-slate-700">
        {testerLine(row)}
        {row.durationDays ? ` · ${row.durationDays} days` : ""}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {state === "archived" ? (
          <TestingRequestActionButton campaignId={row.id} action="delete" size="sm" redirectTo="/campaigns" />
        ) : (
          <>
            <Link href={openHref}>
              <Button size="sm" variant="secondary">
                View
              </Button>
            </Link>
            <Link href={`/campaigns/${row.id}`}>
              <Button size="sm" variant="secondary">
                Manage
              </Button>
            </Link>
            {state === "active" ? (
              <TestingRequestActionButton campaignId={row.id} action="stop" size="sm" />
            ) : null}
            <TestingRequestActionButton campaignId={row.id} action="archive" size="sm" />
          </>
        )}
      </div>
    </article>
  );
}

export function PublishedRequestsList({ requests }: { requests: TestingRequestCardData[] }) {
  const [filter, setFilter] = useState<"all" | "active" | "stopped" | "archived">("all");
  const live = requests.filter((row) => requestState(row) === "active");
  const stopped = requests.filter((row) => requestState(row) === "stopped" || requestState(row) === "draft");
  const archived = requests.filter((row) => requestState(row) === "archived");
  const visible =
    filter === "active" ? live : filter === "stopped" ? stopped : filter === "archived" ? archived : requests;

  if (!requests.length) {
    return (
      <>
        <SectionLabel className="mb-3 mt-10">Published testing requests</SectionLabel>
        <EmptyState title="No testing requests yet" body="Publish a request to start finding testers." />
      </>
    );
  }

  return (
    <div className="mt-10 space-y-4">
      <SectionLabel>Published testing requests</SectionLabel>
      <FilterButtons
        items={[
          { id: "all", label: "All", active: filter === "all", onClick: () => setFilter("all") },
          { id: "active", label: "Active", active: filter === "active", onClick: () => setFilter("active") },
          { id: "stopped", label: "Stopped", active: filter === "stopped", onClick: () => setFilter("stopped") },
          { id: "archived", label: "Archived", active: filter === "archived", onClick: () => setFilter("archived") },
        ]}
      />
      <div className="space-y-2.5">
        {visible.length === 0 ? (
          <p className="text-sm text-muted">No requests in this view.</p>
        ) : (
          visible.map((row) => <RequestCard key={row.id} row={row} />)
        )}
      </div>
    </div>
  );
}
