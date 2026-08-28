import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/auth";
import { getPaymentCheckoutForUser } from "@/lib/services/managed-testing";
import { PaddlePaymentStatusPoller } from "@/components/managed-testing/paddle-resume-checkout";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { paymentIsActivated } from "@/lib/managed-testing/methods";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function PaddleCheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ payment?: string }>;
}) {
  const user = await requireUser();
  const { payment: paymentPublicId } = await searchParams;
  if (!paymentPublicId) {
    redirect("/managed-testing/usd-twelve");
  }
  const view = await getPaymentCheckoutForUser(user.id, paymentPublicId);
  if (paymentIsActivated(view.payment.status) && view.campaignPublicId) {
    redirect(`/managed-testing/${view.campaignPublicId}`);
  }

  return (
    <AppShell title="TestLoop" description="Confirming your one-time $10 payment.">
      <Card className="max-w-xl">
        <CardHeader title="Payment received" description="TestLoop access is granted only after the server verifies the Paddle transaction." />
        <div className="mt-5">
          <PaddlePaymentStatusPoller paymentPublicId={paymentPublicId} />
        </div>
        <div className="mt-6">
          <Link href="/managed-testing">
            <Button variant="secondary">Back to Managed Testing</Button>
          </Link>
        </div>
      </Card>
    </AppShell>
  );
}
