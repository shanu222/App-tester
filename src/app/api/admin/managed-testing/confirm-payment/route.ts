import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/http";
import { AppError } from "@/lib/errors";
import { confirmUsdTwelvePaymentFromToken } from "@/lib/services/usd-twelve-payment-confirm";

function redirectStatus(request: Request, status: string, ref?: string) {
  const url = new URL("/admin/managed-testing/confirm-payment", request.url);
  url.searchParams.set("status", status);
  if (ref) url.searchParams.set("ref", ref);
  return NextResponse.redirect(url, 303);
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const token = String(form.get("token") || "");
    const result = await confirmUsdTwelvePaymentFromToken(token);
    return redirectStatus(request, result.alreadyConfirmed ? "already" : "confirmed", result.transactionReference);
  } catch (error) {
    if (error instanceof AppError && (error.code === "CONFIRM_TOKEN_USED" || error.code === "CONFIRM_TOKEN_EXPIRED" || error.code === "CONFIRM_TOKEN_INVALID")) {
      return redirectStatus(request, error.code === "CONFIRM_TOKEN_USED" ? "already" : "invalid");
    }
    return handleRouteError(error);
  }
}
