import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { walletPurchaseMethods } from "../src/lib/managed-testing/methods";

function source(file: string) {
  return readFileSync(resolve(file), "utf8");
}

describe("managed testing navigation and dashboard card", () => {
  it("sends Payments & Packages from the dashboard to Managed Testing, not Settings", () => {
    const dashboard = source("src/app/dashboard/page.tsx");
    expect(dashboard).toContain('href="/managed-testing/payments"');
    expect(dashboard).toContain("Payments & Packages");
    expect(dashboard).toContain('href="/managed-testing"');
    expect(dashboard).toContain("Open Managed Testing");
    expect(dashboard).toContain("Managed Testing area");
    expect(dashboard).not.toMatch(/href="\/settings"[\s\S]{0,80}Payments & Packages/);
    expect(dashboard).not.toMatch(/Payments & Packages[\s\S]{0,80}href="\/settings"/);
  });

  it("highlights the Managed Beta Testing dashboard card without replacing other cards", () => {
    const dashboard = source("src/app/dashboard/page.tsx");
    expect(dashboard).toContain("Managed Beta Testing");
    expect(dashboard).toContain("from-brand-soft");
    expect(dashboard).toContain("border-brand/25");
    expect(dashboard).toContain('aria-label="Open Managed Testing"');
  });

  it("keeps a PRO badge on the developer Managed Testing sidebar item", () => {
    const shell = source("src/components/layout/app-shell.tsx");
    expect(shell).toContain('href: "/managed-testing"');
    expect(shell).toContain('label: "Managed Testing"');
    expect(shell).toContain('badge: "PRO"');
    const nav = source("src/components/layout/sidebar-nav.tsx");
    expect(nav).toContain("item.badge");
    expect(nav).toContain("{item.label}");
  });

  it("renders Managed Testing payments with package, methods, history, and active package", () => {
    const page = source("src/app/managed-testing/payments/page.tsx");
    expect(page).toContain("PaymentsPackagesPanel");
    expect(page).toContain("UsdTwelvePackageCard");
    expect(page).toContain("walletPurchaseMethods");
    expect(page).toContain("Paddle");
    expect(page).toContain("activePackage");
    expect(page).toContain("allocation");
    for (const label of ["EasyPaisa", "JazzCash", "SadaPay", "NayaPay", "Binance"]) {
      expect(walletPurchaseMethods().some((item) => item.shortLabel === label)).toBe(true);
    }
  });
});
