import { PublicChrome } from "@/components/layout/public-chrome";
import { UsdTwelveConfirmForm } from "@/components/managed-testing/usd-twelve-confirm-form";
import { loadJoinPage } from "@/lib/services/managed-testing";
import { Card, CardHeader } from "@/components/ui/card";
import { SITE_NAME } from "@/lib/site";

export default async function UsdTwelveConfirmPage({
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
            description="Confirm your testing activity. This is tester-reported participation, not a Google Play verified installation."
          />
          <div className="mt-6">
            <UsdTwelveConfirmForm token={token} alreadyConfirmed={page.alreadyConfirmed} />
          </div>
        </Card>
      </main>
    </PublicChrome>
  );
}
