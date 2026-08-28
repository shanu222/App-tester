import { AppShell } from "@/components/layout/app-shell";
import { requireAdmin } from "@/auth";
import { adminGetPayment } from "@/lib/services/managed-testing";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AdminPaymentReviewForm } from "@/components/managed-testing/admin-payment-review-form";
import { paymentStatusTone, PAYMENT_STATUS_LABELS } from "@/lib/managed-testing/labels";
import { paymentNeedsReview } from "@/lib/managed-testing/methods";
import type { ManagedPaymentStatus } from "@prisma/client";
import { formatDateTime } from "@/lib/utils";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function AdminPaymentReviewPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  await requireAdmin();
  const { publicId } = await params;
  let view;
  try {
    view = await adminGetPayment(publicId);
  } catch {
    notFound();
  }
  const status = view.payment.status as ManagedPaymentStatus;

  return (
    <AppShell title="Review payment" description="Approve only after you have verified the transfer. Approval activates the tester package.">
      <Card className="max-w-3xl">
        <CardHeader
          title={view.payment.packageName}
          description={`${view.developer.name} · ${view.developer.email}`}
          action={
            <Badge tone={paymentStatusTone(status)}>{PAYMENT_STATUS_LABELS[status] || status}</Badge>
          }
        />
        <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted">Testers</dt>
            <dd className="mt-0.5 font-medium text-slate-900">{view.payment.testerCount}</dd>
          </div>
          <div>
            <dt className="text-muted">Amount</dt>
            <dd className="mt-0.5 font-medium text-slate-900">{view.payment.amountLabel}</dd>
          </div>
          <div>
            <dt className="text-muted">Method</dt>
            <dd className="mt-0.5 font-medium text-slate-900">{view.payment.methodLabel || "Not selected"}</dd>
          </div>
          <div>
            <dt className="text-muted">Submitted</dt>
            <dd className="mt-0.5 font-medium text-slate-900">{formatDateTime(view.payment.submittedAt || view.payment.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-muted">TestLoop reference</dt>
            <dd className="mt-0.5 font-mono text-slate-900">{view.payment.transactionReference}</dd>
          </div>
          <div>
            <dt className="text-muted">Developer reference</dt>
            <dd className="mt-0.5 font-mono text-slate-900">{view.payment.developerReference || "—"}</dd>
          </div>
        </dl>
        {view.payment.adminNote ? (
          <p className="mt-4 rounded-control border border-line bg-surface px-3 py-2 text-sm leading-6 text-slate-700">
            {view.payment.adminNote}
          </p>
        ) : null}

        <div className="mt-6">
          <p className="text-sm font-medium text-slate-800">Payment proof</p>
              {view.payment.hasProof ? (
            <div className="mt-3 overflow-hidden rounded-card border border-line bg-surface">
                <img
                  src={`/api/admin/managed-testing/payments/${view.payment.publicId}/proof`}
                  alt="Payment proof"
                  className="max-h-[480px] w-full bg-white object-contain"
                />
              <div className="border-t border-line px-3 py-2">
                <a
                  className="text-sm font-medium text-brand hover:underline"
                  href={`/api/admin/managed-testing/payments/${view.payment.publicId}/proof`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open original file
                </a>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted">No proof file is stored for this payment.</p>
          )}
        </div>

        <div className="mt-6">
          <AdminPaymentReviewForm
            publicId={view.payment.publicId}
            canApprove={status === "PENDING" || status === "PENDING_PAYMENT" || paymentNeedsReview(status)}
            canReject={paymentNeedsReview(status) || status === "PENDING" || status === "PENDING_PAYMENT"}
          />
        </div>
        {view.campaign ? (
          <div className="mt-6">
            <Link href={`/managed-testing/${view.campaign.publicId}`}>
              <Button variant="secondary">Open campaign</Button>
            </Link>
          </div>
        ) : null}
        <div className="mt-4">
          <Link href="/admin/managed-testing" className="text-sm font-medium text-brand hover:underline">
            Back to managed testing
          </Link>
        </div>
      </Card>
    </AppShell>
  );
}
