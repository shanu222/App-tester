import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/auth";
import { listSelectableApps } from "@/lib/services/managed-testing";
import { getUsdTwelvePackage } from "@/lib/services/usd-twelve-package";
import { UsdTwelveCheckoutForm } from "@/components/managed-testing/usd-twelve-checkout-form";
import { ManagedTestingNotice } from "@/components/managed-testing/compliance-notice";
import { Card, CardHeader } from "@/components/ui/card";
import { USD_TWELVE_INCLUDED, formatUsd } from "@/lib/managed-testing/usd-twelve";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function UsdTwelvePackagePage() {
  const user = await requireUser();
  const [pack, apps] = await Promise.all([getUsdTwelvePackage(), listSelectableApps(user.id)]);
  if (!pack) notFound();

  return (
    <AppShell
      title="TESTLOOP MANAGED TESTING"
      description="Managed Beta Testing · tester coordination · $10 — 12 Testers — 14 Days"
    >
      <Card className="max-w-xl">
        <CardHeader title="12 Testers — $10 USD — 14 Days" description={`${formatUsd(pack.amountPkr)} · 12 testers · 14 days`} />
        <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted">Testers</dt>
            <dd className="mt-0.5 font-semibold text-slate-900">12 Testers</dd>
          </div>
          <div>
            <dt className="text-muted">Duration</dt>
            <dd className="mt-0.5 font-semibold text-slate-900">14 Days</dd>
          </div>
          <div>
            <dt className="text-muted">Price</dt>
            <dd className="mt-0.5 font-semibold text-slate-900">USD $10</dd>
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
          <UsdTwelveCheckoutForm apps={apps} />
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
