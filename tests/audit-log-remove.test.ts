import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function source(file: string) {
  return readFileSync(resolve(file), "utf8");
}

describe("Remove own audit log entries", () => {
  it("labels the action Remove and confirms TestLoop-only removal", () => {
    const table = source("src/components/activity/audit-log-table.tsx");
    const page = source("src/app/activity/page.tsx");
    expect(page).toContain("AuditLogTable");
    expect(table).toContain("Remove");
    expect(table).not.toMatch(/>\s*Delete\s*</);
    expect(table).toContain("Remove this audit log entry from TestLoop?");
    expect(table).toContain("The selected audit log entry will be removed from TestLoop.");
    const copy = table.slice(table.indexOf("const CONFIRM_TITLE"), table.indexOf("export type AuditLogRow"));
    expect(copy).not.toMatch(/database|backend|Prisma|API|Firebase/i);
  });

  it("deletes only the signed-in user's own audit log row", () => {
    const audit = source("src/lib/audit.ts");
    const start = audit.indexOf("export async function removeOwnActivityLog");
    const next = audit.indexOf("export async function notify");
    const remove = audit.slice(start, next);
    expect(remove).toContain("activityLog.deleteMany");
    expect(remove).toContain("where: { id, userId }");
    expect(source("src/app/api/activity/[id]/route.ts")).toContain("removeOwnActivityLog");
  });
});
