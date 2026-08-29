import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function source(file: string) {
  return readFileSync(resolve(file), "utf8");
}

describe("one published posting per app", () => {
  it("tells the user the app is already published and offers Remove", () => {
    const wizard = source("src/components/apps/add-app-wizard.tsx");
    expect(wizard).toContain("This app is already published.");
    expect(wizard).toContain("AlreadyPublishedNotice");
    expect(wizard).toContain('{pending ? "Removing…" : "Remove"}');
    expect(wizard).toContain("remove: true");
    expect(wizard).toContain("does not remove the app or change Google Play");
  });

  it("blocks a second live posting for the same app", () => {
    const service = source("src/lib/services/campaigns.ts");
    const assertFn = service.slice(
      service.indexOf("export async function findActivePublishedCampaignForApp"),
      service.indexOf("export async function listCampaigns"),
    );
    expect(service).toContain('export const APP_ALREADY_PUBLISHED_MESSAGE = "This app is already published."');
    expect(assertFn).toContain("published: true");
    expect(assertFn).not.toContain("playTrack:");
    expect(service).toContain("assertAppNotAlreadyPublished");
    const publish = service.slice(
      service.indexOf("export async function publishCampaign"),
      service.indexOf("export async function removeTestingPost"),
    );
    expect(publish).toContain("assertAppNotAlreadyPublished");
  });
});
