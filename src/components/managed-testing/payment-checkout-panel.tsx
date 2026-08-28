"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { Hint, Input, Label } from "@/components/ui/fields";
import { paymentStatusTone, PAYMENT_STATUS_LABELS } from "@/lib/managed-testing/labels";
import type { ManagedPaymentStatus } from "@prisma/client";
import type { PaymentMethodCard } from "@/lib/managed-testing/methods";
import { cn } from "@/lib/utils";

type PaymentView = {
  publicId: string;
  packageName: string;
  testerCount: number;
  amountLabel: string;
  status: string;
  method: string | null;
  methodLabel: string | null;
  transactionReference: string;
  developerReference: string | null;
  hasProof: boolean;
  adminNote: string | null;
  submittedAt: string | null;
};

export function PaymentCheckoutPanel({
  payment,
  methods,
  developerEmail,
  whatsapp,
  canSubmitProof,
}: {
  payment: PaymentView;
  methods: PaymentMethodCard[];
  developerEmail: string;
  whatsapp: { display: string; href: string; digits: string };
  canSubmitProof: boolean;
}) {
  const router = useRouter();
  const [methodId, setMethodId] = useState(payment.method || methods.find((item) => item.available)?.id || "");
  const [reference, setReference] = useState(payment.developerReference || "");
  const [fileName, setFileName] = useState<string | null>(payment.hasProof ? "Previously uploaded proof" : null);
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(() => methods.find((item) => item.id === methodId) || null, [methods, methodId]);
  const underReview = payment.status === "UNDER_REVIEW" || payment.status === "PROOF_SUBMITTED";
  const approved = payment.status === "APPROVED" || payment.status === "PAID";
  const rejected = payment.status === "REJECTED";

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!selected) {
      setError("Choose a payment method.");
      return;
    }
    if (!selected.available) {
      setError(selected.unavailableReason || "That payment method is not available.");
      return;
    }
    if (!file) {
      setError("Upload a payment screenshot or PDF, then tap I Have Paid.");
      return;
    }
    setPending(true);
    setError(null);
    const body = new FormData();
    body.set("methodId", selected.id);
    body.set("developerReference", reference);
    body.set("proof", file);
    const response = await fetch(`/api/managed-testing/payments/${payment.publicId}`, {
      method: "POST",
      body,
    });
    const data = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) {
      setError(typeof data.error === "string" ? data.error : "Payment proof could not be submitted.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-slate-800">Payment status</p>
        <Badge tone={paymentStatusTone(payment.status as ManagedPaymentStatus)}>
          {PAYMENT_STATUS_LABELS[payment.status as ManagedPaymentStatus] || payment.status}
        </Badge>
      </div>

      {approved ? (
        <p className="rounded-control border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm leading-6 text-emerald-800">
          This package is active. TestLoop allocated {payment.testerCount} managed testers to your account.
        </p>
      ) : null}

      {underReview ? (
        <p className="rounded-control border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-900">
          Payment under review. TestLoop received your proof and has not activated the package yet. You will get an
          email when an administrator approves or rejects it.
        </p>
      ) : null}

      {rejected ? (
        <div className="rounded-control border border-red-200 bg-red-50 px-3 py-2 text-sm leading-6 text-red-800">
          <p>This payment was not approved. The package is still inactive.</p>
          {payment.adminNote ? <p className="mt-2">{payment.adminNote}</p> : null}
        </div>
      ) : null}

      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted">Package</dt>
          <dd className="mt-0.5 font-medium text-slate-900">{payment.packageName}</dd>
        </div>
        <div>
          <dt className="text-muted">Managed testers</dt>
          <dd className="mt-0.5 font-medium text-slate-900">{payment.testerCount}</dd>
        </div>
        <div>
          <dt className="text-muted">Price</dt>
          <dd className="mt-0.5 font-medium text-slate-900">{payment.amountLabel}</dd>
        </div>
        <div>
          <dt className="text-muted">Payment method</dt>
          <dd className="mt-0.5 font-medium text-slate-900">{payment.methodLabel || "Choose below"}</dd>
        </div>
        <div>
          <dt className="text-muted">Account email</dt>
          <dd className="mt-0.5 break-all font-medium text-slate-900">{developerEmail}</dd>
        </div>
        <div>
          <dt className="text-muted">TestLoop reference</dt>
          <dd className="mt-0.5 flex flex-wrap items-center gap-2 font-mono text-slate-900">
            {payment.transactionReference}
            <CopyButton value={payment.transactionReference} label="Copy reference" />
          </dd>
        </div>
        <div>
          <dt className="text-muted">WhatsApp for proof</dt>
          <dd className="mt-0.5 flex flex-wrap items-center gap-2 font-medium text-slate-900">
            {whatsapp.display}
            <CopyButton value={whatsapp.digits} label="Copy number" />
            <a className="text-sm font-medium text-brand hover:underline" href={whatsapp.href} target="_blank" rel="noreferrer">
              Open WhatsApp
            </a>
          </dd>
        </div>
      </dl>

      {canSubmitProof ? (
        <form onSubmit={(event) => void submit(event)} className="space-y-5">
          <div>
            <p className="text-sm font-medium text-slate-800">Payment method</p>
            <p className="mt-1 text-sm text-muted">Choose how you will send the exact package amount.</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {methods.map((item) => {
                const selectedCard = item.id === methodId;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setMethodId(item.id)}
                    className={cn(
                      "rounded-card border p-4 text-left transition-colors",
                      selectedCard ? "border-brand bg-brand-soft ring-1 ring-brand/20" : "border-line bg-white hover:border-line-strong",
                      !item.available ? "opacity-80" : "",
                    )}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-medium text-slate-900">{item.label}</span>
                      {!item.available ? <Badge tone="warn">Unavailable</Badge> : null}
                    </span>
                    {item.kind === "crypto" ? (
                      <span className="mt-1 block text-xs text-muted">Network {item.network}</span>
                    ) : (
                      <span className="mt-1 block text-xs text-muted">
                        {item.available ? "Manual transfer, then upload proof" : "Configuration pending"}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {selected ? (
            <div className="rounded-card border border-line bg-surface p-4">
              <p className="text-sm font-medium text-slate-900">{selected.label}</p>
              {!selected.available ? (
                <p className="mt-2 text-sm leading-6 text-amber-800">{selected.unavailableReason}</p>
              ) : (
                <>
                  {selected.copyValue ? (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <p className="break-all font-mono text-sm text-slate-900">
                        {selected.payeeLabel ? `${selected.payeeLabel}: ` : ""}
                        {selected.copyValue}
                        {selected.network ? ` · ${selected.network}` : ""}
                      </p>
                      <CopyButton value={selected.copyValue} label="Copy" />
                    </div>
                  ) : null}
                  {selected.id === "BINANCE_USDT" && selected.copyValue ? (
                    <BinanceQr address={selected.copyValue} network={selected.network} />
                  ) : null}
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-700">
                    {selected.instructions.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                  <p className="mt-3 text-sm leading-6 text-amber-800">{selected.warning}</p>
                </>
              )}
            </div>
          ) : null}

          <div>
            <Label htmlFor="developerReference">Transaction / reference ID (optional)</Label>
            <Input
              id="developerReference"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder="Wallet TID, JazzCash ID, or TxID"
              maxLength={120}
            />
          </div>

          <div>
            <Label htmlFor="proof">Upload payment proof</Label>
            <Input
              id="proof"
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={(event) => {
                const next = event.target.files?.[0] || null;
                setFile(next);
                setFileName(next?.name || null);
              }}
            />
            <Hint>JPG, PNG, WebP, or PDF up to 2 MB. Tapping I Have Paid does not activate the package.</Hint>
            {fileName ? <p className="mt-1 text-xs text-muted">{fileName}</p> : null}
          </div>

          {error ? (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <Button type="submit" className="w-full" disabled={pending || !selected?.available}>
            {pending ? "Submitting…" : "I Have Paid"}
          </Button>
        </form>
      ) : null}
    </div>
  );
}

function BinanceQr({ address, network }: { address: string; network: string | null }) {
  return (
    <div className="mt-4 flex flex-wrap items-start gap-4">
      <img
        src="/payments/binance-usdt-bsc.svg"
        alt={`Binance USDT ${network || "BSC"} QR code`}
        width={148}
        height={148}
        className="rounded-control border border-line bg-white p-2"
      />
      <p className="max-w-sm text-sm leading-6 text-slate-700">
        Scan this QR in Binance Pay or your wallet, then send USDT on the {network} network only. Confirm the address
        matches {address.slice(0, 10)}…{address.slice(-6)} before sending.
      </p>
    </div>
  );
}
