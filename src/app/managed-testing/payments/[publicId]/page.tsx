import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/auth";
import { getPaymentCheckoutForUser } from "@/lib/services/managed-testing";
import { PaymentCheckoutPanel } from "@/components/managed-testing/payment-checkout-panel";
import { ManagedTestingNotice } from "@/components/managed-testing/compliance-notice";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { paymentIsActivated } from "@/lib/managed-testing/methods";
import { isUsdTwelvePackage } from "@/lib/managed-testing/usd-twelve";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function ManagedPaymentPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const user = await requireUser();
  const { publicId } = await params;
  const view = await getPaymentCheckoutForUser(user.id, publicId);
  if (paymentIsActivated(view.payment.status) && view.campaignPublicId) {
    if (isUsdTwelvePackage(view.payment.packageCode)) {
      redirect(`/managed-testing/${view.campaignPublicId}`);
    }
    redirect(`/managed-testing/${view.campaignPublicId}/setup`);
  }

  return (
    <AppShell title="Purchase package" description="Pay the listed amount, then upload proof. TestLoop activates the package only after review.">
      <Card className="max-w-2xl">
        <CardHeader
          title={view.payment.packageName}
          description={`${view.payment.testerCount} managed testers · ${view.payment.amountLabel}`}
        />
        <div className="mt-6">
          <PaymentCheckoutPanel
            payment={view.payment}
            methods={view.methods}
            developerEmail={view.developerEmail}
            whatsapp={view.whatsapp}
            canSubmitProof={view.canSubmitProof}
          />
        </div>
        <ManagedTestingNotice className="mt-6 flex items-start gap-1 text-sm leading-6 text-muted" />
        <div className="mt-6">
          <Link href="/managed-testing">
            <Button variant="secondary">Back to packages</Button>
          </Link>
        </div>
      </Card>
    </AppShell>
  );
}
