import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/auth";
import { getPaymentForUser } from "@/lib/services/managed-testing";
import { CheckoutActions } from "@/components/managed-testing/checkout-actions";
import { ManagedTestingNotice } from "@/components/managed-testing/compliance-notice";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function ManagedPaymentPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const user = await requireUser();
  const { publicId } = await params;
  const view = await getPaymentForUser(user.id, publicId);
  if (view.payment.status === "PAID" && view.campaignPublicId) {
    redirect(`/managed-testing/${view.campaignPublicId}/setup`);
  }

  return (
    <AppShell title="Checkout" description="Confirm your managed testing package.">
      <Card className="max-w-xl">
        <CardHeader title="Package" description={view.payment.packageName} />
        <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted">Managed testers</dt>
            <dd className="mt-0.5 font-medium text-slate-900">{view.payment.testerCount}</dd>
          </div>
          <div>
            <dt className="text-muted">Testing support included</dt>
            <dd className="mt-0.5 font-medium text-slate-900">Recruitment, invitations, tracking, reports</dd>
          </div>
          <div>
            <dt className="text-muted">Price</dt>
            <dd className="mt-0.5 font-medium text-slate-900">{view.payment.amountLabel}</dd>
          </div>
          <div>
            <dt className="text-muted">Reference</dt>
            <dd className="mt-0.5 font-mono text-slate-900">{view.payment.transactionReference}</dd>
          </div>
        </dl>
        <div className="mt-6">
          <p className="text-sm font-medium text-slate-800">Payment status</p>
          <div className="mt-2">
            <CheckoutActions
              publicId={view.payment.publicId}
              status={view.payment.status}
              stubAllowed={view.stubAllowed}
            />
          </div>
        </div>
        {view.payment.status === "PENDING" && !view.stubAllowed ? (
          <p className="mt-4 text-sm leading-6 text-muted">
            {view.payee.name}. {view.payee.details} Quote {view.payment.transactionReference} with your transfer.
          </p>
        ) : null}
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
