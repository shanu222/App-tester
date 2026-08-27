import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/auth";
import { getApp } from "@/lib/services/apps";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import Link from "next/link";

export default async function AppDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const app = await getApp(user.id, id);
  return (
    <AppShell
      title={app.name}
      actions={
        <div className="flex gap-2">
          {app.playStoreUrl ? (
            <a
              href={app.playStoreUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9.5 items-center rounded-control bg-brand px-4 text-sm font-medium text-white shadow-card transition-colors hover:bg-brand-hover"
            >
              Open Google Play
            </a>
          ) : null}
          <Link href={`/campaigns?appId=${app.id}`}>
            <Button variant="secondary">Create testing campaign</Button>
          </Link>
          <Link href="/play">
            <Button variant="ghost">Google Play</Button>
          </Link>
        </div>
      }
    >
      <section className="rounded-card border border-line bg-white p-5 shadow-card sm:p-6">
        <p className="font-mono text-sm text-muted">{app.packageName}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge tone="accent">{app.googlePlayStatus.replaceAll("_", " ")}</Badge>
          <Badge>{app.testingType}</Badge>
          {app.syncedFromPlay ? <Badge tone="good">Synced from Play</Badge> : <Badge>Manual entry</Badge>}
        </div>

        <dl className="mt-5 grid gap-4 border-t border-line pt-5 text-sm sm:grid-cols-3">
          <div className="min-w-0">
            <dt className="text-xs font-medium text-muted">Google Play URL</dt>
            <dd className="mt-1 break-all text-slate-700">{app.playStoreUrl || "Not stored"}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-xs font-medium text-muted">Testing / opt-in URL</dt>
            <dd className="mt-1 break-all text-slate-700">
              {app.webOptInUrl || "Not configured — not invented"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted">Target testers</dt>
            <dd className="mt-1 font-semibold text-slate-900 tabular-nums">{app.testerTarget}</dd>
          </div>
        </dl>
      </section>

      {app.playConflictNote ? (
        <p className="mt-4 rounded-card border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
          {app.playConflictNote}
        </p>
      ) : null}

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Tracks" description="Testing tracks synced or configured for this app." />
          {app.tracks.length === 0 ? (
            <p className="mt-4 text-sm text-muted">No tracks stored yet.</p>
          ) : (
            <ul className="mt-4 space-y-2.5">
              {app.tracks.map((track) => (
                <li
                  key={track.id}
                  className="rounded-control border border-line bg-surface px-3.5 py-2.5 text-sm"
                >
                  <span className="font-medium text-slate-900">{track.name}</span>
                  <span className="text-muted">
                    {" "}
                    · {track.testingType}
                    {track.syncedFromPlay ? " · synced from Play" : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Campaigns" description="Testing requests published for this app." />
          {app.campaigns.length === 0 ? (
            <p className="mt-4 text-sm text-muted">No campaigns for this app yet.</p>
          ) : (
            <ul className="mt-4 space-y-2.5">
              {app.campaigns.map((item) => (
                <li key={item.id}>
                  <Link
                    className="block rounded-control border border-line bg-surface px-3.5 py-2.5 text-sm font-medium text-brand transition-colors hover:border-brand"
                    href={`/campaigns/${item.id}`}
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
