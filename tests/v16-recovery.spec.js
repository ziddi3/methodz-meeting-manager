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
    shell: "1.6.6",
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

test(`${RECOVERY_PREFIX} backup inspection blocks private JWK material`, async ({ page }) => {
  const packageWithPrivateKey = await page.evaluate(async () => {
    const pair = await window.MethodzCryptoPackageV16.generateKeyPair();
    const privateJwk = await window.MethodzCryptoPackageV16.exportPrivateJwk(pair.privateKey);
    const storage = {
      methodzMeetingRecords: JSON.stringify([{ id: "safe-record", title: "Safe" }]),
      methodzUnsafeKeyFixture: JSON.stringify({ privateJwk })
    };
    const checksum = await window.MethodzWorkspacePackageCore.calculateStorageChecksum(storage);
    return {
      type: "methodz-complete-workspace-backup",
      version: 3,
      exportedAt: new Date().toISOString(),
      storage,
      checksum
    };
  });

  const fileChooserPromise = page.waitForEvent("filechooser");
  await page.getByLabel("Choose Workspace Backup").click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles({
    name: "private-key-workspace.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(packageWithPrivateKey))
  });

  await expect(page.locator("#workspaceRecoveryResultV16")).toContainText("Blocked");
  await expect(page.locator("#workspaceRecoveryResultV16")).toContainText("private JWK");
  await expect(page.locator("#downloadRecoveryReportV16")).toBeEnabled();
});

test(`${RECOVERY_PREFIX} configured package limits apply to no-write inspections`, async ({ page }) => {
  await page.evaluate(() => {
    window.METHODZ_MEETING_CONFIG.recovery.maximumRecognizedEntries = 1;
  });

  const oversizedEntryPackage = await page.evaluate(async () => {
    const storage = {
      methodzMeetingRecords: JSON.stringify([{ id: "one" }]),
      methodzMeetingTemplates: JSON.stringify([{ id: "two" }])
    };
    const checksum = await window.MethodzWorkspacePackageCore.calculateStorageChecksum(storage);
    return {
      type: "methodz-complete-workspace-backup",
      version: 3,
      exportedAt: new Date().toISOString(),
      storage,
      checksum
    };
  });

  const fileChooserPromise = page.waitForEvent("filechooser");
  await page.getByLabel("Choose Workspace Backup").click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles({
    name: "configured-limit-workspace.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(oversizedEntryPackage))
  });

  await expect(page.locator("#workspaceRecoveryResultV16")).toContainText("Blocked");
  await expect(page.locator("#workspaceRecoveryResultV16")).toContainText("recognized entries");
});

test(`${RECOVERY_PREFIX} configured drill history cap is honored`, async ({ page }) => {
  await page.evaluate(() => {
    window.METHODZ_MEETING_CONFIG.recovery.maximumDrillHistory = 2;
    localStorage.setItem("methodzMeetingRecords", JSON.stringify([{ id: "history-record", title: "History" }]));
  });
  await page.reload();
  await page.evaluate(() => {
    window.METHODZ_MEETING_CONFIG.recovery.maximumDrillHistory = 2;
  });

  for (let index = 0; index < 3; index += 1) {
    await page.getByRole("button", { name: "Run Current Workspace Drill" }).click();
    await expect(page.locator("#workspaceRecoveryResultV16")).toContainText("Current Workspace Drill: Passed");
  }

  const events = await page.evaluate(() => JSON.parse(localStorage.getItem("methodzRecoveryDrillLog") || "[]"));
  expect(events).toHaveLength(2);
});
