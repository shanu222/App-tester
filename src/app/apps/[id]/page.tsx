import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/auth";
import { getApp } from "@/lib/services/apps";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default async function AppDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const app = await getApp(user.id, id);
  const campaign = app.campaigns.find((item) => item.status === "ACTIVE") || app.campaigns[0];
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
              className="rounded-lg bg-teal-500 px-3 py-2 text-sm font-medium text-slate-950"
            >
              Open Google Play
            </a>
          ) : null}
          <Link
            href={campaign ? `/campaigns/${campaign.id}` : `/campaigns?appId=${app.id}`}
            className="rounded-lg border border-slate-700 px-3 py-2 text-sm"
          >
            Manage Testing
          </Link>
        </div>
      }
    >
      <p className="text-slate-400">{app.packageName}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Badge>{app.googlePlayStatus.replaceAll("_", " ")}</Badge>
        <Badge>{app.testingType}</Badge>
        {app.syncedFromPlay ? <Badge tone="good">Synced</Badge> : <Badge>Manual</Badge>}
      </div>
      <div className="mt-4 space-y-1 text-sm text-slate-400">
        <div>Google Play: {app.playStoreUrl || "Not stored"}</div>
        <div>Testing / opt-in: {app.webOptInUrl || "Not configured — not invented"}</div>
        <div>Target testers: {app.testerTarget}</div>
      </div>
      {app.playConflictNote ? (
        <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
          {app.playConflictNote}
        </p>
      ) : null}
      <div className="mt-6 rounded-2xl border border-slate-800 p-5">
        <h2 className="font-medium">Tracks</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {app.tracks.length === 0 ? <li className="text-slate-500">No tracks stored yet.</li> : null}
          {app.tracks.map((track) => (
            <li key={track.id}>
              {track.name} · {track.testingType} · {track.googleGroupEmail || "no group"}
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-6">
        <h2 className="font-medium">Campaigns</h2>
        <ul className="mt-3 space-y-2">
          {app.campaigns.map((item) => (
            <li key={item.id}>
              <Link className="text-sky-300" href={`/campaigns/${item.id}`}>
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </AppShell>
  );
}
