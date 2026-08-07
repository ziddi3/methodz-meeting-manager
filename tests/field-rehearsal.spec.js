const { test, expect } = require("@playwright/test");
const fs = require("node:fs");

const BASE_URL = process.env.METHODZ_BASE_URL || "http://127.0.0.1:4173";

async function setAllResults(page, outcome) {
  const keys = await page.evaluate(() => window.MethodzFieldRehearsalCore.resultKeys);
  for (const key of keys) await page.locator(`#result-${key}`).selectOption(outcome);
}

test.describe("Field Rehearsal Evidence", () => {
  test("waits for explicit inspection and derives readiness without reading business storage", async ({ page }) => {
    await page.addInitScript(() => {
      const original = Storage.prototype.getItem;
      Object.defineProperty(window, "__methodzStorageReads", { value: 0, writable: true, configurable: true });
      Storage.prototype.getItem = function patchedGetItem(key) {
        window.__methodzStorageReads += 1;
        return original.call(this, key);
      };
    });

    await page.goto(`${BASE_URL}/rehearsal.html`);
    await expect(page.locator("#environmentStatus")).toHaveText("Environment not inspected.");
    expect(await page.evaluate(() => window.__methodzStorageReads)).toBe(0);

    await page.getByRole("button", { name: "Inspect Current Environment" }).click();
    await expect(page.locator("#environmentStatus")).toContainText("Inspected");
    expect(await page.evaluate(() => window.__methodzStorageReads)).toBe(0);

    await page.locator("#platformFamily").selectOption("desktop");
    await page.locator("#browserFamily").selectOption("chrome");
    await page.locator("#operatingSystemVersion").fill("26.1");
    await page.locator("#browserVersion").fill("140.0");
    await page.locator("#commitSha").fill("24b349917c88b7d73b0cc94ae5b4242d46b41d47");
    await setAllResults(page, "pass");
    await page.locator("#registeredPanels").fill("12");
    await page.locator("#resolvedPanels").fill("12");
    await page.locator("#blockingIssues").fill("55, 61");
    await page.getByRole("button", { name: "Review Evidence Readiness" }).click();

    await expect(page.locator("#readinessValue")).toHaveText("ready");
    await expect(page.locator("#passValue")).toHaveText("8");
    const evidence = await page.evaluate(() => window.MethodzFieldRehearsalV1620.getCurrentEvidence());
    expect(evidence.reportType).toBe("methodz-field-rehearsal-evidence");
    expect(evidence.appShellVersion).toBe("1.6.12");
    expect(evidence.recordSchemaVersion).toBe("1.6.0");
    expect(evidence.summary.readiness).toBe("ready");
    expect(evidence.blockingIssues).toEqual([55, 61]);
    expect(await page.evaluate(() => window.__methodzStorageReads)).toBe(0);
  });

  test("downloads structured metadata only", async ({ page }) => {
    await page.goto(`${BASE_URL}/rehearsal.html`);
    await page.locator("#platformFamily").selectOption("android");
    await page.locator("#browserFamily").selectOption("chrome");
    await setAllResults(page, "pass");

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Download Metadata Evidence" }).click()
    ]);
    expect(download.suggestedFilename()).toMatch(/^methodz-field-rehearsal-\d{4}-\d{2}-\d{2}\.json$/);
    const path = await download.path();
    const report = JSON.parse(fs.readFileSync(path, "utf8"));
    expect(report.summary.readiness).toBe("ready");
    expect(report.boundaries.containsMeetingContent).toBe(false);
    expect(report.boundaries.containsRecordIds).toBe(false);
    expect(report.boundaries.containsStorageValues).toBe(false);
    expect(report.boundaries.containsProviderSecrets).toBe(false);
    expect(report.boundaries.containsTransferContents).toBe(false);

    const serialized = JSON.stringify(report);
    for (const forbiddenKey of ["meetingTitle", "recordId", "attendeeName", "signature", "credential", "privateKey", "providerSecret", "queuePayload", "transferPackage"]) {
      expect(serialized).not.toContain(`\"${forbiddenKey}\"`);
    }
  });

  test("keeps non-pass outcomes visible and remains phone-safe", async ({ page }) => {
    await page.goto(`${BASE_URL}/rehearsal.html`);
    await setAllResults(page, "pass");
    await page.locator("#result-offlineReload").selectOption("blocked");
    await page.getByRole("button", { name: "Review Evidence Readiness" }).click();
    await expect(page.locator("#readinessValue")).toHaveText("blocked");
    await expect(page.locator("#blockedValue")).toHaveText("1");

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByRole("button", { name: "Inspect Current Environment" })).toHaveCSS("min-height", "44px");
    await expect(page.getByRole("button", { name: "Download Metadata Evidence" })).toHaveCSS("min-height", "44px");
    await expect(page.getByRole("link", { name: "Back to Workspace Home" })).toHaveCSS("min-height", "44px");
    const viewport = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
    expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.width + 2);
  });
});
