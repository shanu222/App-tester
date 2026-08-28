import { randomId } from "@/lib/crypto";

export const MANAGED_TESTING_INCLUDED = [
  "Tester recruitment",
  "Email invitations",
  "Testing coordination",
  "Tester status tracking",
  "Reminders",
  "Progress dashboard",
  "Scheduled reports",
] as const;

export const MANAGED_TESTING_DURATION_DAYS = 14;

export const MANAGED_TESTING_COMPLIANCE =
  "TestLoop provides managed testing coordination with consenting participants. Testing outcomes and Google Play production access are determined by Google Play and the actual testing activity.";

export function formatPkr(amount: number) {
  return `PKR ${new Intl.NumberFormat("en-PK").format(amount)}`;
}

export function formatPackageAmount(amount: number, currency: string) {
  if (currency === "USD") {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(amount);
  }
  return formatPkr(amount);
}

export function publicPaymentId() {
  return randomId("mtpay_");
}

export function publicCampaignId() {
  return randomId("mtc_");
}

export function publicTesterId() {
  return randomId("mtt_");
}

export function publicAssignmentId() {
  return randomId("mta_");
}

export function paymentReference() {
  return `TL-MBT-${randomId("").slice(0, 10).toUpperCase()}`;
}

export function packageHeadline(testerCount: number, contactOnly: boolean) {
  if (contactOnly) return "Custom";
  return `${testerCount} testers`;
}
