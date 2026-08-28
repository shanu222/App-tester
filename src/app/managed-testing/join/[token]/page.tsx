import { PublicChrome } from "@/components/layout/public-chrome";
import { TesterJoinForm } from "@/components/managed-testing/tester-join-form";
import { loadJoinPage } from "@/lib/services/managed-testing";
import { Card, CardHeader } from "@/components/ui/card";
import { SITE_NAME } from "@/lib/site";

export default async function ManagedJoinPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  let page;
  try {
    page = await loadJoinPage(token);
  } catch {
    return (
      <PublicChrome>
        <main className="mx-auto max-w-lg px-4 py-16">
          <Card>
            <CardHeader title="Invitation unavailable" description="This link is invalid or has expired." />
          </Card>
        </main>
      </PublicChrome>
    );
  }

  return (
    <PublicChrome>
      <main className="mx-auto max-w-lg px-4 py-16">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-brand">{SITE_NAME}</p>
        <Card className="mt-4">
          <CardHeader
            title={`Test ${page.appName}`}
            description={`Hi ${page.testerName}. You were invited to a ${page.testingTypeLabel.toLowerCase()} programme.`}
          />
          {page.instructions ? <p className="mt-4 text-sm leading-6 text-slate-700">{page.instructions}</p> : null}
          <div className="mt-6">
            <TesterJoinForm token={token} joinUrl={page.joinUrl} alreadyConfirmed={page.alreadyConfirmed} />
          </div>
        </Card>
      </main>
    </PublicChrome>
  );
}
