"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PaddleOverlayCheckout } from "@/components/managed-testing/paddle-overlay-checkout";

export function PaddleResumeCheckout({
  paymentPublicId,
  customerEmail,
}: {
  paymentPublicId: string;
  customerEmail?: string;
}) {
  const router = useRouter();
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openCheckout() {
    setPending(true);
    setError(null);
    const response = await fetch("/api/managed-testing/paddle/transaction", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentPublicId }),
    });
    const data = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok || typeof data.transactionId !== "string") {
      setError(typeof data.error === "string" ? data.error : "Unable to open Paddle checkout.");
      return;
    }
    setTransactionId(data.transactionId);
  }

  async function afterPaid(paidTransactionId: string) {
    const response = await fetch("/api/managed-testing/paddle/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentPublicId, transactionId: paidTransactionId }),
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok && data.campaignPublicId) {
      router.push(`/managed-testing/${data.campaignPublicId}`);
      return;
    }
    router.push(`/managed-testing/paddle/success?payment=${encodeURIComponent(paymentPublicId)}`);
  }

  return (
    <div className="space-y-3">
      {error ? (
        <p role="alert" className="rounded-control border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      <Button className="w-full" type="button" disabled={pending} onClick={() => void openCheckout()}>
        {pending ? "Opening checkout…" : "Buy TestLoop"}
      </Button>
      {transactionId ? (
        <PaddleOverlayCheckout
          transactionId={transactionId}
          customerEmail={customerEmail}
          successUrl={`/managed-testing/paddle/success?payment=${encodeURIComponent(paymentPublicId)}`}
          onCompleted={(id) => {
            void afterPaid(id);
          }}
          onError={setError}
        />
      ) : null}
    </div>
  );
}

export function PaddlePaymentStatusPoller({ paymentPublicId }: { paymentPublicId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("Confirming your Paddle payment…");

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    async function poll() {
      const response = await fetch(`/api/managed-testing/payments/${paymentPublicId}`);
      const data = await response.json().catch(() => ({}));
      if (cancelled) return;
      if (data.active && data.campaignPublicId) {
        router.replace(`/managed-testing/${data.campaignPublicId}`);
        return;
      }
      attempts += 1;
      if (attempts >= 20) {
        setMessage("Payment is still confirming. Refresh this page in a moment, or open Managed Testing.");
        return;
      }
      setTimeout(() => {
        void poll();
      }, 1500);
    }
    void poll();
    return () => {
      cancelled = true;
    };
  }, [paymentPublicId, router]);

  return <p className="text-sm leading-6 text-slate-700">{message}</p>;
}
