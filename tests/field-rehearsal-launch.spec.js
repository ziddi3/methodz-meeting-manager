const { test, expect } = require("@playwright/test");

const EVIDENCE_URL = "http://127.0.0.1:4173/evidence.html";
const REHEARSAL_URL = "http://127.0.0.1:4173/rehearsal.html";
const SOURCE = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const TARGET = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

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
    commitSha: SOURCE,
    status: Object.values(states).every((state) => state === "ready") ? "coverage-complete" : "coverage-incomplete",
    rows: defs.map(([key, label, platformFamily, browserFamily], index) => ({
      key,
      label,
      state: states[key],
      evidenceCount: states[key] === "missing" ? 0 : 1,
      latestGeneratedAt: states[key] === "missing" ? "" : `2026-08-10T13:0${index}:00.000Z`,
      platformFamily: states[key] === "missing" ? "" : platformFamily,
      browserFamily: states[key] === "missing" ? "" : browserFamily,
      blockingIssues: states[key] === "blocked" ? [65] : []
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

async function buildPlan(page, coverage) {
  await page.goto(EVIDENCE_URL);
  await page.evaluate((payload) => {
    window.dispatchEvent(new CustomEvent("methodz:evidence-coverage", { detail: { coverage: payload } }));
  }, coverage);
  await page.click("#buildEvidenceRemediation");
  await expect(page.locator("#buildEvidenceRerunPlan")).toBeEnabled();
  await page.click("#buildEvidenceRerunPlan");
}

test("same-commit rerun opens Field Rehearsal with the exact source commit", async ({ page }) => {
  await buildPlan(page, coveragePayload({ androidChrome: "missing" }));
  await expect(page.locator("#evidenceRerunTargetCommit")).toHaveValue(SOURCE);
  await expect(page.locator("#evidenceRerunTargetCommit")).toHaveAttribute("readonly", "");
  const open = page.locator('button[data-rehearsal-row="androidChrome"]');
  await expect(open).toBeEnabled();
  await open.click();

  await expect(page).toHaveURL(REHEARSAL_URL);
  await expect(page.locator("#rehearsalLaunchCard")).toBeVisible();
  await expect(page.locator("#launchTargetRow")).toHaveText("Android Chrome");
  await expect(page.locator("#launchTargetCommit")).toHaveText(SOURCE);
  await expect(page.locator("#launchSourceCommit")).toHaveText(SOURCE);
  await expect(page.locator("#launchCommitPolicy")).toHaveText("same-commit-required");
  await expect(page.locator("#commitSha")).toHaveValue(SOURCE);
  await expect(page.locator("#platformFamily")).toHaveValue("android");
  await expect(page.locator("#browserFamily")).toHaveValue("chrome");
  expect(new URL(page.url()).hash).toBe("");
});

test("new-commit rerun remains locked until a different resulting commit is supplied", async ({ page }) => {
  await buildPlan(page, coveragePayload({ androidChrome: "fail" }));
  const target = page.locator("#evidenceRerunTargetCommit");
  await expect(target).toBeEditable();
  await expect(target).toHaveValue("");
  await expect(page.locator("button[data-rehearsal-row]")).toHaveCount(6);
  for (const button of await page.locator("button[data-rehearsal-row]").all()) await expect(button).toBeDisabled();

  await target.fill(SOURCE);
  for (const button of await page.locator("button[data-rehearsal-row]").all()) await expect(button).toBeDisabled();

  await target.fill(TARGET);
  const ios = page.locator('button[data-rehearsal-row="iosSafari"]');
  await expect(ios).toBeEnabled();
  await ios.click();

  await expect(page).toHaveURL(REHEARSAL_URL);
  await expect(page.locator("#launchTargetRow")).toHaveText("iOS Safari");
  await expect(page.locator("#launchTargetCommit")).toHaveText(TARGET);
  await expect(page.locator("#launchSourceCommit")).toHaveText(SOURCE);
  await expect(page.locator("#launchCommitPolicy")).toHaveText("new-commit-required");
  await expect(page.locator("#commitSha")).toHaveValue(TARGET);
  await expect(page.locator("#platformFamily")).toHaveValue("ios");
  await expect(page.locator("#browserFamily")).toHaveValue("safari");
  expect(new URL(page.url()).hash).toBe("");
});

test("tampered recognized handoff fails visibly and is removed from the address bar", async ({ page }) => {
  const fragment = `#methodz-rehearsal=v:1.0.0;row:androidChrome;source:${SOURCE};target:${TARGET};policy:same-commit-required`;
  await page.goto(`${REHEARSAL_URL}${fragment}`);
  await expect(page.locator("#rehearsalLaunchCard")).toBeVisible();
  await expect(page.locator("#rehearsalLaunchStatus")).toContainText("rejected");
  await expect(page.locator("#commitSha")).toHaveValue("");
  expect(new URL(page.url()).hash).toBe("");
});

test("launch handoff uses no browser storage and stays contained at 390px", async ({ page }) => {
  await page.addInitScript(() => {
    const fail = () => { throw new Error("storage access forbidden in rehearsal launch test"); };
    Object.defineProperty(window, "localStorage", { get: fail });
    Object.defineProperty(window, "sessionStorage", { get: fail });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  const fragment = `#methodz-rehearsal=v:1.0.0;row:iosSafari;source:${SOURCE};target:${SOURCE};policy:same-commit-required`;
  await page.goto(`${REHEARSAL_URL}${fragment}`);
  await expect(page.locator("#rehearsalLaunchCard")).toBeVisible();
  const shellBox = await page.locator(".field-rehearsal-shell").boundingBox();
  expect(shellBox.x).toBeGreaterThanOrEqual(0);
  expect(shellBox.x + shellBox.width).toBeLessThanOrEqual(390.5);
  const inspectBox = await page.locator("#inspectEnvironment").boundingBox();
  expect(inspectBox.height).toBeGreaterThanOrEqual(44);
});
