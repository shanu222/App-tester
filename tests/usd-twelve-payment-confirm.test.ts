import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  issuePaymentConfirmToken,
  PAYMENT_CONFIRM_TTL_MS,
  paymentConfirmNonceHash,
  verifyPaymentConfirmToken,
} from "../src/lib/managed-testing/payment-confirm-token";
import { USD_TWELVE_TESTER_EMAILS } from "../src/lib/managed-testing/usd-twelve";
import {
  usdTwelveAdminProofReviewEmail,
  usdTwelveDeveloperActivatedEmail,
} from "../src/lib/notifications/templates";

describe("payment confirm token", () => {
  it("signs a token bound to one payment and rejects tampering", () => {
    const issued = issuePaymentConfirmToken("mtpay_abc");
    const payload = verifyPaymentConfirmToken(issued.token);
    expect(payload?.pid).toBe("mtpay_abc");
    expect(paymentConfirmNonceHash(payload!.n)).toBe(issued.nonceHash);
    expect(issued.expiresAt.getTime()).toBeGreaterThan(Date.now());
    const [body] = issued.token.split(".");
    expect(verifyPaymentConfirmToken(`${body}.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`)).toBeNull();
    expect(verifyPaymentConfirmToken("not-a-token")).toBeNull();
  });

  it("expires and cannot be reused after the TTL", () => {
    const issued = issuePaymentConfirmToken("mtpay_abc", Date.now() - PAYMENT_CONFIRM_TTL_MS - 1000);
    expect(verifyPaymentConfirmToken(issued.token)).toBeNull();
  });
});

describe("usd twelve payment confirmation emails", () => {
  it("asks admin to confirm payment with package details and no secrets", () => {
    const email = usdTwelveAdminProofReviewEmail({
      developerName: "Ada",
      developerEmail: "ada@example.com",
      appName: "Wisdom Quest",
      amountLabel: "$10",
      methodLabel: "EasyPaisa",
      transactionReference: "TL-MBT-ABC",
      submittedAt: "29 Aug 2026, 01:00",
      confirmUrl: "https://www.testloop.org/admin/managed-testing/confirm-payment?token=signed",
      hasProof: true,
    });
    const blob = `${email.subject}\n${email.text}\n${email.html}`;
    expect(blob).toContain("CONFIRM PAYMENT");
    expect(blob).toContain("12 Testers / 14 Days");
    expect(blob).toContain("Wisdom Quest");
    expect(blob).toContain("ada@example.com");
    expect(blob).toContain("$10");
    expect(blob).toContain("EasyPaisa");
    expect(blob).toContain("TL-MBT-ABC");
    expect(blob).toContain("Attached");
    expect(blob).not.toMatch(/SMTP_|AUTH_SECRET|ENCRYPTION_KEY|password/i);
  });

  it("tells the developer payment was confirmed and the campaign is active", () => {
    const email = usdTwelveDeveloperActivatedEmail({
      packageName: "TestLoop 12-Testers / 14-Day Managed Testing",
      amountLabel: "$10",
      campaignUrl: "https://www.testloop.org/managed-testing/mtc_1",
      transactionReference: "TL-MBT-ABC",
      confirmedAt: "29 Aug 2026, 01:05",
    });
    expect(email.text).toMatch(/payment has been confirmed/i);
    expect(email.text).toMatch(/testing campaign has been activated/i);
    expect(email.text).toContain("TL-MBT-ABC");
  });

  it("does not hard-code tester pool emails in frontend files", () => {
    const files = [
      "src/components/managed-testing/usd-twelve-package-card.tsx",
      "src/components/managed-testing/usd-twelve-checkout-form.tsx",
      "src/components/managed-testing/usd-twelve-campaign-dashboard.tsx",
      "src/components/managed-testing/usd-twelve-confirm-form.tsx",
      "src/app/managed-testing/usd-twelve/page.tsx",
      "src/app/dashboard/page.tsx",
    ];
    for (const file of files) {
      const src = readFileSync(resolve(file), "utf8");
      for (const email of USD_TWELVE_TESTER_EMAILS) {
        expect(src.toLowerCase()).not.toContain(email.toLowerCase());
      }
    }
  });
});
