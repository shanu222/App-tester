import { isDemoMode } from "@/lib/env";

export type PaymentProviderId = "manual" | "stub";

export function managedTestingStubPaymentsAllowed() {
  if (isDemoMode()) return true;
  if (process.env.NODE_ENV === "production") return false;
  return process.env.MANAGED_TESTING_STUB_PAYMENTS === "true";
}

export function resolveCheckoutProvider(): PaymentProviderId {
  return managedTestingStubPaymentsAllowed() ? "stub" : "manual";
}

export function whatsappReportingConfigured() {
  return Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

export function manualPayeeInstructions() {
  const name = process.env.MANAGED_TESTING_PAYEE_NAME?.trim();
  const details = process.env.MANAGED_TESTING_PAYEE_DETAILS?.trim();
  if (name && details) return { name, details };
  return {
    name: "TestLoop managed testing",
    details:
      "Our team will confirm this payment and notify you at your verified notification email when the package is ready.",
  };
}
