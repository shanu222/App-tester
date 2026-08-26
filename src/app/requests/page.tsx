import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/auth";
import { listPublishedRequests } from "@/lib/services/network";
import { EmptyState } from "@/components/ui/widgets";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
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
    <AppShell title="Find testing requests">
      <p className="mb-5 max-w-2xl text-sm text-slate-400">
        Only registered developers can see this list. Match scores are calculated from reciprocal availability,
        country, testing type, remaining testers, Play connection, and your current testing load.
      </p>
      <div className="mb-6 flex flex-wrap gap-2 text-sm">
        {[
          { href: "/requests", label: "All" },
          { href: "/requests?testingType=CLOSED", label: "Closed testing" },
          { href: "/requests?testingType=INTERNAL", label: "Internal" },
          { href: "/requests?testingType=OPEN", label: "Open" },
          { href: "/requests?reciprocal=1", label: "Reciprocal" },
        ].map((item) => (
          <Link key={item.href} href={item.href} className="rounded-full border border-slate-800 px-3 py-1 text-slate-300">
            {item.label}
          </Link>
        ))}
      </div>
      {recommended.length ? (
        <div className="mb-8">
          <h2 className="mb-3 text-sm uppercase tracking-wide text-slate-400">Recommended for you</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {recommended.map((item) => (
              <Link key={item.id} href={`/requests/${item.id}`} className="rounded-2xl border border-slate-800 p-4">
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
        <EmptyState title="No published requests" body="When other developers publish campaigns, they appear here." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-950/80 text-left text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">App</th>
                <th className="px-4 py-3 font-medium">Developer</th>
                <th className="px-4 py-3 font-medium">Needed</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Duration</th>
                <th className="px-4 py-3 font-medium">Country</th>
                <th className="px-4 py-3 font-medium">Reciprocal</th>
                <th className="px-4 py-3 font-medium">Posted</th>
                <th className="px-4 py-3 font-medium">Match</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((item) => (
                <tr key={item.id} className="border-t border-slate-800">
                  <td className="px-4 py-3">
                    <Link href={`/requests/${item.id}`} className="text-teal-300">
                      {item.app.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{item.owner.name}</td>
                  <td className="px-4 py-3">
                    {item.testersReceived} / {item.targetTesters}
                  </td>
                  <td className="px-4 py-3">{item.testingType}</td>
                  <td className="px-4 py-3">{item.durationDays}d</td>
                  <td className="px-4 py-3">{item.country || "—"}</td>
                  <td className="px-4 py-3">
                    <Badge tone={item.reciprocalOpen ? "good" : "neutral"}>
                      {item.reciprocalOpen ? "Open" : "No"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">{formatDate(item.publishedAt)}</td>
                  <td className="px-4 py-3">{item.match.score}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
