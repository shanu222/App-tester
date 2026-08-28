import { afterEach, describe, expect, it, vi } from "vitest";
import { mapPlayFailure } from "../src/lib/integrations/play-errors";
import {
  isTransientPlayError,
  withPlayRetry,
  withTimeout,
} from "../src/lib/integrations/play-retry";
import { fetchPlayJson } from "../src/lib/integrations/play-client-fetch";

describe("isTransientPlayError", () => {
  it("treats 429, 5xx, and reset/timeouts as retryable", () => {
    expect(isTransientPlayError({ response: { status: 429 } })).toBe(true);
    expect(isTransientPlayError({ status: 503 })).toBe(true);
    expect(isTransientPlayError({ code: "ECONNRESET" })).toBe(true);
    expect(isTransientPlayError({ code: "ETIMEDOUT" })).toBe(true);
    expect(isTransientPlayError(new Error("fetch failed"))).toBe(true);
  });

  it("does not retry permanent Google auth failures", () => {
    expect(isTransientPlayError({ response: { status: 400 }, message: "invalid_grant" })).toBe(false);
    expect(isTransientPlayError({ response: { status: 401 } })).toBe(false);
    expect(isTransientPlayError({ response: { status: 403 } })).toBe(false);
  });
});

describe("withTimeout", () => {
  it("rejects with PlayTimeoutError when Google does not answer", async () => {
    await expect(withTimeout(() => new Promise(() => undefined), 20)).rejects.toMatchObject({
      name: "PlayTimeoutError",
    });
  });
});

describe("withPlayRetry", () => {
  it("retries a transient failure then returns the successful result", async () => {
    let calls = 0;
    const result = await withPlayRetry(
      async () => {
        calls += 1;
        if (calls < 2) {
          throw Object.assign(new Error("temporarily unavailable"), { status: 503 });
        }
        return "ok";
      },
      { attempts: 3, timeoutMs: 0 },
    );
    expect(result).toBe("ok");
    expect(calls).toBe(2);
  });

  it("does not retry invalid_grant", async () => {
    let calls = 0;
    await expect(
      withPlayRetry(
        async () => {
          calls += 1;
          throw Object.assign(new Error("invalid_grant"), { status: 400 });
        },
        { attempts: 3, timeoutMs: 0 },
      ),
    ).rejects.toThrow(/invalid_grant/);
    expect(calls).toBe(1);
  });
});

describe("mapPlayFailure", () => {
  it("maps quota and timeouts to PLAY_UNAVAILABLE", () => {
    expect(mapPlayFailure({ response: { status: 429 } }, "fallback").code).toBe("PLAY_UNAVAILABLE");
    expect(
      mapPlayFailure(
        { response: { status: 403, data: { error: { status: "RESOURCE_EXHAUSTED" } } } },
        "fallback",
      ).code,
    ).toBe("PLAY_UNAVAILABLE");
    expect(mapPlayFailure(new Error("Google Play did not respond in time."), "fallback").code).toBe(
      "PLAY_UNAVAILABLE",
    );
  });
});

describe("fetchPlayJson", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("retries a 503 then returns the successful JSON", async () => {
    let calls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        calls += 1;
        if (calls === 1) {
          return new Response(JSON.stringify({ error: "busy" }), { status: 503 });
        }
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }),
    );
    const { response, data } = await fetchPlayJson("/api/google-play/apps");
    expect(response.ok).toBe(true);
    expect(data.ok).toBe(true);
    expect(calls).toBe(2);
  });
});
