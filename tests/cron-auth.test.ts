import { afterEach, describe, expect, it, vi } from "vitest";

function cronRequest(auth?: string, secret?: string) {
  const url = new URL("https://www.testloop.org/api/cron/daily-testing-summary");
  if (secret) url.searchParams.set("secret", secret);
  return {
    headers: {
      get(name: string) {
        if (name.toLowerCase() === "authorization") return auth || null;
        return null;
      },
    },
    nextUrl: url,
  };
}

describe("verifyCron", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("returns a configuration error when CRON_SECRET is missing", async () => {
    vi.resetModules();
    vi.stubEnv("CRON_SECRET", "");
    const { verifyCron } = await import("../src/lib/cron-auth");
    const { AppError } = await import("../src/lib/errors");
    try {
      verifyCron(cronRequest("Bearer anything") as never);
      throw new Error("expected verifyCron to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as InstanceType<typeof AppError>).code).toBe("CRON_SECRET_MISSING");
      expect((error as InstanceType<typeof AppError>).status).toBe(500);
      expect(String((error as InstanceType<typeof AppError>).message)).toMatch(/Environment Variables/);
      expect(JSON.stringify(error)).not.toMatch(/SMTP_PASSWORD|SMTP_USER/);
    }
  });

  it("rejects an invalid secret without echoing CRON_SECRET", async () => {
    vi.resetModules();
    vi.stubEnv("CRON_SECRET", "unit-test-cron-secret");
    const { verifyCron } = await import("../src/lib/cron-auth");
    const { ForbiddenError } = await import("../src/lib/errors");
    try {
      verifyCron(cronRequest("Bearer wrong-secret") as never);
      throw new Error("expected verifyCron to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(ForbiddenError);
      expect((error as InstanceType<typeof ForbiddenError>).status).toBe(403);
      expect(String((error as Error).message)).not.toContain("unit-test-cron-secret");
      expect(String((error as Error).message)).not.toContain("CRON_SECRET=");
    }
  });

  it("accepts a matching bearer token", async () => {
    vi.resetModules();
    vi.stubEnv("CRON_SECRET", "unit-test-cron-secret");
    const { verifyCron } = await import("../src/lib/cron-auth");
    expect(() => verifyCron(cronRequest("Bearer unit-test-cron-secret") as never)).not.toThrow();
  });
});
