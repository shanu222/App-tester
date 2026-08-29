import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function source(file: string) {
  return readFileSync(resolve(file), "utf8");
}

describe("Remove app from TestLoop", () => {
  it("offers Remove on every My Apps card and confirms TestLoop-only cleanup", () => {
    const workspace = source("src/components/apps/my-apps-workspace.tsx");
    const dialog = source("src/components/apps/remove-app-button.tsx");

    expect(workspace).toContain("RemoveAppButton");
    expect(dialog).toContain("Remove");
    expect(dialog).not.toMatch(/>\s*Delete\s*</);
    expect(dialog).toContain("Remove this app from TestLoop?");
    expect(dialog).toContain(
      "This will only remove the app and its TestLoop data from TestLoop. It will NOT delete or modify the app in Google Play Console.",
    );
    expect(dialog).toContain('method: "DELETE"');
  });

  it("removes TestLoop data in a transaction and never calls Google Play", () => {
    const service = source("src/lib/services/apps.ts");
    const start = service.indexOf("export async function removeAppFromTestLoop");
    const next = service.indexOf("export async function listAppsWithStats");
    const remove = service.slice(start, next);
    const route = source("src/app/api/apps/[id]/route.ts");

    expect(remove).toContain("prisma.$transaction");
    expect(remove).toContain("tx.app.delete");
    expect(remove).toContain("googlePlayApp.updateMany");
    expect(remove).not.toContain("androidpublisher");
    expect(remove).not.toContain("listPlayTracks");
    expect(remove).not.toContain("searchPlayApps");
    expect(route).toContain("removeAppFromTestLoop");
    expect(route).toContain("export async function DELETE");
  });
});
