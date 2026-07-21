const { test, expect } = require("@playwright/test");

const APP = "http://127.0.0.1:4173/meeting.html";

const RECOVERY_PREFIX = "Recovery v1.6.1:";

test.beforeEach(async ({ page }) => {
  await page.goto(APP);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test(`${RECOVERY_PREFIX} recovery readiness panel and guarded import architecture load`, async ({ page }) => {
  await expect(page.locator("#workspaceRecoveryPanelV16")).toBeVisible();

  const state = await page.evaluate(() => ({
    schema: window.METHODZ_MEETING_CONFIG.schemaVersion,
    shell: window.METHODZ_MEETING_CONFIG.appShellVersion,
    core: typeof window.MethodzWorkspacePackageCore?.inspectWorkspacePackage,
    recovery: typeof window.MethodzRecoveryReadinessV16?.buildRestorePlan,
    restoreGuarded: Boolean(window.applyWorkspaceRestoreV08?.__methodzRecoveryGuarded),
    mergeGuarded: Boolean(window.applyWorkspaceMergeV09?.__methodzRecoveryGuarded)
  }));

  expect(state).toEqual({
    schema: "1.6.0",
    shell: "1.6.2",
    core: "function",
    recovery: "function",
    restoreGuarded: true,
    mergeGuarded: true
  });
});

test(`${RECOVERY_PREFIX} current workspace recovery drill records a passing metadata-only event`, async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem("methodzMeetingRecords", JSON.stringify([{ id: "recovery-record", title: "Recovery Drill" }]));
    localStorage.setItem("methodzMeetingRevisions", JSON.stringify({ "recovery-record": [] }));
  });
  await page.reload();

  await page.getByRole("button", { name: "Run Current Workspace Drill" }).click();
  await expect(page.locator("#workspaceRecoveryResultV16")).toContainText("Current Workspace Drill: Passed");
  await expect(page.locator("#downloadRecoveryReportV16")).toBeEnabled();

  const events = await page.evaluate(() => JSON.parse(localStorage.getItem("methodzRecoveryDrillLog") || "[]"));
  expect(events).toHaveLength(1);
  expect(events[0].result).toBe("Passed");
  expect(events[0].entryCount).toBeGreaterThan(0);
  expect(events[0].checksumVerified).toBe(true);
  expect(JSON.stringify(events[0])).not.toContain("Recovery Drill");
});

test(`${RECOVERY_PREFIX} backup inspection blocks private JWK material without changing local data`, async ({ page }) => {
  const before = await page.evaluate(() => Object.fromEntries(
    Object.keys(localStorage).map((key) => [key, localStorage.getItem(key)])
  ));

  const packageText = await page.evaluate(() => {
    const core = window.MethodzWorkspacePackageCore;
    const entries = {
      methodzMeetingRecords: JSON.stringify([{ id: "safe-local" }]),
      methodzSigningAudit: JSON.stringify([{ privateJwk: { kty: "EC", crv: "P-256", x: "x", y: "y", d: "secret" } }])
    };
    const body = {
      packageType: core.PACKAGE_TYPE,
      packageVersion: 1,
      appName: "Methodz Meeting Manager",
      schemaVersion: "1.6.0",
      exportedAt: "2026-07-18T20:00:00.000Z",
      entries,
      summary: core.summarizeEntries(entries)
    };
    return JSON.stringify({ ...body, checksum: core.hashText(core.stableStringify(body)) });
  });

  await page.locator("#workspaceInspectionFileV16").setInputFiles({
    name: "unsafe-workspace.json",
    mimeType: "application/json",
    buffer: Buffer.from(packageText)
  });

  await expect(page.locator("#workspaceRecoveryResultV16")).toContainText("Restore blocked");
  await expect(page.locator("#workspaceRecoveryResultV16")).toContainText("Private cryptographic key material");

  const after = await page.evaluate(() => Object.fromEntries(
    Object.keys(localStorage).map((key) => [key, localStorage.getItem(key)])
  ));
  expect(after).toEqual(before);
});

test(`${RECOVERY_PREFIX} configured package limits apply to no-write inspections`, async ({ page }) => {
  const state = await page.evaluate(() => {
    const core = window.MethodzWorkspacePackageCore;
    window.METHODZ_MEETING_CONFIG.workspaceRecovery.maximumEntries = Number.NaN;
    window.METHODZ_MEETING_CONFIG.workspaceRecovery.maximumEntryBytes = 8;
    window.METHODZ_MEETING_CONFIG.workspaceRecovery.maximumPackageBytes = 16;

    const entries = {
      methodzMeetingRecords: JSON.stringify([{ id: "configured-limit-test" }])
    };
    const body = {
      packageType: core.PACKAGE_TYPE,
      packageVersion: 1,
      appName: "Methodz Meeting Manager",
      schemaVersion: "1.6.0",
      exportedAt: "2026-07-19T20:00:00.000Z",
      entries,
      summary: core.summarizeEntries(entries)
    };
    const payload = { ...body, checksum: core.hashText(core.stableStringify(body)) };
    const report = window.MethodzRecoveryReadinessV16.inspectWorkspacePackage(payload);
    return {
      valid: report.valid,
      limits: report.limits,
      errors: report.errors
    };
  });

  expect(state.valid).toBe(false);
  expect(state.limits.maxEntries).toBe(500);
  expect(state.limits.maxEntryBytes).toBe(8);
  expect(state.limits.maxTotalBytes).toBe(16);
  expect(state.errors.join("\n")).toMatch(/per-entry limit|package limit/i);
});

test(`${RECOVERY_PREFIX} configured drill history cap is enforced`, async ({ page }) => {
  await page.evaluate(() => {
    window.METHODZ_MEETING_CONFIG.workspaceRecovery.maximumDrillEvents = 2;
    localStorage.setItem("methodzMeetingRecords", JSON.stringify([{ id: "history-cap" }]));
  });

  const drillButton = page.getByRole("button", { name: "Run Current Workspace Drill" });
  await drillButton.click();
  await drillButton.click();
  await drillButton.click();

  const events = await page.evaluate(() => JSON.parse(localStorage.getItem("methodzRecoveryDrillLog") || "[]"));
  expect(events).toHaveLength(2);
  expect(events.every((event) => event.result === "Passed" && event.checksumVerified)).toBe(true);
});
