import { describe, expect, it } from "vitest";
import { contentHash, dayKey, hourKey, secureCompare } from "../src/lib/crypto";

describe("idempotency helpers", () => {
  it("hashes post content stably", () => {
    expect(contentHash("Hello   World")).toBe(contentHash("hello world"));
    expect(contentHash("a")).not.toBe(contentHash("b"));
  });

  it("compares secrets without throwing on length mismatch", () => {
    expect(secureCompare("cron-secret", "cron-secret")).toBe(true);
    expect(secureCompare("cron-secret", "other")).toBe(false);
  });

  it("builds hour and day keys", () => {
    const date = new Date("2026-08-26T14:00:00.000Z");
    expect(hourKey(date)).toBe("2026-08-26T14");
    expect(dayKey(date)).toBe("2026-08-26");
  });
});
