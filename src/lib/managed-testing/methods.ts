import type { ManagedPaymentMethod, ManagedPaymentStatus } from "@prisma/client";

const PK_MOBILE = "+92 340 3318127";
const PK_MOBILE_DIGITS = "923403318127";
const WHATSAPP_PROOF = "+92 340 3318127";

export const PAYMENTS_ADMIN_EMAIL =
  process.env.PAYMENTS_ADMIN_EMAIL?.trim() || "shanu1998end@gmail.com";

export const PAYMENT_PROOF_WHATSAPP = {
  display: WHATSAPP_PROOF,
  digits: PK_MOBILE_DIGITS,
  href: `https://wa.me/${PK_MOBILE_DIGITS}`,
};

export type PaymentMethodId = ManagedPaymentMethod;

export type PaymentMethodCard = {
  id: PaymentMethodId;
  label: string;
  shortLabel: string;
  kind: "mobile_wallet" | "crypto" | "provider";
  available: boolean;
  unavailableReason: string | null;
  payeeLabel: string | null;
  copyValue: string | null;
  network: string | null;
  instructions: string[];
  warning: string;
};

function envOr(name: string, fallback: string) {
  const value = process.env[name]?.trim();
  return value || fallback;
}

export function revenueCatConfigured() {
  return Boolean(process.env.REVENUECAT_SECRET_API_KEY?.trim() && process.env.REVENUECAT_PROJECT_ID?.trim());
}

export function binanceUsdtAddress() {
  return envOr("PAYMENTS_BINANCE_USDT_ADDRESS", "0x039a8c041809cdf0192ced7d904df1353913b53a");
}

export function binanceUsdtNetwork() {
  return envOr("PAYMENTS_BINANCE_USDT_NETWORK", "BSC");
}

export function paymentMethods(): PaymentMethodCard[] {
  const mobile = envOr("PAYMENTS_MOBILE_WALLET_NUMBER", PK_MOBILE);
  const copyMobile = mobile.replace(/\s+/g, "");
  const revenueCatReady = revenueCatConfigured();
  const binanceAddress = binanceUsdtAddress();
  const binanceNetwork = binanceUsdtNetwork();

  return [
    {
      id: "EASYPAISA",
      label: "EasyPaisa",
      shortLabel: "EasyPaisa",
      kind: "mobile_wallet",
      available: true,
      unavailableReason: null,
      payeeLabel: "EasyPaisa number",
      copyValue: copyMobile,
      network: null,
      instructions: [
        `Send the exact package amount to EasyPaisa ${mobile}.`,
        "Use the TestLoop payment reference in the transfer note if your wallet allows it.",
        "Upload a screenshot of the successful transfer, then tap I Have Paid.",
      ],
      warning: "Your package stays inactive until TestLoop reviews this payment. Do not send card details.",
    },
    {
      id: "JAZZCASH",
      label: "JazzCash",
      shortLabel: "JazzCash",
      kind: "mobile_wallet",
      available: true,
      unavailableReason: null,
      payeeLabel: "JazzCash number",
      copyValue: copyMobile,
      network: null,
      instructions: [
        `Send the exact package amount to JazzCash ${mobile}.`,
        "Use the TestLoop payment reference in the transfer note if your wallet allows it.",
        "Upload a screenshot of the successful transfer, then tap I Have Paid.",
      ],
      warning: "Your package stays inactive until TestLoop reviews this payment. Do not send card details.",
    },
    {
      id: "SADAPAY",
      label: "SadaPay",
      shortLabel: "SadaPay",
      kind: "mobile_wallet",
      available: true,
      unavailableReason: null,
      payeeLabel: "SadaPay number",
      copyValue: copyMobile,
      network: null,
      instructions: [
        `Send the exact package amount to SadaPay ${mobile}.`,
        "Use the TestLoop payment reference in the transfer note if your wallet allows it.",
        "Upload a screenshot of the successful transfer, then tap I Have Paid.",
      ],
      warning: "Your package stays inactive until TestLoop reviews this payment. Do not send card details.",
    },
    {
      id: "NAYAPAY",
      label: "NayaPay",
      shortLabel: "NayaPay",
      kind: "mobile_wallet",
      available: true,
      unavailableReason: null,
      payeeLabel: "NayaPay number",
      copyValue: copyMobile,
      network: null,
      instructions: [
        `Send the exact package amount to NayaPay ${mobile}.`,
        "Use the TestLoop payment reference in the transfer note if your wallet allows it.",
        "Upload a screenshot of the successful transfer, then tap I Have Paid.",
      ],
      warning: "Your package stays inactive until TestLoop reviews this payment. Do not send card details.",
    },
    {
      id: "BINANCE_USDT",
      label: "Binance Pay / USDT",
      shortLabel: "Binance",
      kind: "crypto",
      available: true,
      unavailableReason: null,
      payeeLabel: "USDT address",
      copyValue: binanceAddress,
      network: binanceNetwork,
      instructions: [
        `Send USDT on the ${binanceNetwork} network only.`,
        `Paste this address: ${binanceAddress}`,
        "Sending on any other network can permanently lose the funds.",
        "Upload the Binance/transaction screenshot, then tap I Have Paid.",
      ],
      warning: `Use ${binanceNetwork} (BEP-20) only. TestLoop never asks for your Binance password or seed phrase.`,
    },
    {
      id: "REVENUECAT",
      label: "RevenueCat",
      shortLabel: "RevenueCat",
      kind: "provider",
      available: revenueCatReady,
      unavailableReason: revenueCatReady
        ? null
        : "RevenueCat is not configured on this server yet. Choose EasyPaisa, JazzCash, SadaPay, NayaPay, or Binance Pay.",
      payeeLabel: null,
      copyValue: null,
      network: null,
      instructions: revenueCatReady
        ? ["Complete checkout through the configured RevenueCat paywall. TestLoop activates the package only after the server verifies the receipt."]
        : ["RevenueCat in-app purchases are not enabled for this TestLoop deployment."],
      warning: "TestLoop will not mark this package as paid from the browser. Server verification is required.",
    },
  ];
}

export function paymentMethodById(id: PaymentMethodId | string | null | undefined) {
  if (!id) return null;
  return paymentMethods().find((item) => item.id === id) ?? null;
}

export function providerForMethod(method: PaymentMethodId): "EASYPAISA" | "JAZZCASH" | "SADAPAY" | "NAYAPAY" | "BINANCE" | "REVENUECAT" {
  if (method === "BINANCE_USDT") return "BINANCE";
  return method;
}

export const WALLET_PURCHASE_METHOD_IDS = ["EASYPAISA", "JAZZCASH", "SADAPAY", "NAYAPAY", "BINANCE_USDT"] as const;
export type WalletPurchaseMethodId = (typeof WALLET_PURCHASE_METHOD_IDS)[number];
export const USD_TWELVE_PAYMENT_CHOICES = ["PADDLE", ...WALLET_PURCHASE_METHOD_IDS] as const;
export type UsdTwelvePaymentChoice = (typeof USD_TWELVE_PAYMENT_CHOICES)[number];

export function isWalletPurchaseMethod(id: string): id is WalletPurchaseMethodId {
  return (WALLET_PURCHASE_METHOD_IDS as readonly string[]).includes(id);
}

export function isUsdTwelvePaymentChoice(id: string): id is UsdTwelvePaymentChoice {
  return (USD_TWELVE_PAYMENT_CHOICES as readonly string[]).includes(id);
}

export function walletPurchaseMethods(): Array<PaymentMethodCard & { id: WalletPurchaseMethodId }> {
  return paymentMethods().filter((item): item is PaymentMethodCard & { id: WalletPurchaseMethodId } =>
    isWalletPurchaseMethod(item.id),
  );
}

const OPEN_STATUSES: ManagedPaymentStatus[] = ["PENDING", "PENDING_PAYMENT", "PROOF_SUBMITTED", "UNDER_REVIEW", "REJECTED"];
const ACTIVATED_STATUSES: ManagedPaymentStatus[] = ["PAID", "APPROVED"];
const REVIEW_STATUSES: ManagedPaymentStatus[] = ["PROOF_SUBMITTED", "UNDER_REVIEW"];

export function paymentIsOpen(status: ManagedPaymentStatus) {
  return OPEN_STATUSES.includes(status);
}

export function paymentIsActivated(status: ManagedPaymentStatus) {
  return ACTIVATED_STATUSES.includes(status);
}

export function paymentNeedsReview(status: ManagedPaymentStatus) {
  return REVIEW_STATUSES.includes(status);
}

export function paymentCanSubmitProof(status: ManagedPaymentStatus) {
  return status === "PENDING" || status === "PENDING_PAYMENT" || status === "REJECTED";
}

export const PROOF_MAX_BYTES = 2 * 1024 * 1024;
export const PROOF_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["application/pdf", "pdf"],
]);

export function validatePaymentProof(file: { type: string; size: number; name?: string }) {
  const mime = file.type.trim().toLowerCase();
  if (!PROOF_TYPES.has(mime)) {
    return { ok: false as const, error: "Upload a JPG, PNG, WebP, or PDF payment screenshot." };
  }
  if (file.size < 32) {
    return { ok: false as const, error: "That file is empty. Upload the payment screenshot again." };
  }
  if (file.size > PROOF_MAX_BYTES) {
    return { ok: false as const, error: "Payment proof must be 2 MB or smaller." };
  }
  return { ok: true as const, mime };
}
