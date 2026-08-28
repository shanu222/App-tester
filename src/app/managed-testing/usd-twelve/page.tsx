import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/auth";
import { listSelectableApps } from "@/lib/services/managed-testing";
import { getUsdTwelvePackage } from "@/lib/services/usd-twelve-package";
import { UsdTwelveCheckoutForm } from "@/components/managed-testing/usd-twelve-checkout-form";
import { ManagedTestingNotice } from "@/components/managed-testing/compliance-notice";
import { Card, CardHeader } from "@/components/ui/card";
import { USD_TWELVE_INCLUDED, formatUsd } from "@/lib/managed-testing/usd-twelve";
import { paddleCheckoutConfigured } from "@/lib/paddle/config";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function UsdTwelvePackagePage() {
  const user = await requireUser();
  const [pack, apps] = await Promise.all([getUsdTwelvePackage(), listSelectableApps(user.id)]);
  if (!pack) notFound();

  return (
    <AppShell title="TestLoop" description="One-time $10 USD purchase · 12 testers · 14 days of managed testing">
      <Card className="max-w-xl">
        <CardHeader title="TestLoop" description="One-time payment. Access starts after Paddle verifies the transaction." />
        <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted">Product</dt>
            <dd className="mt-0.5 font-semibold text-slate-900">TestLoop</dd>
          </div>
          <div>
            <dt className="text-muted">Price</dt>
            <dd className="mt-0.5 font-semibold text-slate-900">{formatUsd(pack.amountPkr)} USD</dd>
          </div>
          <div>
            <dt className="text-muted">Billing</dt>
            <dd className="mt-0.5 font-semibold text-slate-900">One-time payment</dd>
          </div>
        </dl>
        <p className="mt-5 text-sm font-medium text-slate-800">Includes:</p>
        <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
          {USD_TWELVE_INCLUDED.map((item) => (
            <li key={item} className="flex gap-2">
              <span className="text-brand" aria-hidden>
                ✓
              </span>
              {item}
            </li>
          ))}
        </ul>
        <div className="mt-6">
          <UsdTwelveCheckoutForm
            apps={apps}
            paddleReady={paddleCheckoutConfigured()}
            customerEmail={user.email}
          />
        </div>
        <ManagedTestingNotice className="mt-6 flex items-start gap-1 text-sm leading-6 text-muted" />
        <div className="mt-6">
          <Link href="/managed-testing">
            <Button variant="secondary">Back</Button>
          </Link>
        </div>
      </Card>
    </AppShell>
  );
}
