import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function source(file: string) {
  return readFileSync(resolve(file), "utf8");
}

describe("Delete Account", () => {
  it("shows a plain-language confirmation with the required wording", () => {
    const ui = source("src/components/settings/delete-account.tsx");
    const settings = source("src/app/settings/page.tsx");

    expect(settings).toContain("DeleteAccountCard");
    expect(ui).toContain("Delete Account");
    expect(ui).toContain("Delete your TestLoop account?");
    expect(ui).toContain(
      "This action is permanent. Your account and all your TestLoop data will be permanently deleted. This cannot be undone. If you return later, you will need to create a new account.",
    );
    expect(ui).toContain("Yes, Delete My Account");

    const title = ui.slice(ui.indexOf("const CONFIRM_TITLE"), ui.indexOf("export function DeleteAccountCard"));
    expect(title).not.toMatch(/Firebase|database|backend|Prisma|API|server/i);
  });

  it("permanently deletes TestLoop records and never calls Google Play", () => {
    const service = source("src/lib/services/account.ts");
    const route = source("src/app/api/account/route.ts");
    const ui = source("src/components/settings/delete-account.tsx");

    expect(service).toContain("prisma.$transaction");
    expect(service).toContain("tx.user.delete");
    expect(service).toContain("managedTestingCampaign.deleteMany");
    expect(service).toContain("managedTestingPayment.deleteMany");
    expect(service).not.toContain("androidpublisher");
    expect(service).not.toContain("listPlayTracks");
    expect(route).toContain("deleteTestLoopAccount");
    expect(ui).toContain('callbackUrl: "/"');
  });
});
