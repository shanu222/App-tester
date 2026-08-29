import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/auth";
import { getPaymentCheckoutForUser } from "@/lib/services/managed-testing";
import { PaymentCheckoutPanel } from "@/components/managed-testing/payment-checkout-panel";
import { PaddleResumeCheckout } from "@/components/managed-testing/paddle-resume-checkout";
import { ManagedTestingNotice } from "@/components/managed-testing/compliance-notice";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { paymentIsActivated } from "@/lib/managed-testing/methods";
import { paddleCheckoutConfigured } from "@/lib/paddle/config";
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
  const paddleCheckout = view.payment.paddleCheckout && paddleCheckoutConfigured() && view.canSubmitProof;

  return (
    <AppShell
      title={paddleCheckout ? "TestLoop" : "Purchase package"}
      description={
        paddleCheckout
          ? "Complete the one-time $10 Paddle checkout. TestLoop activates access only after the transaction is verified."
          : "Pay $10 USD, then upload proof. An administrator must confirm before testers are invited."
      }
    >
      <Card className="max-w-2xl">
        <CardHeader
          title={paddleCheckout ? "TestLoop" : view.payment.packageName}
          description={
            paddleCheckout
              ? `${view.payment.amountLabel} · one-time payment`
              : `${view.payment.testerCount} managed testers · ${view.payment.amountLabel}`
          }
        />
        <div className="mt-6 space-y-6">
          {paddleCheckout ? (
            <div className="space-y-3">
              <PaddleResumeCheckout paymentPublicId={view.payment.publicId} customerEmail={view.developerEmail} />
              <p className="text-sm text-muted">
                Or pay with a wallet and upload proof. An administrator must confirm wallet payments before testers are
                invited.
              </p>
            </div>
          ) : null}
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
