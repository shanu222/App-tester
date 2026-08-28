import { PublicChrome } from "@/components/layout/public-chrome";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { previewUsdTwelvePaymentConfirm } from "@/lib/services/usd-twelve-payment-confirm";

export default async function ConfirmUsdTwelvePaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; status?: string; ref?: string }>;
}) {
  const params = await searchParams;
  if (params.status === "confirmed" || params.status === "already") {
    return (
      <PublicChrome>
        <main className="mx-auto max-w-lg px-4 py-16">
          <Card>
            <CardHeader
              title={params.status === "already" ? "Payment already confirmed" : "Payment confirmed"}
              description="The 12 Tester / 14 Days package is active. Tester invitation emails are sent only after this confirmation."
            />
            {params.ref ? (
              <p className="mt-4 font-mono text-sm text-slate-700">TestLoop reference: {params.ref}</p>
            ) : null}
          </Card>
        </main>
      </PublicChrome>
    );
  }
  if (params.status === "invalid") {
    return (
      <PublicChrome>
        <main className="mx-auto max-w-lg px-4 py-16">
          <Card>
            <CardHeader
              title="Confirmation unavailable"
              description="This confirmation link is invalid, expired, or does not match the payment."
            />
          </Card>
        </main>
      </PublicChrome>
    );
  }

  let preview;
  try {
    preview = await previewUsdTwelvePaymentConfirm(params.token || "");
  } catch {
    return (
      <PublicChrome>
        <main className="mx-auto max-w-lg px-4 py-16">
          <Card>
            <CardHeader
              title="Confirmation unavailable"
              description="This confirmation link is invalid, expired, or does not match the payment."
            />
          </Card>
        </main>
      </PublicChrome>
    );
  }

  if (preview.alreadyConfirmed) {
    return (
      <PublicChrome>
        <main className="mx-auto max-w-lg px-4 py-16">
          <Card>
            <CardHeader
              title="Payment already confirmed"
              description="This payment was already confirmed. The confirmation link cannot be used again."
            />
            <p className="mt-4 font-mono text-sm text-slate-700">TestLoop reference: {preview.transactionReference}</p>
          </Card>
        </main>
      </PublicChrome>
    );
  }

  return (
    <PublicChrome>
      <main className="mx-auto max-w-lg px-4 py-16">
        <Card>
          <CardHeader
            title="Confirm payment"
            description="Verify the transfer against the receiving account, then confirm. This activates the 12 Tester / 14 Days package."
          />
          <dl className="mt-5 space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Developer</dt>
              <dd className="font-medium text-slate-900">{preview.developerName}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Email</dt>
              <dd className="font-medium text-slate-900">{preview.developerEmail}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">App</dt>
              <dd className="font-medium text-slate-900">{preview.appName}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Package</dt>
              <dd className="font-medium text-slate-900">12 Testers / 14 Days</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Amount</dt>
              <dd className="font-medium text-slate-900">{preview.amountLabel}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Method</dt>
              <dd className="font-medium text-slate-900">{preview.methodLabel}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Reference</dt>
              <dd className="font-mono text-slate-900">{preview.transactionReference}</dd>
            </div>
          </dl>
          <form className="mt-6" method="post" action="/api/admin/managed-testing/confirm-payment">
            <input type="hidden" name="token" value={preview.token} />
            <Button className="w-full" type="submit">
              CONFIRM PAYMENT
            </Button>
          </form>
        </Card>
      </main>
    </PublicChrome>
  );
}
