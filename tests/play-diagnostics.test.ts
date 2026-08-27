import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseGoogleApiError, redactSecrets } from "../src/lib/integrations/google-api-error";

const FAKE_KEY = "-----BEGIN PRIVATE KEY-----\nMIIBVgIBADANBgkq\n-----END PRIVATE KEY-----\n";

function serviceAccountJson(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    type: "service_account",
    project_id: "testloop-play",
    private_key_id: "abc123",
    private_key: FAKE_KEY,
    client_email: "play-bot@testloop-play.iam.gserviceaccount.com",
    ...overrides,
  });
}

/** Google's error envelope for a disabled API. */
function serviceDisabledBody() {
  return {
    error: {
      code: 403,
      status: "PERMISSION_DENIED",
      message:
        "Google Play Android Developer API has not been used in project 12345 before or it is disabled.",
      details: [{ reason: "SERVICE_DISABLED" }],
    },
  };
}

vi.mock("google-auth-library", () => ({
  JWT: class {
    async authorize() {
      return { access_token: "test-access-token" };
    }
  },
}));

let parseServiceAccount: typeof import("../src/lib/integrations/play-diagnostics")["parseServiceAccount"];
let runPlayDiagnostics: typeof import("../src/lib/integrations/play-diagnostics")["runPlayDiagnostics"];
let runPlayOAuthDiagnostics: typeof import("../src/lib/integrations/play-diagnostics")["runPlayOAuthDiagnostics"];

beforeEach(async () => {
  const mod = await import("../src/lib/integrations/play-diagnostics");
  parseServiceAccount = mod.parseServiceAccount;
  runPlayDiagnostics = mod.runPlayDiagnostics;
  runPlayOAuthDiagnostics = mod.runPlayOAuthDiagnostics;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubFetch(responder: (url: string) => { status: number; body: unknown }) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL) => {
      const { status, body } = responder(String(input));
      return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    }),
  );
}

async function validAccount() {
  const parsed = parseServiceAccount(serviceAccountJson());
  if (!parsed.ok) throw new Error(parsed.message);
  return parsed.serviceAccount;
}

describe("service account validation", () => {
  it("accepts a well-formed key and exposes only safe fields", () => {
    const parsed = parseServiceAccount(serviceAccountJson());
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.serviceAccount.clientEmail).toBe("play-bot@testloop-play.iam.gserviceaccount.com");
    expect(parsed.serviceAccount.projectId).toBe("testloop-play");
  });

  it("rejects text that is not JSON without echoing it", () => {
    const parsed = parseServiceAccount("not json at all");
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.message).toContain("not valid JSON");
    expect(parsed.message).not.toContain("not json at all");
  });

  it("rejects an OAuth client secret file", () => {
    const parsed = parseServiceAccount(JSON.stringify({ web: { client_id: "x" } }));
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.message).toContain('"type" field is missing');
  });

  it("rejects a key with no PEM block", () => {
    const parsed = parseServiceAccount(serviceAccountJson({ private_key: "oops" }));
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.message).toContain("private_key");
  });

  it("never includes private key material in a validation message", () => {
    const parsed = parseServiceAccount(serviceAccountJson({ client_email: "bad" }));
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.message).not.toContain("BEGIN PRIVATE KEY");
    expect(parsed.message).not.toContain("MIIBVgIBADANBgkq");
  });

  it("repairs double-escaped newlines in the PEM", () => {
    const parsed = parseServiceAccount(
      serviceAccountJson({ private_key: FAKE_KEY.replace(/\n/g, "\\n") }),
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.serviceAccount.privateKey).toContain("\n");
    expect(parsed.serviceAccount.privateKey).not.toContain("\\n");
  });
});

describe("play diagnostics classification", () => {
  it("reports a disabled Play Developer API instead of a generic failure", async () => {
    stubFetch(() => ({ status: 403, body: serviceDisabledBody() }));
    const result = await runPlayDiagnostics(await validAccount());
    expect(result.connected).toBe(false);
    expect(result.errorCode).toBe("PLAY_API_NOT_ENABLED");
    expect(result.apiReachable).toBe(false);
    expect(result.googleReason).toBe("SERVICE_DISABLED");
    expect(result.errorMessage).not.toContain("Something went wrong");
  });

  it("reports a service account missing from Play Console on 401", async () => {
    stubFetch(() => ({
      status: 401,
      body: {
        error: {
          code: 401,
          status: "UNAUTHENTICATED",
          message: "The current user has insufficient permissions to perform the requested operation.",
        },
      },
    }));
    const result = await runPlayDiagnostics(await validAccount());
    expect(result.errorCode).toBe("PLAY_CONSOLE_NOT_LINKED");
    expect(result.apiReachable).toBe(true);
    expect(result.playConsoleAuthorized).toBe(false);
  });

  it("reports insufficient Play Console permissions on a plain 403", async () => {
    stubFetch(() => ({
      status: 403,
      body: { error: { code: 403, status: "PERMISSION_DENIED", message: "Caller lacks permission." } },
    }));
    const result = await runPlayDiagnostics(await validAccount());
    expect(result.errorCode).toBe("PLAY_CONSOLE_INSUFFICIENT_PERMISSIONS");
  });

  it("connects without a package once Play accepts the credentials", async () => {
    stubFetch(() => ({
      status: 404,
      body: { error: { code: 404, status: "NOT_FOUND", message: "Package not found: com.testloop.connectioncheck." } },
    }));
    const result = await runPlayDiagnostics(await validAccount());
    expect(result.connected).toBe(true);
    expect(result.apiReachable).toBe(true);
    expect(result.playConsoleAuthorized).toBe(true);
    expect(result.packageAccessible).toBeNull();
  });

  it("confirms package access when Play accepts an edit on that package", async () => {
    stubFetch((url) =>
      url.includes("com.example.app")
        ? { status: 200, body: { id: "1234567890" } }
        : { status: 404, body: { error: { code: 404, message: "Package not found: probe." } } },
    );
    const result = await runPlayDiagnostics(await validAccount(), "com.example.app");
    expect(result.connected).toBe(true);
    expect(result.packageAccessible).toBe(true);
    expect(result.checkedPackageName).toBe("com.example.app");
  });

  it("reports an inaccessible package distinctly from an unlinked account", async () => {
    stubFetch((url) =>
      url.includes("com.example.missing")
        ? {
            status: 404,
            body: { error: { code: 404, status: "NOT_FOUND", message: "Package not found: com.example.missing." } },
          }
        : { status: 404, body: { error: { code: 404, message: "Package not found: probe." } } },
    );
    const result = await runPlayDiagnostics(await validAccount(), "com.example.missing");
    expect(result.connected).toBe(false);
    expect(result.errorCode).toBe("PLAY_PACKAGE_NOT_FOUND");
    expect(result.playConsoleAuthorized).toBe(true);
    expect(result.packageAccessible).toBe(false);
  });

  it("reports quota and outage separately", async () => {
    stubFetch(() => ({ status: 429, body: { error: { code: 429, message: "Quota exceeded." } } }));
    expect((await runPlayDiagnostics(await validAccount())).errorCode).toBe("PLAY_QUOTA_EXCEEDED");

    stubFetch(() => ({ status: 503, body: { error: { code: 503, message: "Backend unavailable." } } }));
    expect((await runPlayDiagnostics(await validAccount())).errorCode).toBe("PLAY_API_UNAVAILABLE");
  });

  it("reports a network failure without leaking the request", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("fetch failed");
      }),
    );
    const result = await runPlayDiagnostics(await validAccount());
    expect(result.errorCode).toBe("PLAY_NETWORK_ERROR");
    expect(result.errorMessage).toContain("androidpublisher.googleapis.com");
  });

  it("probes Play with edits.insert, never a made-up edit id", async () => {
    const calls: Array<{ url: string; method: string }> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL, init?: RequestInit) => {
        calls.push({ url: String(input), method: init?.method ?? "GET" });
        return new Response(JSON.stringify({ error: { code: 404, message: "Package not found." } }), {
          status: 404,
        });
      }),
    );
    const result = await runPlayDiagnostics(await validAccount(), "com.example.app");
    expect(result.scope).toBe("https://www.googleapis.com/auth/androidpublisher");
    expect(calls.length).toBeGreaterThan(0);
    for (const call of calls) {
      expect(call.url).toContain("androidpublisher.googleapis.com");
      expect(call.url).not.toContain("testloop-readonly-probe");
    }
    expect(calls.some((call) => call.method === "POST")).toBe(true);
  });

  it("never returns key material in the diagnostic payload", async () => {
    stubFetch(() => ({
      status: 404,
      body: { error: { code: 404, message: "Package not found: com.testloop.connectioncheck." } },
    }));
    const result = await runPlayDiagnostics(await validAccount());
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("BEGIN PRIVATE KEY");
    expect(serialized).not.toContain("MIIBVgIBADANBgkq");
    expect(serialized).not.toContain("test-access-token");
  });
});

describe("oauth connections", () => {
  it("verifies a developer's Google account against the real API", async () => {
    stubFetch(() => ({ status: 404, body: { error: { code: 404, message: "Edit not found." } } }));
    const result = await runPlayOAuthDiagnostics({
      email: "developer@example.com",
      mintAccessToken: async () => "oauth-access-token",
    });
    expect(result.connected).toBe(true);
    expect(result.method).toBe("OAUTH");
    expect(result.accountEmail).toBe("developer@example.com");
    // A service-account field must stay empty for an OAuth connection.
    expect(result.serviceAccountEmail).toBeNull();
  });

  it("reports a revoked grant instead of a generic failure", async () => {
    const result = await runPlayOAuthDiagnostics({
      email: "developer@example.com",
      mintAccessToken: async () => {
        throw Object.assign(new Error("bad grant"), {
          response: { data: { error: "invalid_grant" } },
        });
      },
    });
    expect(result.connected).toBe(false);
    expect(result.errorCode).toBe("OAUTH_AUTH_FAILED");
    expect(result.errorMessage).toContain("revoked access");
  });

  it("treats a missing token as expired authorisation", async () => {
    const result = await runPlayOAuthDiagnostics({
      email: null,
      mintAccessToken: async () => null,
    });
    expect(result.connected).toBe(false);
    expect(result.errorCode).toBe("OAUTH_AUTH_FAILED");
  });

  it("explains the Play Console gap in account terms, not service-account terms", async () => {
    stubFetch(() => ({
      status: 401,
      body: { error: { code: 401, message: "The current user has insufficient permissions." } },
    }));
    const result = await runPlayOAuthDiagnostics({
      email: "developer@example.com",
      mintAccessToken: async () => "oauth-access-token",
    });
    expect(result.errorCode).toBe("PLAY_CONSOLE_NOT_LINKED");
    expect(result.errorMessage).toContain("Google account");
    expect(result.errorMessage).not.toContain("service account");
  });

  it("never returns the access token in the payload", async () => {
    stubFetch(() => ({ status: 404, body: { error: { code: 404, message: "Edit not found." } } }));
    const result = await runPlayOAuthDiagnostics({
      email: "developer@example.com",
      mintAccessToken: async () => "super-secret-oauth-token",
    });
    expect(JSON.stringify(result)).not.toContain("super-secret-oauth-token");
  });
});

describe("google error envelope", () => {
  it("extracts status, reason, and message", () => {
    const parsed = parseGoogleApiError(403, serviceDisabledBody());
    expect(parsed.httpStatus).toBe(403);
    expect(parsed.status).toBe("PERMISSION_DENIED");
    expect(parsed.reason).toBe("SERVICE_DISABLED");
    expect(parsed.message).toContain("has not been used in project");
  });

  it("falls back to the HTTP status when Google sends no envelope", () => {
    expect(parseGoogleApiError(500, {}).message).toContain("HTTP 500");
  });

  it("redacts PEM blocks and long tokens", () => {
    expect(redactSecrets(`key=${FAKE_KEY}`)).not.toContain("MIIBVgIBADANBgkq");
    expect(redactSecrets(`key=${FAKE_KEY}`)).toContain("[redacted key]");
    expect(redactSecrets(`token=${"a".repeat(200)}`)).toContain("[redacted]");
  });
});
