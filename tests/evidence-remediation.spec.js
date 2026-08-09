const { test, expect } = require("@playwright/test");

const BASE_URL = "http://127.0.0.1:4173/evidence.html";
const COMMIT = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

function coveragePayload() {
  const rows = [
    ["desktopChromium", "Desktop Chromium", "fail", "desktop", "chrome"],
    ["desktopNonChromium", "Desktop non-Chromium", "ready", "desktop", "firefox"],
    ["androidChrome", "Android Chrome", "blocked", "android", "chrome"],
    ["iosSafari", "iOS Safari", "incomplete", "ios", "safari"],
    ["tablet", "Tablet", "missing", "", ""],
    ["twoDevice", "Two-device", "ready", "two-device", "chrome"]
  ].map(([key, label, state, platformFamily, browserFamily], index) => ({
    key,
    label,
    state,
    evidenceCount: state === "missing" ? 0 : 1,
    latestGeneratedAt: state === "missing" ? "" : `2026-08-09T12:0${index}:00.000Z`,
    platformFamily,
    browserFamily,
    blockingIssues: state === "blocked" ? [61] : []
  }));
  return {
    reportType: "methodz-field-evidence-coverage",
    reportVersion: "1.0.0",
    commitSha: COMMIT,
    status: "coverage-incomplete",
    rows,
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

async function supplyCoverage(page) {
  await page.evaluate((coverage) => {
    window.dispatchEvent(new CustomEvent("methodz:evidence-coverage", { detail: { coverage } }));
  }, coveragePayload());
}

test("remediation worklist is explicit, deterministic, and excludes ready rows", async ({ page }) => {
  await page.goto(BASE_URL);
  await expect(page.locator("#buildEvidenceRemediation")).toBeDisabled();
  await supplyCoverage(page);
  await expect(page.locator("#buildEvidenceRemediation")).toBeEnabled();
  await page.click("#buildEvidenceRemediation");

  await expect(page.locator("#remediationOverall")).toHaveText("remediation-needed");
  await expect(page.locator("#remediationCode")).toHaveText("1");
  await expect(page.locator("#remediationEnvironment")).toHaveText("1");
  await expect(page.locator("#remediationEvidence")).toHaveText("2");
  await expect(page.locator("#evidenceRemediationRows tr")).toHaveCount(4);
  await expect(page.locator("#evidenceRemediationRows tr").nth(0)).toContainText("Desktop Chromium");
  await expect(page.locator("#evidenceRemediationRows tr").nth(0)).toContainText("code-remediation");
  await expect(page.locator("#evidenceRemediationRows tr").nth(1)).toContainText("Android Chrome");
  await expect(page.locator("#evidenceRemediationRows tr").nth(1)).toContainText("#61");
  await expect(page.locator("#evidenceRemediationRows")).not.toContainText("Desktop non-Chromium");
  await expect(page.locator("#evidenceRemediationStatus")).toContainText("no GitHub issue was created");
});

test("coverage changes invalidate the derived worklist", async ({ page }) => {
  await page.goto(BASE_URL);
  await supplyCoverage(page);
  await page.click("#buildEvidenceRemediation");
  await expect(page.locator("#downloadEvidenceRemediation")).toBeEnabled();
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent("methodz:evidence-coverage", { detail: { coverage: null } }));
  });
  await expect(page.locator("#buildEvidenceRemediation")).toBeDisabled();
  await expect(page.locator("#downloadEvidenceRemediation")).toBeDisabled();
  await expect(page.locator("#downloadEvidenceIssueDrafts")).toBeDisabled();
});

test("downloads remain explicit and metadata-only", async ({ page }) => {
  await page.goto(BASE_URL);
  await supplyCoverage(page);
  await page.click("#buildEvidenceRemediation");

  const summaryDownload = page.waitForEvent("download");
  await page.click("#downloadEvidenceRemediation");
  const summary = await summaryDownload;
  expect(summary.suggestedFilename()).toMatch(/^methodz-field-remediation-/);

  const draftsDownload = page.waitForEvent("download");
  await page.click("#downloadEvidenceIssueDrafts");
  const drafts = await draftsDownload;
  expect(drafts.suggestedFilename()).toMatch(/^methodz-field-remediation-issue-drafts-/);
});

test("remediation layer does not require browser storage and remains usable at 390px", async ({ page }) => {
  await page.addInitScript(() => {
    const fail = () => { throw new Error("storage access forbidden in remediation test"); };
    Object.defineProperty(window, "localStorage", { get: fail });
    Object.defineProperty(window, "sessionStorage", { get: fail });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(BASE_URL);
  await supplyCoverage(page);
  await page.click("#buildEvidenceRemediation");
  await expect(page.locator("#remediationOverall")).toHaveText("remediation-needed");
  const shellBox = await page.locator(".evidence-coverage-shell").boundingBox();
  expect(shellBox.x).toBeGreaterThanOrEqual(0);
  expect(shellBox.x + shellBox.width).toBeLessThanOrEqual(390.5);
  for (const id of ["buildEvidenceRemediation", "downloadEvidenceRemediation", "downloadEvidenceIssueDrafts"]) {
    const box = await page.locator(`#${id}`).boundingBox();
    expect(box.height).toBeGreaterThanOrEqual(44);
  }
});
