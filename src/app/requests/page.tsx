import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/auth";
import { listPublishedRequests } from "@/lib/services/network";
import { EmptyState } from "@/components/ui/widgets";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TestingTypeBadge } from "@/components/ui/testing-type-badge";
import { slotsLabel } from "@/lib/public-copy";
import { requestFillStatus } from "@/lib/request-status";
import { AppMark } from "@/components/brand/app-mark";
import { SectionLabel } from "@/components/ui/card";
import Link from "next/link";

const FILTERS: Array<{
  href: string;
  label: string;
  testingType?: string;
  reciprocal?: boolean;
}> = [
  { href: "/requests", label: "All" },
  { href: "/requests?testingType=CLOSED", label: "Closed testing", testingType: "CLOSED" },
  { href: "/requests?testingType=INTERNAL", label: "Internal", testingType: "INTERNAL" },
  { href: "/requests?testingType=OPEN", label: "Open", testingType: "OPEN" },
  { href: "/requests?reciprocal=1", label: "Reciprocal", reciprocal: true },
];

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ testingType?: string; reciprocal?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const requests = await listPublishedRequests(user.id, {
    testingType: params.testingType,
    reciprocal: params.reciprocal === "1",
  });
  const recommended = [...requests].sort((a, b) => b.match.score - a.match.score).slice(0, 3);

  return (
    <AppShell
      title="Testing Requests"
    >
      <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label="Filter requests">
        {FILTERS.map((item) => {
          const active = item.reciprocal
            ? params.reciprocal === "1"
            : params.reciprocal !== "1" && (params.testingType || "") === (item.testingType || "");
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "true" : undefined}
              className={
                active
                  ? "rounded-full border border-brand bg-brand-soft px-3.5 py-1.5 text-[13px] font-medium text-brand"
                  : "rounded-full border border-line bg-white px-3.5 py-1.5 text-[13px] font-medium text-slate-600 shadow-card transition-colors hover:border-line-strong hover:text-slate-900"
              }
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      {recommended.length ? (
        <div className="mb-10">
          <SectionLabel className="mb-3">Recommended for you</SectionLabel>
          <div className="grid gap-3 md:grid-cols-3">
            {recommended.map((item) => (
              <Link
                key={item.id}
                href={`/requests/${item.id}`}
                className="rounded-card border border-line bg-white p-4 shadow-card transition-colors hover:border-brand hover:bg-brand-soft/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="truncate font-medium text-slate-900">{item.app.name}</div>
                  <Badge tone="accent">{item.match.score}%</Badge>
                </div>
                <p className="mt-1.5 text-sm text-muted">{item.remaining} testers needed</p>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
      {requests.length === 0 ? (
        <EmptyState
          title="No testing requests yet"
          body="When other developers publish campaigns, they appear here. You can publish your own request from My Testing Requests."
          action={
            <Link href="/campaigns">
              <Button>Publish a testing request</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {requests.map((item) => {
            const fill = requestFillStatus(item.testersReceived, item.targetTesters);
            return (
              <article
                key={item.id}
                className="rounded-card border border-line bg-white p-4 shadow-card transition-colors hover:border-line-strong sm:p-5"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <AppMark src={item.app.iconUrl} name={item.app.name} size={48} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold text-slate-900">{item.app.name}</h2>
                      <TestingTypeBadge type={item.testingType} />
                      <Badge tone={fill.tone}>{fill.label}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted">
                      by {item.owner.name}
                      {item.country ? ` · ${item.country}` : ""}
                    </p>
                    {item.description ? (
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-body">{item.description}</p>
                    ) : null}
                    <p className="mt-2 text-sm text-slate-700">
                      {slotsLabel(item.remaining, item.targetTesters, item.testersReceived)}
                      {item.durationDays ? ` · ${item.durationDays}-day testing period` : ""}
                    </p>
                  </div>
                  <Link href={`/requests/${item.id}`} className="sm:self-center">
                    <Button className="w-full sm:w-auto">Join Test</Button>
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
