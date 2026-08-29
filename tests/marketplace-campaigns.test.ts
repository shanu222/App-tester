import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  MARKETPLACE_DURATION_DAYS,
  campaignIsLive,
  daysRemaining,
  isPaidOperationTesterEmail,
  isSafePlayRedirect,
  marketplaceEndsAt,
  marketplaceInviteAllowed,
  marketplaceParticipationActed,
  marketplaceReminderAllowed,
  marketplaceStatusLabel,
  shouldReuseActiveCampaign,
} from "../src/lib/testing/marketplace-rules";
import {
  issueMarketplaceActionToken,
  verifyMarketplaceActionToken,
} from "../src/lib/testing/email-action-token";
import { marketplaceTestingInviteEmail } from "../src/lib/notifications/templates";
import { DEFAULT_NOTIFICATION_PREFERENCES } from "../src/lib/notifications/preferences";

function source(file: string) {
  return readFileSync(resolve(file), "utf8");
}

describe("marketplace 14-day campaigns", () => {
  it("creates a 14-day window from the posting time", () => {
    const start = new Date("2026-08-29T00:00:00.000Z");
    const end = marketplaceEndsAt(start, MARKETPLACE_DURATION_DAYS);
    expect(MARKETPLACE_DURATION_DAYS).toBe(14);
    expect(end.getTime() - start.getTime()).toBe(14 * 86_400_000);
    expect(daysRemaining(end, start)).toBe(14);
    expect(campaignIsLive({ status: "ACTIVE", published: true, startedAt: start, endsAt: end, now: start })).toBe(true);
    expect(campaignIsLive({ status: "ACTIVE", published: true, startedAt: start, endsAt: end, now: end })).toBe(false);
    expect(campaignIsLive({ status: "EXPIRED", published: false, startedAt: start, endsAt: end, now: start })).toBe(false);
  });

  it("reuses an existing active campaign instead of creating a duplicate", () => {
    const existing = { id: "camp_1" };
    expect(shouldReuseActiveCampaign(existing)?.id).toBe("camp_1");
    expect(shouldReuseActiveCampaign(null)).toBeNull();
    expect(source("src/lib/services/marketplace-campaigns.ts")).toContain("already-active");
    expect(source("src/lib/services/marketplace-campaigns.ts")).toContain("ensureMarketplaceCampaignForApp");
    expect(source("src/lib/services/marketplace-campaigns.ts")).toContain("needs-publish");
    const service = source("src/lib/services/marketplace-campaigns.ts");
    const ensure = service.slice(
      service.indexOf("export async function ensureMarketplaceCampaignForApp"),
      service.indexOf("async function afterPublishedSafe"),
    );
    expect(ensure).not.toContain("prisma.campaign.create");
    expect(ensure).toContain("needs-publish");
  });
});

describe("paid 12-tester exclusion and reminder rules", () => {
  it("excludes paid-operation tester emails from the public pool", () => {
    const paid = new Set(["pool.tester@example.com", "assigned@example.com"]);
    expect(isPaidOperationTesterEmail("Pool.Tester@example.com", paid)).toBe(true);
    expect(isPaidOperationTesterEmail("public.dev@example.com", paid)).toBe(false);
    const service = source("src/lib/services/marketplace-campaigns.ts");
    expect(service).toContain("managedFixedPoolEmail");
    expect(service).toContain("reservedPackageCode");
    expect(service).not.toMatch(/if \(user\.id === /);
  });

  it("lets public users receive the initial invitation", () => {
    expect(
      marketplaceInviteAllowed({
        campaignLive: true,
        isOwner: false,
        paidOperationTester: false,
        optedOut: false,
        alreadyInvited: false,
        participation: null,
      }),
    ).toBe(true);
    expect(
      marketplaceInviteAllowed({
        campaignLive: true,
        isOwner: false,
        paidOperationTester: true,
        optedOut: false,
        alreadyInvited: false,
        participation: null,
      }),
    ).toBe(false);
    expect(
      marketplaceInviteAllowed({
        campaignLive: true,
        isOwner: false,
        paidOperationTester: false,
        optedOut: false,
        alreadyInvited: true,
        participation: null,
      }),
    ).toBe(false);
  });

  it("stops reminders after accept or download-link click, and after expiry", () => {
    const live = {
      campaignLive: true,
      isOwner: false,
      paidOperationTester: false,
      optedOut: false,
      alreadyRemindedToday: false,
      invitedToday: false,
      participation: null as { acceptedAt: Date | null; downloadLinkClickedAt: Date | null; consentAt: Date | null; status: string } | null,
    };
    expect(marketplaceReminderAllowed(live)).toBe(true);
    expect(marketplaceReminderAllowed({ ...live, participation: { acceptedAt: new Date(), downloadLinkClickedAt: null, consentAt: null, status: "ACCEPTED" } })).toBe(false);
    expect(marketplaceReminderAllowed({ ...live, participation: { acceptedAt: null, downloadLinkClickedAt: new Date(), consentAt: null, status: "ACCEPTED" } })).toBe(false);
    expect(marketplaceReminderAllowed({ ...live, campaignLive: false })).toBe(false);
    expect(marketplaceReminderAllowed({ ...live, alreadyRemindedToday: true })).toBe(false);
    expect(marketplaceParticipationActed({ acceptedAt: new Date(), downloadLinkClickedAt: null, consentAt: null, status: "ACCEPTED" })).toBe(true);
  });
});

describe("marketplace email actions", () => {
  it("accepts a signed token bound to an action record", () => {
    const expires = new Date(Date.now() + 60_000);
    const issued = issueMarketplaceActionToken("action_1", expires);
    const parsed = verifyMarketplaceActionToken(issued.token);
    expect(parsed?.aid).toBe("action_1");
    expect(parsed?.n).toBeTruthy();
  });

  it("rejects an invalid, tampered, or expired token", () => {
    const expires = new Date(Date.now() + 60_000);
    const issued = issueMarketplaceActionToken("action_1", expires);
    expect(verifyMarketplaceActionToken("not-a-token")).toBeNull();
    const [body] = issued.token.split(".");
    expect(verifyMarketplaceActionToken(`${body}.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`)).toBeNull();
    const expired = issueMarketplaceActionToken("action_1", new Date(Date.now() - 1000));
    expect(verifyMarketplaceActionToken(expired.token)).toBeNull();
  });

  it("cannot be rewritten to another user or campaign in the token payload", () => {
    const issued = issueMarketplaceActionToken("action_owner", new Date(Date.now() + 60_000));
    const parsed = verifyMarketplaceActionToken(issued.token);
    expect(parsed).not.toHaveProperty("userId");
    expect(parsed).not.toHaveProperty("campaignId");
    expect(JSON.stringify(parsed)).not.toContain("other-user");
    const route = source("src/app/api/testing/email-action/accept/route.ts");
    expect(route).toContain("performMarketplaceEmailAction");
    expect(source("src/middleware.ts")).toContain("/api/testing/email-action");
  });

  it("records acceptance and download-link clicks idempotently", () => {
    const service = source("src/lib/services/marketplace-campaigns.ts");
    expect(service).toContain("recordMarketplaceAcceptance");
    expect(service).toContain("alreadyProcessed");
    expect(service).toContain("marketplace_accepted:");
    expect(service).toContain("marketplace_download:");
    expect(service).toContain("downloadLinkClickedAt");
    expect(service).not.toMatch(/status:\s*"INSTALLED"/);
  });
});

describe("marketplace email copy and cron idempotency", () => {
  it("uses a Gmail-friendly Accept & Download CTA", () => {
    const email = marketplaceTestingInviteEmail({
      appName: "Wisdom Quest",
      developerName: "NET360 Labs",
      testingTypeLabel: "Closed",
      testingPeriodLabel: "29 Aug 2026 to 12 Sep 2026",
      playUrlLabel: "Google Play testing / opt-in link",
      acceptUrl: "https://www.testloop.org/api/testing/email-action/accept?t=token",
    });
    expect(email.subject).toContain("New App Available for Testing on TestLoop");
    expect(email.html).toContain("ACCEPT & DOWNLOAD");
    expect(email.text).toContain("ACCEPT & DOWNLOAD");
    expect(email.html).not.toMatch(/installed the app/i);
    expect(DEFAULT_NOTIFICATION_PREFERENCES.testingMarketplace).toBe(true);
  });

  it("dedupes deliveries by campaign, user, type, and day", () => {
    const schema = source("prisma/schema.prisma");
    expect(schema).toContain("@@unique([campaignId, recipientUserId, type, dayKey])");
    expect(source("src/lib/services/marketplace-campaigns.ts")).toContain("uniqueViolation");
    expect(source("src/app/api/cron/daily-testing-summary/route.ts")).toContain("processMarketplaceNotificationJobs");
  });

  it("only redirects to Google Play hosts after acceptance", () => {
    expect(isSafePlayRedirect("https://play.google.com/apps/testing/com.example.app")).toBe(true);
    expect(isSafePlayRedirect("https://evil.example/phish")).toBe(false);
    expect(isSafePlayRedirect("javascript:alert(1)")).toBe(false);
  });

  it("keeps Paddle and wallet payment code in place", () => {
    expect(source("src/lib/services/usd-twelve-package.ts")).toContain("PADDLE");
    expect(source("src/lib/managed-testing/methods.ts")).toContain("EASYPAISA");
    expect(source("src/components/managed-testing/usd-twelve-checkout-form.tsx")).toContain("Paddle");
  });
});

describe("marketplace status labels", () => {
  it("distinguishes invited, accepted, download opened, and expired", () => {
    expect(marketplaceStatusLabel({ campaignStatus: "ACTIVE", published: true })).toBe("ACTIVE");
    expect(marketplaceStatusLabel({ campaignStatus: "ACTIVE", published: true, acceptedAt: new Date() })).toBe("ACCEPTED");
    expect(
      marketplaceStatusLabel({
        campaignStatus: "ACTIVE",
        published: true,
        acceptedAt: new Date(),
        downloadLinkClickedAt: new Date(),
      }),
    ).toBe("DOWNLOAD LINK OPENED");
    expect(marketplaceStatusLabel({ campaignStatus: "EXPIRED", published: false })).toBe("EXPIRED");
  });
});
