import { describe, expect, it } from "vitest";
import {
  filterInboxItems,
  sanitizeInboxHref,
  toPublicInboxItem,
  unreadInboxCount,
} from "../src/lib/inbox";

describe("inbox public payload", () => {
  it("omits campaign, user, and type fields from the user-facing item", () => {
    const publicItem = toPublicInboxItem({
      id: "note_1",
      title: "New tester joined",
      body: "A tester joined your TestLoop testing request.",
      href: "/campaigns/camp_secret",
      readAt: null,
      createdAt: new Date("2026-08-28T11:00:00.000Z"),
      campaignId: "camp_secret",
      type: "tester",
      userId: "user_secret",
    });
    const blob = JSON.stringify(publicItem);
    expect(publicItem).not.toHaveProperty("campaignId");
    expect(publicItem).not.toHaveProperty("userId");
    expect(publicItem).not.toHaveProperty("type");
    expect(blob).not.toMatch(/packageName|SMTP_|CRON_SECRET|com\.[a-z]/i);
    expect(publicItem.href).toBe("/campaigns/camp_secret");
    expect(publicItem.readAt).toBeNull();
  });
});

describe("sanitizeInboxHref", () => {
  it("allows in-app paths and http(s) links", () => {
    expect(sanitizeInboxHref("/play")).toBe("/play");
    expect(sanitizeInboxHref("https://play.google.com/console")).toBe("https://play.google.com/console");
  });

  it("rejects protocol-relative and javascript URLs", () => {
    expect(sanitizeInboxHref("//evil.example/phish")).toBeNull();
    expect(sanitizeInboxHref("javascript:alert(1)")).toBeNull();
    expect(sanitizeInboxHref("")).toBeNull();
  });
});

describe("inbox filters", () => {
  const items = [
    {
      id: "1",
      title: "Unread",
      body: "Body",
      href: "/play",
      readAt: null,
      createdAt: "2026-08-28T11:00:00.000Z",
    },
    {
      id: "2",
      title: "Read",
      body: "Body",
      href: null,
      readAt: "2026-08-28T12:00:00.000Z",
      createdAt: "2026-08-28T10:00:00.000Z",
    },
  ];

  it("filters all, unread, and read without dropping the other state", () => {
    expect(filterInboxItems(items, "all")).toHaveLength(2);
    expect(filterInboxItems(items, "unread").map((item) => item.id)).toEqual(["1"]);
    expect(filterInboxItems(items, "read").map((item) => item.id)).toEqual(["2"]);
    expect(unreadInboxCount(items)).toBe(1);
  });
});
