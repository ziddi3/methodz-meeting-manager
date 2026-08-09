const { test, expect } = require("@playwright/test");

const BASE_URL = "http://127.0.0.1:4173/evidence.html";
const COMMIT = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

function coveragePayload(overrides = {}) {
  const states = {
    desktopChromium: "ready",
    desktopNonChromium: "ready",
    androidChrome: "ready",
    iosSafari: "ready",
    tablet: "ready",
    twoDevice: "ready",
    ...overrides
  };
  const defs = [
    ["desktopChromium", "Desktop Chromium", "desktop", "chrome"],
    ["desktopNonChromium", "Desktop non-Chromium", "desktop", "firefox"],
    ["androidChrome", "Android Chrome", "android", "chrome"],
    ["iosSafari", "iOS Safari", "ios", "safari"],
    ["tablet", "Tablet", "tablet", "chrome"],
    ["twoDevice", "Two-device", "two-device", "chrome"]
  ];
  return {
    reportType: "methodz-field-evidence-coverage",
    reportVersion: "1.0.0",
    commitSha: COMMIT,
    status: Object.values(states).every((state) => state === "ready") ? "coverage-complete" : "coverage-incomplete",
    rows: defs.map(([key, label, platformFamily, browserFamily], index) => ({
      key,
      label,
      state: states[key],
      evidenceCount: states[key] === "missing" ? 0 : 1,
      latestGeneratedAt: states[key] === "missing" ? "" : `2026-08-09T13:0${index}:00.000Z`,
      platformFamily: states[key] === "missing" ? "" : platformFamily,
      browserFamily: states[key] === "missing" ? "" : browserFamily,
      blockingIssues: states[key] === "blocked" ? [63] : []
    })),
    boundaries: {
      metadataOnly: true,
      importedReportsPersisted: false,
      meetingContentIncluded: false,
      recordIdentifiersIncluded: false,
      attendeeNamesIncluded: false,
      storageKeyNamesIncluded: false,
      storageValuesIncluded: false,
      credentialsIncluded: false,
      privateKeysIncluded: false,
      signaturesIncluded: false,
      queuePayloadsIncluded: false,
      transferContentsIncluded: false,
      browserStorageRead: false,
      browserStorageWritten: false,
      providerCalls: false,
      synchronization: false,
      provesProductionReadiness: false,
      provesDeviceIdentity: false,
      provesAuthorization: false,
      provesDelivery: false,
      provesLegalApproval: false
    }
  };
}

async function buildFromCoverage(page, coverage) {
  await page.evaluate((payload) => {
    window.dispatchEvent(new CustomEvent("methodz:evidence-coverage", { detail: { coverage: payload } }));
  }, coverage);
  await page.click("#buildEvidenceRemediation");
  await expect(page.locator("#buildEvidenceRerunPlan")).toBeEnabled();
  await page.click("#buildEvidenceRerunPlan");
}

test("code remediation opens a new-commit cycle for all six rows", async ({ page }) => {
  await page.goto(BASE_URL);
  await expect(page.locator("#buildEvidenceRerunPlan")).toBeDisabled();
  await buildFromCoverage(page, coveragePayload({ androidChrome: "fail", iosSafari: "blocked" }));

  await expect(page.locator("#rerunOverall")).toHaveText("new-commit-cycle-required");
  await expect(page.locator("#rerunRows")).toHaveText("6");
  await expect(page.locator("#rerunNewCommit")).toHaveText("6");
  await expect(page.locator("#rerunSameCommit")).toHaveText("0");
  await expect(page.locator("#evidenceRerunRows tr")).toHaveCount(6);
  await expect(page.locator("#evidenceRerunRows")).toContainText("revalidate-on-new-commit");
  await expect(page.locator("#evidenceRerunRows")).toContainText("fix-and-rerun-on-new-commit");
  await expect(page.locator("#evidenceRerunStatus")).toContainText("replacement evidence for all six coverage rows");
});

test("environment and evidence-only gaps remain on the same commit", async ({ page }) => {
  await page.goto(BASE_URL);
  await buildFromCoverage(page, coveragePayload({ iosSafari: "blocked", tablet: "incomplete", twoDevice: "missing" }));

  await expect(page.locator("#rerunOverall")).toHaveText("same-commit-rerun-needed");
  await expect(page.locator("#rerunRows")).toHaveText("3");
  await expect(page.locator("#rerunNewCommit")).toHaveText("0");
  await expect(page.locator("#rerunSameCommit")).toHaveText("3");
  await expect(page.locator("#evidenceRerunRows")).not.toContainText("Desktop Chromium");
  await expect(page.locator("#evidenceRerunRows")).toContainText("same-commit-if-no-code-change");
  await expect(page.locator("#evidenceRerunRows")).toContainText("same-commit-required");
});

test("coverage changes invalidate remediation and rerun outputs", async ({ page }) => {
  await page.goto(BASE_URL);
  await buildFromCoverage(page, coveragePayload({ tablet: "incomplete" }));
  await expect(page.locator("#downloadEvidenceRerunPlan")).toBeEnabled();
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent("methodz:evidence-coverage", { detail: { coverage: null } }));
  });
  await expect(page.locator("#buildEvidenceRerunPlan")).toBeDisabled();
  await expect(page.locator("#downloadEvidenceRerunPlan")).toBeDisabled();
  await expect(page.locator("#downloadEvidenceRerunChecklist")).toBeDisabled();
});

test("rerun downloads are explicit and the browser layer requires no storage", async ({ page }) => {
  await page.addInitScript(() => {
    const fail = () => { throw new Error("storage access forbidden in rerun test"); };
    Object.defineProperty(window, "localStorage", { get: fail });
    Object.defineProperty(window, "sessionStorage", { get: fail });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(BASE_URL);
  await buildFromCoverage(page, coveragePayload({ androidChrome: "fail" }));

  const summaryDownload = page.waitForEvent("download");
  await page.click("#downloadEvidenceRerunPlan");
  const summary = await summaryDownload;
  expect(summary.suggestedFilename()).toMatch(/^methodz-field-rerun-/);

  const checklistDownload = page.waitForEvent("download");
  await page.click("#downloadEvidenceRerunChecklist");
  const checklist = await checklistDownload;
  expect(checklist.suggestedFilename()).toMatch(/^methodz-field-rerun-checklist-/);

  const shellBox = await page.locator(".evidence-coverage-shell").boundingBox();
  expect(shellBox.x).toBeGreaterThanOrEqual(0);
  expect(shellBox.x + shellBox.width).toBeLessThanOrEqual(390.5);
  for (const id of ["buildEvidenceRerunPlan", "downloadEvidenceRerunPlan", "downloadEvidenceRerunChecklist"]) {
    const box = await page.locator(`#${id}`).boundingBox();
    expect(box.height).toBeGreaterThanOrEqual(44);
  }
});
