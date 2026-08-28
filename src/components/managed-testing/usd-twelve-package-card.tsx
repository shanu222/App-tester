import Link from "next/link";
import { Button } from "@/components/ui/button";
import { USD_TWELVE_INCLUDED, formatUsd } from "@/lib/managed-testing/usd-twelve";

export function UsdTwelvePackageCard({ amount }: { amount: number }) {
  return (
    <article className="flex flex-col rounded-card border border-brand bg-white p-5 shadow-card ring-1 ring-brand/20">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-brand">Managed Testing</p>
      <h3 className="mt-1 text-lg font-semibold text-slate-900">12 Testers — $10 USD — 14 Days</h3>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{formatUsd(amount)}</p>
      <p className="mt-1 text-sm text-muted">$10 — 12 Testers — 14 Days</p>
      <p className="mt-3 text-sm leading-6 text-slate-700">
        Managed Beta Testing with tester coordination, invitation emails, and testing evidence collection.
      </p>
      <ul className="mt-4 flex-1 space-y-1.5 text-sm text-slate-700">
        {USD_TWELVE_INCLUDED.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="text-brand" aria-hidden>
              ✓
            </span>
            {item}
          </li>
        ))}
      </ul>
      <Link href="/managed-testing/usd-twelve" className="mt-5">
        <Button className="w-full" type="button">
          BUY FOR $10
        </Button>
      </Link>
    </article>
  );
}
