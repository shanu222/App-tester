export const USD_TWELVE_PACKAGE_CODE = "usd_12_14";
export const USD_TWELVE_PACKAGE_NAME = "12 Testers — $10 USD — 14 Days";
export const USD_TWELVE_PRICE_USD = 10;
export const USD_TWELVE_TESTER_COUNT = 12;
export const USD_TWELVE_DURATION_DAYS = 14;
export const USD_TWELVE_WHATSAPP_DISPLAY = "+92 340 3318127";
export const USD_TWELVE_WHATSAPP_DIGITS = "923403318127";
export const USD_TWELVE_WHATSAPP_HREF = "https://wa.me/923403318127";

export const USD_TWELVE_INCLUDED = [
  "12 managed testers",
  "Testing invitation emails",
  "Google Play testing link",
  "Tester confirmation tracking",
  "Tester screenshot submission",
  "Daily testing progress",
  "Developer notification",
  "14-day testing status",
] as const;

/** Fixed tester pool for this package only. Developers cannot edit these addresses. */
export const USD_TWELVE_TESTER_EMAILS = [
  "shanu1998end@gmail.com",
  "bendcreteengineeringservices@gmail.com",
  "ndma2026@gmail.com",
  "rauarsalan@gmail.com",
  "touqeer6124@gmail.com",
  "shahnawaz991374balouch@gmail.com",
  "shahnawaz9974balouch@gmail.com",
  "shanuend0@gmail.com",
  "asadbaloch225@gmail.com",
  "asadullahbaloch7865@gmail.com",
  "salahuddinlundbaloch1996@gmail.com",
  "alwayshero076@gmail.com",
] as const;

export function isUsdTwelvePackage(code: string | null | undefined) {
  return code === USD_TWELVE_PACKAGE_CODE;
}

export function formatUsd(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(amount);
}

export function usdTwelveTesterLabel(index: number) {
  return `Tester ${String(index + 1).padStart(2, "0")}`;
}

export function usdTwelveTestingTypeLabel(type: string) {
  if (type === "INTERNAL") return "Internal";
  if (type === "OPEN") return "Open";
  return "Closed";
}

export function usdTwelveProgressStatus(input: {
  invitationStatus: string;
  confirmationStatus: string;
  hasScreenshot: boolean;
}) {
  if (input.confirmationStatus === "CONFIRMED" && input.hasScreenshot) return "SCREENSHOT RECEIVED";
  if (input.confirmationStatus === "CONFIRMED") return "CONFIRMED";
  if (input.invitationStatus === "FAILED") return "EMAIL_FAILED";
  if (input.invitationStatus === "SENT") return "INVITED";
  return "PENDING";
}

export type UsdTwelveFulfillment = {
  appId: string;
  testingType: "INTERNAL" | "CLOSED" | "OPEN";
  testingUrl: string;
};

export function parseUsdTwelveFulfillment(value: unknown): UsdTwelveFulfillment | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const testingType = row.testingType;
  if (testingType !== "INTERNAL" && testingType !== "CLOSED" && testingType !== "OPEN") return null;
  if (typeof row.appId !== "string" || typeof row.testingUrl !== "string") return null;
  return { appId: row.appId, testingType, testingUrl: row.testingUrl };
}
