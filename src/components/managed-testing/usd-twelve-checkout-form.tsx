"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/fields";
import { PaddleOverlayCheckout } from "@/components/managed-testing/paddle-overlay-checkout";
import { walletPurchaseMethods, type UsdTwelvePaymentChoice } from "@/lib/managed-testing/methods";
import { cn } from "@/lib/utils";
import Link from "next/link";

/** Flip to true to offer Paddle on this page again. Backend, webhooks, and config stay in place. */
const OFFER_PADDLE_CHECKOUT = false;

type AppOption = {
  id: string;
  name: string;
  testingType: "INTERNAL" | "CLOSED" | "OPEN";
  hasTestingLink: boolean;
  playConnected: boolean;
};

export function UsdTwelveCheckoutForm({
  apps,
  paddleReady,
  customerEmail,
}: {
  apps: AppOption[];
  paddleReady: boolean;
  customerEmail?: string;
}) {
  const router = useRouter();
  const wallets = useMemo(() => walletPurchaseMethods(), []);
  const [appId, setAppId] = useState(apps[0]?.id || "");
  const selected = useMemo(() => apps.find((app) => app.id === appId), [apps, appId]);
  const [testingType, setTestingType] = useState<"INTERNAL" | "CLOSED" | "OPEN">(
    selected?.testingType || "CLOSED",
  );
  const [testingUrl, setTestingUrl] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<UsdTwelvePaymentChoice | "">(
    OFFER_PADDLE_CHECKOUT && paddleReady ? "PADDLE" : "EASYPAISA",
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkout, setCheckout] = useState<{ paymentPublicId: string; transactionId: string } | null>(null);

  async function buy() {
    if (!paymentMethod) {
      setError("Choose a payment method.");
      return;
    }
    setPending(true);
    setError(null);
    const response = await fetch("/api/managed-testing/usd-twelve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appId, testingType, testingUrl, paymentMethod }),
    });
    const data = await response.json();
    if (!response.ok) {
      setPending(false);
      setError(typeof data.error === "string" ? data.error : "Unable to start checkout.");
      return;
    }
    if (data.paddleCheckout && data.paddleTransactionId) {
      setCheckout({ paymentPublicId: data.paymentPublicId, transactionId: data.paddleTransactionId });
      setPending(false);
      return;
    }
    setPending(false);
    router.push(`/managed-testing/payments/${data.paymentPublicId}`);
  }

  async function afterPaddlePaid(transactionId: string) {
    if (!checkout) return;
    const response = await fetch("/api/managed-testing/paddle/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentPublicId: checkout.paymentPublicId, transactionId }),
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok && data.campaignPublicId) {
      router.push(`/managed-testing/${data.campaignPublicId}`);
      return;
    }
    router.push(`/managed-testing/paddle/success?payment=${encodeURIComponent(checkout.paymentPublicId)}`);
  }

  if (apps.length === 0) {
    return (
      <div className="space-y-4">
        <p className="text-sm leading-6 text-slate-700">
          Add an app first, then return here to purchase TestLoop.
        </p>
        <Link href="/apps">
          <Button type="button">Go to My Apps</Button>
        </Link>
      </div>
    );
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        void buy();
      }}
    >
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="usd12-app">
          App
        </label>
        <Select
          id="usd12-app"
          value={appId}
          onChange={(event) => {
            const next = event.target.value;
            setAppId(next);
            const app = apps.find((item) => item.id === next);
            if (app) setTestingType(app.testingType);
          }}
        >
          {apps.map((app) => (
            <option key={app.id} value={app.id}>
              {app.name}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="usd12-type">
          Testing type
        </label>
        <Select
          id="usd12-type"
          value={testingType}
          onChange={(event) => setTestingType(event.target.value as "INTERNAL" | "CLOSED" | "OPEN")}
        >
          <option value="INTERNAL">Internal</option>
          <option value="CLOSED">Closed</option>
          <option value="OPEN">Open</option>
        </Select>
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="usd12-url">
          Google Play testing link
        </label>
        <Input
          id="usd12-url"
          type="url"
          required
          placeholder="https://play.google.com/apps/testing/..."
          value={testingUrl}
          onChange={(event) => setTestingUrl(event.target.value)}
        />
        <p className="mt-1.5 text-xs leading-5 text-muted">
          Testers receive this opt-in or download URL. TestLoop does not claim Google Play verified the install.
        </p>
      </div>
      <div>
        <p className="text-sm font-medium text-slate-800">Choose payment method</p>
        <p className="mt-1 text-sm text-muted">Same $10 TestLoop package. The amount cannot be changed.</p>
        {OFFER_PADDLE_CHECKOUT ? (
          <>
            <div className="mt-3 grid gap-3">
              <button
                type="button"
                disabled={!paddleReady}
                onClick={() => setPaymentMethod("PADDLE")}
                className={cn(
                  "rounded-card border p-4 text-left transition-colors",
                  paymentMethod === "PADDLE" ? "border-brand bg-brand-soft ring-1 ring-brand/20" : "border-line bg-white hover:border-line-strong",
                  !paddleReady ? "opacity-70" : "",
                )}
              >
                <span className="font-medium text-slate-900">Paddle</span>
                <span className="mt-1 block text-sm text-slate-700">$10 USD · Secure online checkout</span>
                <span className="mt-1 block text-xs text-muted">
                  {paddleReady
                    ? "Sandbox payment available for testing. TestLoop activates access after Paddle verifies the transaction."
                    : "Paddle sandbox is not configured on this server yet."}
                </span>
              </button>
            </div>
            <p className="mt-4 text-sm font-medium text-slate-800">OR manual payment</p>
          </>
        ) : null}
        <p className="mt-3 text-sm text-muted">
          EasyPaisa, JazzCash, SadaPay, NayaPay, or Binance. Upload proof after you pay. An administrator must confirm
          before testers are invited.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {wallets.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setPaymentMethod(item.id)}
              className={cn(
                "rounded-card border p-4 text-left transition-colors",
                paymentMethod === item.id ? "border-brand bg-brand-soft ring-1 ring-brand/20" : "border-line bg-white hover:border-line-strong",
              )}
            >
              <span className="font-medium text-slate-900">{item.shortLabel}</span>
              <span className="mt-1 block text-xs text-muted">
                {item.kind === "crypto" ? `USDT on ${item.network}` : "Manual transfer, then upload proof"}
              </span>
            </button>
          ))}
        </div>
      </div>
      {error ? (
        <p role="alert" className="rounded-control border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      <Button className="w-full" type="submit" disabled={pending || !paymentMethod}>
        {pending ? "Starting…" : paymentMethod === "PADDLE" ? "Pay $10 USD with Paddle" : "Continue to payment details"}
      </Button>
      {checkout ? (
        <PaddleOverlayCheckout
          transactionId={checkout.transactionId}
          customerEmail={customerEmail}
          successUrl={`/managed-testing/paddle/success?payment=${encodeURIComponent(checkout.paymentPublicId)}`}
          onCompleted={(transactionId) => {
            void afterPaddlePaid(transactionId);
          }}
          onError={setError}
        />
      ) : null}
    </form>
  );
}
