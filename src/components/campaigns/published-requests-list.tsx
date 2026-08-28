"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionLabel } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/widgets";
import { SourceBadge } from "@/components/ui/source-badge";
import { TestingRequestActionButton } from "@/components/campaigns/testing-request-actions";
import { testingTypeLabel } from "@/lib/campaign-autofill";
import { formatDate } from "@/lib/utils";

export type TestingRequestCardData = {
  id: string;
  name: string;
  status: string;
  published: boolean;
  testingType: string;
  playTrack: string | null;
  targetTesters: number;
  testerCount: number;
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
  if (row.testingType === "OPEN") return `${row.testerCount}`;
  return `${row.testerCount} / ${row.targetTesters}`;
}

function RequestCard({ row }: { row: TestingRequestCardData }) {
  const state = requestState(row);
  const statusLabel =
    state === "active" ? "ACTIVE" : state === "stopped" ? "STOPPED" : state === "archived" ? "ARCHIVED" : "DRAFT";
  const openHref =
    state === "active" && row.publicSlug ? `/test/${row.publicSlug}` : `/campaigns/${row.id}`;

  return (
    <article className="rounded-card border border-line bg-white p-4 shadow-card sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-medium text-slate-900">{row.name}</h3>
          <p className="mt-0.5 text-sm text-slate-700">{row.appName}</p>
          <p className="font-mono text-xs text-muted">{row.packageName}</p>
        </div>
        <Badge tone={state === "active" ? "good" : state === "stopped" ? "warn" : "neutral"}>
          {statusLabel}
        </Badge>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <SourceBadge source="google-play" />
        <span className="text-sm text-slate-700">
          {row.playConnected ? "✓ Connected" : "Not connected"}
        </span>
      </div>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-xs text-muted">Testing</dt>
          <dd className="mt-0.5 text-slate-900">
            {testingTypeLabel(row.testingType)}
            {row.playTrack ? (
              <>
                <br />
                <span className="font-mono text-xs text-muted">Track: {row.playTrack}</span>
              </>
            ) : null}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Testers</dt>
          <dd className="mt-0.5 text-slate-900">{testerLine(row)}</dd>
        </div>
        {state === "archived" ? (
          <div>
            <dt className="text-xs text-muted">Archived on</dt>
            <dd className="mt-0.5 text-slate-900">{formatDate(row.updatedAt)}</dd>
          </div>
        ) : (
          <div>
            <dt className="text-xs text-muted">Status</dt>
            <dd className="mt-0.5 text-slate-900">{statusLabel}</dd>
          </div>
        )}
      </dl>
      <div className="mt-4 flex flex-wrap gap-2">
        {state === "archived" ? (
          <TestingRequestActionButton campaignId={row.id} action="delete" size="sm" redirectTo="/campaigns" />
        ) : (
          <>
            <Link href={openHref}>
              <Button size="sm" variant="secondary">
                Open
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
  const active = requests.filter((row) => requestState(row) === "active" || requestState(row) === "stopped" || requestState(row) === "draft");
  const archived = requests.filter((row) => requestState(row) === "archived");
  const live = active.filter((row) => requestState(row) === "active");
  const stopped = active.filter((row) => requestState(row) !== "active");

  if (!requests.length) {
    return (
      <>
        <SectionLabel className="mb-3 mt-10">Published testing requests</SectionLabel>
        <EmptyState
          title="No testing requests yet"
          body="Publish your first testing request to start finding developers who can test your app."
        />
      </>
    );
  }

  return (
    <div className="mt-10 space-y-8">
      <section>
        <SectionLabel className="mb-3">Published testing requests</SectionLabel>
        <SectionLabel className="mb-3 text-slate-500">Active</SectionLabel>
        <div className="space-y-2.5">
          {live.length === 0 && stopped.length === 0 ? (
            <p className="text-sm text-muted">No active testing requests.</p>
          ) : (
            <>
              {live.map((row) => (
                <RequestCard key={row.id} row={row} />
              ))}
              {stopped.length ? (
                <>
                  <SectionLabel className="mb-3 mt-6 text-slate-500">Stopped</SectionLabel>
                  {stopped.map((row) => (
                    <RequestCard key={row.id} row={row} />
                  ))}
                </>
              ) : null}
            </>
          )}
        </div>
      </section>
      <section>
        <SectionLabel className="mb-3">Archived</SectionLabel>
        <div className="space-y-2.5">
          {archived.length === 0 ? (
            <p className="text-sm text-muted">No archived testing requests.</p>
          ) : (
            archived.map((row) => <RequestCard key={row.id} row={row} />)
          )}
        </div>
      </section>
    </div>
  );
}
