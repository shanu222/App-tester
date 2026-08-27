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
    expect(publicErrorMessage(new Error("socket hang up"))).toBe(
      "Something went wrong. Please try again.",
    );
  });
});
