"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MANAGED_TESTING_INCLUDED, formatPkr, packageHeadline } from "@/lib/managed-testing/catalog";
import { cn } from "@/lib/utils";

type Pack = {
  code: string;
  name: string;
  testerCount: number;
  amountPkr: number;
  contactOnly: boolean;
};

export function PackageCards({ packages }: { packages: Pack[] }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function buy(pack: Pack) {
    if (pack.contactOnly) {
      router.push("/contact?topic=managed-testing");
      return;
    }
    setPending(pack.code);
    setError(null);
    const response = await fetch("/api/managed-testing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "checkout", packageCode: pack.code }),
    });
    const data = await response.json();
    setPending(null);
    if (!response.ok) {
      setError(typeof data.error === "string" ? data.error : "Unable to start checkout.");
      return;
    }
    router.push(`/managed-testing/payments/${data.payment.publicId}`);
  }

  return (
    <div>
      {error ? (
        <p role="alert" className="mb-4 rounded-control border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {packages.map((pack) => {
          const featured = pack.testerCount === 20;
          return (
            <article
              key={pack.code}
              className={cn(
                "flex flex-col rounded-card border bg-white p-5 shadow-card",
                featured ? "border-brand ring-1 ring-brand/20" : "border-line",
              )}
            >
              {featured ? (
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-brand">Most chosen</p>
              ) : null}
              <h3 className="mt-1 text-lg font-semibold text-slate-900">
                {packageHeadline(pack.testerCount, pack.contactOnly)}
              </h3>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
                {pack.contactOnly ? "Contact us" : formatPkr(pack.amountPkr)}
              </p>
              <p className="mt-1 text-sm text-muted">
                {pack.contactOnly
                  ? "A tailored tester count for larger programmes."
                  : `${pack.testerCount} managed testers`}
              </p>
              <ul className="mt-4 flex-1 space-y-1.5 text-sm text-slate-700">
                {MANAGED_TESTING_INCLUDED.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="text-brand" aria-hidden>
                      ✓
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
              <Button
                className="mt-5 w-full"
                type="button"
                variant={featured ? "primary" : "secondary"}
                disabled={pending !== null}
                onClick={() => void buy(pack)}
              >
                {pending === pack.code ? "Starting…" : pack.contactOnly ? "Contact us" : "Purchase Package"}
              </Button>
            </article>
          );
        })}
      </div>
    </div>
  );
}
