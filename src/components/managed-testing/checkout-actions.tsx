"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { paymentStatusTone, PAYMENT_STATUS_LABELS } from "@/lib/managed-testing/labels";
import type { ManagedPaymentStatus } from "@prisma/client";

export function CheckoutActions({
  publicId,
  status,
  stubAllowed,
}: {
  publicId: string;
  status: string;
  stubAllowed: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmStub() {
    setPending(true);
    setError(null);
    const response = await fetch("/api/managed-testing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "confirm-stub", paymentPublicId: publicId }),
    });
    const data = await response.json();
    setPending(false);
    if (!response.ok) {
      setError(typeof data.error === "string" ? data.error : "Payment could not be confirmed.");
      return;
    }
    router.push(`/managed-testing/${data.campaignPublicId}/setup`);
  }

  return (
    <div className="space-y-3">
      <Badge tone={paymentStatusTone(status as ManagedPaymentStatus)}>
        {PAYMENT_STATUS_LABELS[status as ManagedPaymentStatus] || status}
      </Badge>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {status === "PAID" ? (
        <Button type="button" onClick={() => router.refresh()}>
          Continue
        </Button>
      ) : stubAllowed ? (
        <Button type="button" disabled={pending} onClick={() => void confirmStub()}>
          {pending ? "Confirming…" : "Confirm test payment"}
        </Button>
      ) : (
        <p className="text-sm text-muted">Payment stays pending until TestLoop confirms the transfer.</p>
      )}
    </div>
  );
}
