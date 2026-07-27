const { test, expect } = require("@playwright/test");

const BASE_URL = process.env.METHODZ_BASE_URL || "http://127.0.0.1:4173";

async function seedAcceptedTransferState(page) {
  await page.evaluate(() => {
    const entries = {
      methodzMeetingRecords: JSON.stringify([{ id: "record-one", title: "Disposable transfer meeting" }]),
      methodzArchivedMeetingRecords: JSON.stringify([{ id: "record-two", title: "Disposable archived meeting" }]),
      methodzMeetingRevisions: JSON.stringify({ "record-one": [{ revision: 1 }] }),
      methodzMeetingDirectory: JSON.stringify([{ name: "Disposable attendee" }]),
      methodzOrganizationDirectory: JSON.stringify([{ name: "Disposable organization" }]),
      methodzMeetingTemplates: JSON.stringify([{ id: "template-one" }]),
      methodzGovernanceState: JSON.stringify({ classification: "Internal" }),
      methodzSigningPublicKeys: JSON.stringify([{ keyId: "public-one" }]),
      methodzKeyCustodyRecordsV162: JSON.stringify([{ event: "rotation" }]),
      methodzRecoveryDrillHistory: JSON.stringify([{ result: "passed" }]),
      "methodzSyncRehearsalQueueV165:tenant": JSON.stringify([{ id: "queue-one" }])
    };
    Object.entries(entries).forEach(([key, value]) => localStorage.setItem(key, value));

    const preRestoreEntries = {
      methodzMeetingRecords: JSON.stringify([]),
      methodzArchivedMeetingRecords: JSON.stringify([]),
      methodzMeetingRevisions: JSON.stringify({})
    };
    const recovery = window.MethodzTransferAcceptanceV169.buildWorkspacePackage(preRestoreEntries, {
      storageKeys: window.METHODZ_MEETING_CONFIG.storageKeys,
      schemaVersion: "1.6.0",
      preRestoreKey: "methodzPreRestoreBackup",
      generatedAt: "2026-07-27T12:00:00.000Z"
    });
    localStorage.setItem("methodzPreRestoreBackup", JSON.stringify(recovery));
    localStorage.setItem("methodzCrossDeviceTransferReportsV168", JSON.stringify([{
      reportType: "methodz-cross-device-transfer-report",
      stage: "destination-import-verified",
      generatedAt: "2026-07-27T12:01:00.000Z",
      counts: { activeRecords: 1, archivedRecords: 1, revisionGroups: 1, queueEntries: 1 },
      result: { postImportVerified: true },
      boundaries: {
        containsMeetingContent: false,
        containsRecordIds: false,
        containsAttendeeNames: false,
        containsSignatures: false,
        containsCredentials: false,
        containsPrivateKeyMaterial: false
      }
    }]));
  });
}

test.describe("v1.6.9 transfer acceptance and meeting-day workflow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/meeting.html`);
    await page.evaluate(() => localStorage.clear());
    await seedAcceptedTransferState(page);
    await page.reload();
  });

  test("runs metadata-only transfer acceptance and records explicit acceptance", async ({ page }) => {
    await expect(page.locator("#transferAcceptancePanelV169")).toBeVisible();
    await page.getByRole("button", { name: "Run Acceptance Check" }).click();
    await expect(page.locator("#transferAcceptancePreviewV169")).toContainText("Automated Checks Passed");
    await expect(page.locator("#transferAcceptancePreviewV169")).toContainText("Active records");

    const disabled = await page.locator(".transfer-acceptance-check-v169:disabled").count();
    expect(disabled).toBe(0);
    const checks = page.locator(".transfer-acceptance-check-v169");
    for (let index = 0; index < await checks.count(); index += 1) await checks.nth(index).check();
    await page.locator("#transferAcceptancePhraseV169").fill("ACCEPT");
    await page.getByRole("button", { name: "Record Destination Acceptance" }).click();
    await expect(page.locator("#transferAcceptanceStatusV169")).toContainText("Destination acceptance recorded");

    const state = await page.evaluate(() => ({
      state: JSON.parse(localStorage.getItem("methodzTransferAcceptanceStateV169") || "{}"),
      reports: JSON.parse(localStorage.getItem("methodzTransferAcceptanceReportsV169") || "[]")
    }));
    expect(state.state.stage).toBe("accepted");
    expect(state.reports).toHaveLength(1);
    expect(state.reports[0].accepted).toBe(true);
    const serialized = JSON.stringify(state.reports[0]);
    expect(serialized).not.toContain("record-one");
    expect(serialized).not.toContain("Disposable attendee");
    expect(serialized).not.toContain("methodzMeetingRecords");
  });

  test("previews rollback without writing and preserves a recoverable current-state path", async ({ page }) => {
    const before = await page.evaluate(() => localStorage.getItem("methodzMeetingRecords"));
    await page.getByRole("button", { name: "Preview Rollback" }).click();
    await expect(page.locator("#transferRollbackPreviewV169")).toContainText("No-Write Rollback Preview Passed");
    expect(await page.evaluate(() => localStorage.getItem("methodzMeetingRecords"))).toBe(before);
  });

  test("meeting-day mode prioritizes core sections and restores its state", async ({ page }) => {
    await page.getByRole("button", { name: "Enter Meeting-Day Mode" }).click();
    await expect(page.locator("body")).toHaveClass(/is-meeting-day-v169/);
    await expect(page.locator("#meeting-day-info-v169")).toBeVisible();
    await expect(page.locator("#transferAcceptancePanelV169")).toBeHidden();
    await page.getByRole("button", { name: "Show Supporting Panels" }).click();
    await expect(page.locator("#transferAcceptancePanelV169")).toBeVisible();
    await page.reload();
    await expect(page.locator("body")).toHaveClass(/is-meeting-day-v169/);
  });

  test("workspace diagnostics remain aggregate and mobile layout does not overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await page.getByRole("button", { name: "Run Diagnostics" }).click();
    await expect(page.locator("#workspaceDiagnosticsPreviewV169")).toContainText("Workspace Diagnostics");
    const report = await page.evaluate(() => JSON.parse(localStorage.getItem("methodzWorkspaceDiagnosticsReportsV169") || "[]").at(-1));
    const serialized = JSON.stringify(report);
    expect(serialized).not.toContain("record-one");
    expect(serialized).not.toContain("methodzMeetingRecords");
    const metrics = await page.evaluate(() => ({ innerWidth: window.innerWidth, scrollWidth: document.documentElement.scrollWidth }));
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.innerWidth + 2);
  });
});
