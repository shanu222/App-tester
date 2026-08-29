import { describe, expect, it } from "vitest";
import { mapInfrastructureError, publicErrorMessage } from "../src/lib/errors";

describe("infrastructure error mapping", () => {
  it("explains a missing ENCRYPTION_KEY instead of a generic failure", () => {
    const mapped = mapInfrastructureError(new Error("ENCRYPTION_KEY is required in production."));
    expect(mapped?.code).toBe("ENCRYPTION_KEY_MISSING");
    expect(mapped?.message).toContain("ENCRYPTION_KEY");
    expect(publicErrorMessage(new Error("ENCRYPTION_KEY is required in production."))).toContain(
      "ENCRYPTION_KEY",
    );
  });

  it("explains a missing GooglePlayConnection table", () => {
    const mapped = mapInfrastructureError({ code: "P2021", message: 'The table `public.GooglePlayConnection` does not exist in the current database.' });
    expect(mapped?.code).toBe("PLAY_SCHEMA_MISSING");
    expect(mapped?.message).toContain("migrations");
  });

  it("does not claim a random error is a missing table", () => {
    expect(mapInfrastructureError(new Error("socket hang up"))).toBeNull();
    expect(publicErrorMessage(new Error("socket hang up"))).toBe("An unexpected error occurred. Please try again.");
  });

  it("does not describe managed-testing Prisma failures as Google Play errors", () => {
    const mapped = mapInfrastructureError({
      code: "P2002",
      meta: { modelName: "ManagedTestingPayment", target: ["paddleTransactionId"] },
      message: "Unique constraint failed on the fields: (`paddleTransactionId`)",
    });
    expect(mapped?.code).toBe("UNIQUE_CONSTRAINT");
    expect(mapped?.message).not.toMatch(/google play/i);
  });

  it("maps a missing unrelated Prisma table without mentioning Google Play", () => {
    const mapped = mapInfrastructureError({
      code: "P2021",
      meta: { modelName: "ManagedTestingPayment" },
      message: "The table `public.ManagedTestingPayment` does not exist in the current database.",
    });
    expect(mapped?.code).toBe("SCHEMA_MISSING");
    expect(mapped?.message).not.toMatch(/google play/i);
  });

  it("still explains a missing GooglePlayConnection table as a Play schema issue", () => {
    const mapped = mapInfrastructureError({
      code: "P2021",
      meta: { modelName: "GooglePlayConnection" },
      message: "The table `public.GooglePlayConnection` does not exist in the current database.",
    });
    expect(mapped?.code).toBe("PLAY_SCHEMA_MISSING");
  });
});
