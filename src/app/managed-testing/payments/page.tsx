import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/auth";
import { listDeveloperPayments, listManagedPackages } from "@/lib/services/managed-testing";
import { PaymentsPackagesPanel } from "@/components/managed-testing/payments-packages-panel";
import { UsdTwelvePackageCard } from "@/components/managed-testing/usd-twelve-package-card";
import { ManagedTestingNotice } from "@/components/managed-testing/compliance-notice";
import { Card, CardHeader, SectionLabel } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/widgets";
import { Button } from "@/components/ui/button";
import { walletPurchaseMethods } from "@/lib/managed-testing/methods";
import Link from "next/link";

export default async function ManagedTestingPaymentsPage() {
  const user = await requireUser();
  const [packages, billing] = await Promise.all([listManagedPackages(), listDeveloperPayments(user.id)]);
  const wallets = walletPurchaseMethods();

  return (
    <AppShell
      title="Payments & Packages"
      description="Managed Testing purchases, payment methods, and package status."
    >
      <ManagedTestingNotice />

      <div className="mt-6">
        <PaymentsPackagesPanel
          payments={billing.payments}
          activePackage={billing.activePackage}
          allocation={billing.allocation}
        />
      </div>

      <div className="mt-8">
        <SectionLabel className="mb-3">Payment methods</SectionLabel>
        <Card>
          <CardHeader
            title="Pay for TestLoop"
            description="Same $10 Managed Testing package. Choose Paddle or a wallet transfer. The amount cannot be changed."
            action={
              <Link href="/managed-testing/usd-twelve">
                <Button size="sm">Choose a method</Button>
              </Link>
            }
          />
          <ul className="mt-5 grid gap-2 sm:grid-cols-2">
            <li className="rounded-control border border-line bg-surface px-3 py-2 text-sm text-slate-800">
              <span className="font-medium">Paddle</span>
              <span className="mt-0.5 block text-xs text-muted">$10 USD · Secure online checkout</span>
            </li>
            {wallets.map((item) => (
              <li
                key={item.id}
                className="rounded-control border border-line bg-surface px-3 py-2 text-sm text-slate-800"
              >
                <span className="font-medium">{item.shortLabel}</span>
                <span className="mt-0.5 block text-xs text-muted">
                  {item.kind === "crypto" ? `USDT on ${item.network}` : "Manual transfer, then upload proof"}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="mt-10">
        <SectionLabel className="mb-3">Managed Testing package</SectionLabel>
        {packages.length === 0 ? (
          <EmptyState title="Packages unavailable" body="Managed testing packages are not listed yet." />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {packages.map((pack) => (
              <UsdTwelvePackageCard key={pack.code} amount={pack.amountPkr} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
