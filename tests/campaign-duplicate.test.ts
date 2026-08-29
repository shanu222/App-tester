import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { alreadyPublishedForTypeMessage } from "../src/lib/services/campaigns";

function source(file: string) {
  return readFileSync(resolve(file), "utf8");
}

describe("one live posting per testing type", () => {
  it("tells the user the testing type is already published and offers Remove", () => {
    const wizard = source("src/components/apps/add-app-wizard.tsx");
    expect(wizard).toContain("This app is already published for Closed Testing.");
    expect(wizard).toContain("AlreadyPublishedNotice");
    expect(wizard).toContain('{pending ? "Removing…" : "Remove"}');
    expect(wizard).toContain("remove: true");
    expect(wizard).toContain("does not remove the app, its other");
    expect(wizard).toContain("testing postings");
  });

  it("names each testing type in the duplicate message", () => {
    expect(alreadyPublishedForTypeMessage("CLOSED")).toBe("This app is already published for Closed Testing.");
    expect(alreadyPublishedForTypeMessage("OPEN")).toBe("This app is already published for Open Testing.");
    expect(alreadyPublishedForTypeMessage("INTERNAL")).toBe("This app is already published for Internal Testing.");
  });

  it("blocks a second live posting for the same testing type only", () => {
    const service = source("src/lib/services/campaigns.ts");
    const assertFn = service.slice(
      service.indexOf("export async function findActivePublishedCampaignForApp"),
      service.indexOf("export async function listCampaigns"),
    );
    expect(assertFn).toContain("testingType,");
    expect(assertFn).toContain("published: true");
    expect(assertFn).not.toContain("playTrack:");
    expect(service).toContain("assertAppNotAlreadyPublished");
    expect(service).toContain("alreadyPublishedForTypeMessage(testingType)");
    const publish = service.slice(
      service.indexOf("export async function publishCampaign"),
      service.indexOf("export async function removeTestingPost"),
    );
    expect(publish).toContain("assertAppNotAlreadyPublished");
    expect(publish).toContain("campaign.testingType");
  });
});
