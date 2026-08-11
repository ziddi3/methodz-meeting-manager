const { test, expect } = require("@playwright/test");

const EVIDENCE_URL = "http://127.0.0.1:4173/evidence.html";
const REHEARSAL_URL = "http://127.0.0.1:4173/rehearsal.html";
const COMMIT = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

async function fillValidRehearsal(page, options = {}) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.click("#inspectEnvironment");
  await page.fill("#commitSha", options.commitSha || COMMIT);
  await page.selectOption("#platformFamily", options.platformFamily || "android");
  await page.fill("#operatingSystemVersion", options.operatingSystemVersion || "16.0");
  await page.selectOption("#browserFamily", options.browserFamily || "chrome");
  await page.fill("#browserVersion", options.browserVersion || "140.0");
  const resultSelects = page.locator('select[id^="result-"]');
  for (const select of await resultSelects.all()) await select.selectOption(options.outcome || "pass");
}

test("downloaded rehearsal returns bounded context and the report still requires explicit import", async ({ page }) => {
  await page.goto(REHEARSAL_URL);
  await fillValidRehearsal(page);

  await page.click("#reviewEvidence");
  await expect(page.locator("#returnToCoverage")).toBeDisabled();

  const downloadPromise = page.waitForEvent("download");
  await page.click("#downloadEvidence");
  const download = await downloadPromise;
  const downloadedPath = await download.path();
  expect(downloadedPath).toBeTruthy();
  await expect(page.locator("#returnToCoverage")).toBeEnabled();
  await expect(page.locator("#rehearsalReturnStatus")).toContainText("Android Chrome");
  await expect(page.locator("#rehearsalReturnStatus")).toContainText(COMMIT.slice(0, 12));

  await page.click("#returnToCoverage");
  await expect(page).toHaveURL(EVIDENCE_URL);
  await expect(page.locator("#evidenceReturnCard")).toBeVisible();
  await expect(page.locator("#returnCoverageRow")).toHaveText("Android Chrome");
  await expect(page.locator("#returnCoverageCommit")).toHaveText(COMMIT);
  await expect(page.locator("#returnCoverageReadiness")).toHaveText("ready");
  await expect(page.locator("#evidenceReturnStatus")).toContainText("No report bytes crossed");
  expect(new URL(page.url()).hash).toBe("");
  await expect(page.locator("#evidenceCoverageFiles")).toHaveValue("");
  await expect(page.locator("#evidenceAcceptedCount")).toHaveText("0");

  await page.locator("#evidenceCoverageFiles").setInputFiles(downloadedPath);
  await expect(page.locator("#evidenceAcceptedCount")).toHaveText("0");
  await page.click("#loadEvidenceCoverage");
  await expect(page.locator("#evidenceAcceptedCount")).toHaveText("1");
  await expect(page.locator("#evidenceCoverageCommit")).toHaveValue(COMMIT);
  await expect(page.locator("#evaluateEvidenceCoverage")).toBeEnabled();
});

test("launch row drift after rehearsal edits disables exact-commit return", async ({ page }) => {
  const fragment = `#methodz-rehearsal=v:1.0.0;row:androidChrome;source:${COMMIT};target:${COMMIT};policy:same-commit-required`;
  await page.goto(`${REHEARSAL_URL}${fragment}`);
  await fillValidRehearsal(page, { platformFamily: "ios", browserFamily: "safari" });

  const downloadPromise = page.waitForEvent("download");
  await page.click("#downloadEvidence");
  await downloadPromise;
  await expect(page.locator("#returnToCoverage")).toBeDisabled();
  await expect(page.locator("#rehearsalReturnStatus")).toContainText("launch:row-drift");
});

test("malformed return handoff fails visibly and is removed from the address bar", async ({ page }) => {
  const malformed = `#methodz-evidence-return=v:1.0.0;row:androidChrome;commit:${COMMIT};readiness:ready;note:secret`;
  await page.goto(`${EVIDENCE_URL}${malformed}`);
  await expect(page.locator("#evidenceReturnCard")).toBeVisible();
  await expect(page.locator("#evidenceReturnStatus")).toContainText("rejected");
  expect(new URL(page.url()).hash).toBe("");
  await expect(page.locator("#evidenceAcceptedCount")).toHaveText("0");
});

test("return handoff uses no browser storage and stays contained at 390px", async ({ page }) => {
  await page.addInitScript(() => {
    const fail = () => { throw new Error("storage access forbidden in rehearsal return test"); };
    Object.defineProperty(window, "localStorage", { get: fail });
    Object.defineProperty(window, "sessionStorage", { get: fail });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  const fragment = `#methodz-evidence-return=v:1.0.0;row:iosSafari;commit:${COMMIT};readiness:blocked`;
  await page.goto(`${EVIDENCE_URL}${fragment}`);
  await expect(page.locator("#evidenceReturnCard")).toBeVisible();
  const shellBox = await page.locator(".evidence-coverage-shell").boundingBox();
  expect(shellBox.x).toBeGreaterThanOrEqual(0);
  expect(shellBox.x + shellBox.width).toBeLessThanOrEqual(390.5);
  const loadBox = await page.locator("#loadEvidenceCoverage").boundingBox();
  expect(loadBox.height).toBeGreaterThanOrEqual(44);

  await page.goto(REHEARSAL_URL);
  const returnBox = await page.locator("#returnToCoverage").boundingBox();
  expect(returnBox.height).toBeGreaterThanOrEqual(44);
});
