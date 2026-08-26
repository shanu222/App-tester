import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/auth";
import { listPublishedRequests } from "@/lib/services/network";
import { EmptyState } from "@/components/ui/widgets";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { requestFillStatus } from "@/lib/request-status";
import { AppMark } from "@/components/brand/app-mark";
import Link from "next/link";

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
    <AppShell title="Testing Requests">
      <p className="mb-5 max-w-2xl text-sm leading-6 text-slate-400">
        Only registered developers can see this list. Match scores come from reciprocal availability, country, testing
        type, remaining testers, Play connection, and your current testing load.
      </p>
      <div className="mb-6 flex flex-wrap gap-2 text-sm">
        {[
          { href: "/requests", label: "All" },
          { href: "/requests?testingType=CLOSED", label: "Closed testing" },
          { href: "/requests?testingType=INTERNAL", label: "Internal" },
          { href: "/requests?testingType=OPEN", label: "Open" },
          { href: "/requests?reciprocal=1", label: "Reciprocal" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-full border border-slate-800 px-3 py-1 text-slate-300 hover:border-slate-600"
          >
            {item.label}
          </Link>
        ))}
      </div>
      {recommended.length ? (
        <div className="mb-8">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-500">Recommended for you</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {recommended.map((item) => (
              <Link key={item.id} href={`/requests/${item.id}`} className="rounded-xl border border-slate-800 p-4 hover:border-slate-700">
                <div className="font-medium">{item.app.name}</div>
                <p className="mt-1 text-sm text-slate-400">
                  {item.remaining} testers needed · {item.match.score}% match
                </p>
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
                className="rounded-xl border border-slate-800 bg-card p-4 sm:p-5"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <AppMark src={item.app.iconUrl} name={item.app.name} size={48} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-medium">{item.app.name}</h2>
                      <Badge tone={fill.tone}>{fill.label}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-slate-400">
                      {item.owner.name}
                      {item.country ? ` · ${item.country}` : ""} · Android · {item.testingType} testing
                    </p>
                    <p className="mt-2 text-sm text-slate-300">
                      Testers {item.testersReceived} / {item.targetTesters} · Duration {item.durationDays} days
                      {item.reciprocalOpen ? " · Reciprocal open" : ""}
                    </p>
                    {item.description ? (
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-400">{item.description}</p>
                    ) : null}
                  </div>
                  <Link href={`/requests/${item.id}`} className="sm:self-center">
                    <Button>View request</Button>
                  </Link>
                </div>
                <p className="mt-3 text-xs text-slate-500">Posted {formatDate(item.publishedAt)} · {item.match.score}% match</p>
              </article>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
