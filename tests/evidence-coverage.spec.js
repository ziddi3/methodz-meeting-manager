const { test, expect } = require("@playwright/test");
const fs = require("node:fs");

const BASE_URL = process.env.METHODZ_BASE_URL || "http://127.0.0.1:4173";
const COMMIT_A = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const COMMIT_B = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

function report({
  generatedAt = "2026-08-08T12:00:00.000Z",
  commitSha = COMMIT_A,
  platformFamily = "desktop",
  browserFamily = "chrome",
  readiness = "ready",
  blockingIssues = []
} = {}) {
  const viewportClass = platformFamily === "android" || platformFamily === "ios" ? "phone" : platformFamily === "tablet" ? "tablet" : "desktop";
  return {
    reportType: "methodz-field-rehearsal-evidence",
    reportVersion: "1.0.0",
    appShellVersion: "1.6.12",
    recordSchemaVersion: "1.6.0",
    generatedAt,
    commitSha,
    environment: {
      platformFamily,
      operatingSystemVersion: "1.0",
      browserFamily,
      browserVersion: "1.0",
      viewportClass,
      serviceWorkerMode: "https",
      serviceWorkerControlled: true,
      online: true,
      viewportWidth: viewportClass === "phone" ? 390 : viewportClass === "tablet" ? 820 : 1440,
      viewportHeight: viewportClass === "phone" ? 844 : viewportClass === "tablet" ? 1180 : 900
    },
    summary: {
      readiness,
      metadataComplete: true,
      requiredChecks: 8,
      pass: readiness === "ready" ? 8 : 7,
      fail: readiness === "fail" ? 1 : 0,
      blocked: readiness === "blocked" ? 1 : 0,
      notApplicable: 0,
      notRun: readiness === "incomplete" ? 1 : 0
    },
    blockingIssues,
    boundaries: {
      containsMeetingContent: false,
      containsRecordIds: false,
      containsAttendeeNames: false,
      containsSignatures: false,
      containsCredentials: false,
      containsPrivateKeyMaterial: false,
      containsStorageKeys: false,
      containsStorageValues: false,
      containsProviderSecrets: false,
      containsQueuePayloads: false,
      containsTransferContents: false,
      provesDeviceIdentity: false,
      provesDelivery: false,
      provesAuthorization: false,
      provesLegalApproval: false
    }
  };
}

function uploadFile(name, value) {
  return { name, mimeType: "application/json", buffer: Buffer.from(JSON.stringify(value)) };
}

function readyMatrix(commitSha = COMMIT_A) {
  return [
    report({ commitSha, platformFamily: "desktop", browserFamily: "chrome", generatedAt: "2026-08-08T12:00:01.000Z" }),
    report({ commitSha, platformFamily: "desktop", browserFamily: "firefox", generatedAt: "2026-08-08T12:00:02.000Z" }),
    report({ commitSha, platformFamily: "android", browserFamily: "chrome", generatedAt: "2026-08-08T12:00:03.000Z" }),
    report({ commitSha, platformFamily: "ios", browserFamily: "safari", generatedAt: "2026-08-08T12:00:04.000Z" }),
    report({ commitSha, platformFamily: "tablet", browserFamily: "chrome", generatedAt: "2026-08-08T12:00:05.000Z" }),
    report({ commitSha, platformFamily: "two-device", browserFamily: "chrome", generatedAt: "2026-08-08T12:00:06.000Z" })
  ];
}

test.describe("Field Evidence Coverage", () => {
  test("loads only after explicit action and refuses to combine different commits", async ({ page }) => {
    await page.addInitScript(() => {
      const original = Storage.prototype.getItem;
      Object.defineProperty(window, "__methodzStorageReads", { value: 0, writable: true, configurable: true });
      Storage.prototype.getItem = function patchedGetItem(key) {
        window.__methodzStorageReads += 1;
        return original.call(this, key);
      };
    });

    await page.goto(`${BASE_URL}/evidence.html`);
    expect(await page.evaluate(() => window.__methodzStorageReads)).toBe(0);
    await expect(page.locator("#evidenceAcceptedCount")).toHaveText("0");

    await page.locator("#evidenceCoverageFiles").setInputFiles([
      uploadFile("a.json", report({ commitSha: COMMIT_A })),
      uploadFile("b.json", report({ commitSha: COMMIT_B, platformFamily: "android", browserFamily: "chrome" }))
    ]);
    await expect(page.locator("#evidenceAcceptedCount")).toHaveText("0");
    expect(await page.evaluate(() => window.__methodzStorageReads)).toBe(0);

    await page.getByRole("button", { name: "Load Selected Evidence" }).click();
    await expect(page.locator("#evidenceAcceptedCount")).toHaveText("2");
    await expect(page.locator("#evidenceCommitCount")).toHaveText("2");
    await expect(page.locator("#evidenceCoverageImportStatus")).toContainText("will not be combined");
    await expect(page.getByRole("button", { name: "Evaluate Selected Commit" })).toBeDisabled();
    expect(await page.evaluate(() => window.__methodzStorageReads)).toBe(0);

    await page.locator("#evidenceCoverageCommit").selectOption(COMMIT_A);
    await page.getByRole("button", { name: "Evaluate Selected Commit" }).click();
    await expect(page.locator("#coverageReady")).toHaveText("1/6");
    await expect(page.locator("#coverageMissing")).toHaveText("5");
    expect(await page.evaluate(() => window.__methodzStorageReads)).toBe(0);
  });

  test("reports same-commit coverage completeness and downloads metadata only", async ({ page }) => {
    await page.goto(`${BASE_URL}/evidence.html`);
    const files = readyMatrix().map((value, index) => uploadFile(`run-${index + 1}.json`, value));
    await page.locator("#evidenceCoverageFiles").setInputFiles(files);
    await page.getByRole("button", { name: "Load Selected Evidence" }).click();
    await expect(page.locator("#evidenceAcceptedCount")).toHaveText("6");
    await expect(page.locator("#evidenceCommitCount")).toHaveText("1");
    await expect(page.getByRole("button", { name: "Evaluate Selected Commit" })).toBeEnabled();

    await page.getByRole("button", { name: "Evaluate Selected Commit" }).click();
    await expect(page.locator("#coverageOverall")).toHaveText("coverage-complete");
    await expect(page.locator("#coverageReady")).toHaveText("6/6");
    await expect(page.locator("#evidenceCoverageRows tr")).toHaveCount(6);
    await expect(page.locator("#evidenceCoverageStatus")).toContainText("coverage completeness only, not production readiness");

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Download Coverage Summary" }).click()
    ]);
    expect(download.suggestedFilename()).toMatch(/^methodz-field-evidence-coverage-/);
    const path = await download.path();
    const summary = JSON.parse(fs.readFileSync(path, "utf8"));
    expect(summary.reportType).toBe("methodz-field-evidence-coverage-summary");
    expect(summary.status).toBe("coverage-complete");
    expect(summary.commitSha).toBe(COMMIT_A);
    expect(summary.rows).toHaveLength(6);
    expect(summary.boundaries.metadataOnly).toBe(true);
    expect(summary.boundaries.importedReportsPersisted).toBe(false);
    expect(summary.boundaries.browserStorageRead).toBe(false);
    expect(summary.boundaries.browserStorageWritten).toBe(false);
    expect(summary.boundaries.providerCalls).toBe(false);
    expect(summary.boundaries.provesProductionReadiness).toBe(false);
  });

  test("rejects unsafe evidence, clears memory, and remains phone-safe", async ({ page }) => {
    await page.goto(`${BASE_URL}/evidence.html`);
    const unsafe = report();
    unsafe.boundaries.containsMeetingContent = true;
    unsafe.meetingTitle = "FORBIDDEN_MEETING_TITLE";

    await page.locator("#evidenceCoverageFiles").setInputFiles([
      uploadFile("safe.json", report({ blockingIssues: [59] })),
      uploadFile("unsafe.json", unsafe)
    ]);
    await page.getByRole("button", { name: "Load Selected Evidence" }).click();
    await expect(page.locator("#evidenceAcceptedCount")).toHaveText("1");
    await expect(page.locator("#evidenceRejectedCount")).toHaveText("1");
    await expect(page.locator("#evidenceCoverageImportStatus")).toContainText("containsMeetingContent");

    await page.getByRole("button", { name: "Clear In-Memory Evidence" }).click();
    await expect(page.locator("#evidenceAcceptedCount")).toHaveText("0");
    await expect(page.locator("#evidenceCommitCount")).toHaveText("0");
    await expect(page.locator("#evidenceCoverageRows tr")).toHaveCount(6);

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByRole("button", { name: "Load Selected Evidence" })).toHaveCSS("min-height", "44px");
    await expect(page.getByRole("button", { name: "Clear In-Memory Evidence" })).toHaveCSS("min-height", "44px");
    await expect(page.getByRole("link", { name: "Back to Workspace Home" })).toHaveCSS("min-height", "44px");
    const viewport = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
    expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.width + 2);
  });
});
