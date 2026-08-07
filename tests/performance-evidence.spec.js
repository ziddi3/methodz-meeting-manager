const { test, expect } = require("@playwright/test");
const fs = require("node:fs");

const BASE_URL = process.env.METHODZ_BASE_URL || "http://127.0.0.1:4173";

function report(generatedAt, durationMs, targetDurationMs = 750) {
  return {
    reportType: "methodz-workspace-capacity-rehearsal",
    reportVersion: "1.0.0",
    generatedAt,
    appShellVersion: "1.6.12",
    recordSchemaVersion: "1.6.0",
    capacity: {
      status: "healthy",
      utilizationPercent: 18.5,
      boundaries: {
        metadataOnly: true,
        rawKeysIncluded: false,
        rawValuesIncluded: false,
        automaticCleanup: false,
        recordMutation: false,
        synchronization: false
      }
    },
    performance: {
      durationMs,
      targetDurationMs,
      throughputTasksPerSecond: 8000,
      counts: {
        syntheticRecords: 1000,
        syntheticTasks: 4000,
        classifiedTasks: 4000,
        returnedReviewItems: 4000,
        reviewTruncated: false
      },
      boundaries: {
        metadataOnly: true,
        syntheticDataPersisted: false,
        browserStorageWritten: false,
        meetingRecordsMutated: false,
        automaticSynchronization: false
      }
    },
    boundaries: {
      metadataOnly: true,
      meetingContentIncluded: false,
      recordIdentifiersIncluded: false,
      storageKeyNamesIncluded: false,
      credentialsIncluded: false,
      privateKeysIncluded: false,
      signaturesIncluded: false,
      queuePayloadsIncluded: false
    }
  };
}

function uploadFile(name, value) {
  return { name, mimeType: "application/json", buffer: Buffer.from(JSON.stringify(value)) };
}

test.describe("Performance Evidence Compare", () => {
  test("loads evidence only after explicit action and never reads browser storage", async ({ page }) => {
    await page.addInitScript(() => {
      const original = Storage.prototype.getItem;
      Object.defineProperty(window, "__methodzStorageReads", { value: 0, writable: true, configurable: true });
      Storage.prototype.getItem = function patchedGetItem(key) {
        window.__methodzStorageReads += 1;
        return original.call(this, key);
      };
    });

    await page.goto(`${BASE_URL}/performance.html`);
    expect(await page.evaluate(() => window.__methodzStorageReads)).toBe(0);
    await expect(page.locator("#acceptedRunCount")).toHaveText("0");

    await page.locator("#performanceEvidenceFiles").setInputFiles([
      uploadFile("baseline.json", report("2026-08-01T12:00:00.000Z", 500)),
      uploadFile("latest.json", report("2026-08-02T12:00:00.000Z", 575))
    ]);
    await expect(page.locator("#acceptedRunCount")).toHaveText("0");
    expect(await page.evaluate(() => window.__methodzStorageReads)).toBe(0);

    await page.getByRole("button", { name: "Load Selected Evidence" }).click();
    await expect(page.locator("#acceptedRunCount")).toHaveText("2");
    expect(await page.evaluate(() => window.__methodzStorageReads)).toBe(0);

    await page.getByRole("button", { name: "Compare Loaded Evidence" }).click();
    await expect(page.locator("#performanceTrend")).toHaveText("regression");
    await expect(page.locator("#regressionPercent")).toHaveText("+15%");
    await expect(page.locator("#targetPassCount")).toHaveText("2/2");
    expect(await page.evaluate(() => window.__methodzStorageReads)).toBe(0);
  });

  test("rejects unsafe evidence and downloads a bounded metadata-only summary", async ({ page }) => {
    await page.goto(`${BASE_URL}/performance.html`);
    const unsafe = report("2026-08-03T12:00:00.000Z", 500);
    unsafe.boundaries.meetingContentIncluded = true;
    unsafe.meetingTitle = "FORBIDDEN_MEETING_TITLE";

    await page.locator("#performanceEvidenceFiles").setInputFiles([
      uploadFile("safe.json", report("2026-08-01T12:00:00.000Z", 500)),
      uploadFile("unsafe.json", unsafe)
    ]);
    await page.getByRole("button", { name: "Load Selected Evidence" }).click();
    await expect(page.locator("#acceptedRunCount")).toHaveText("1");
    await expect(page.locator("#rejectedRunCount")).toHaveText("1");
    await expect(page.locator("#performanceImportStatus")).toContainText("meetingContentIncluded");

    await page.getByRole("button", { name: "Compare Loaded Evidence" }).click();
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Download Comparison Summary" }).click()
    ]);
    expect(download.suggestedFilename()).toMatch(/^methodz-performance-evidence-summary-/);
    const path = await download.path();
    const summary = JSON.parse(fs.readFileSync(path, "utf8"));
    expect(summary.reportType).toBe("methodz-performance-evidence-summary");
    expect(summary.runCount).toBe(1);
    expect(summary.boundaries.metadataOnly).toBe(true);
    expect(summary.boundaries.importedReportsPersisted).toBe(false);
    expect(summary.boundaries.browserStorageRead).toBe(false);
    expect(summary.boundaries.browserStorageWritten).toBe(false);
    expect(summary.boundaries.providerCalls).toBe(false);
    expect(JSON.stringify(summary)).not.toContain("FORBIDDEN_MEETING_TITLE");
  });

  test("clears imported evidence and remains phone-safe", async ({ page }) => {
    await page.goto(`${BASE_URL}/performance.html`);
    await page.locator("#performanceEvidenceFiles").setInputFiles(uploadFile("run.json", report("2026-08-01T12:00:00.000Z", 500)));
    await page.getByRole("button", { name: "Load Selected Evidence" }).click();
    await expect(page.locator("#acceptedRunCount")).toHaveText("1");
    await page.getByRole("button", { name: "Clear In-Memory Evidence" }).click();
    await expect(page.locator("#acceptedRunCount")).toHaveText("0");
    await expect(page.locator("#performanceRunRows")).toContainText("No accepted evidence loaded");

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByRole("button", { name: "Load Selected Evidence" })).toHaveCSS("min-height", "44px");
    await expect(page.getByRole("button", { name: "Clear In-Memory Evidence" })).toHaveCSS("min-height", "44px");
    await expect(page.getByRole("link", { name: "Back to Workspace Home" })).toHaveCSS("min-height", "44px");
    const viewport = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
    expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.width + 2);
  });
});
