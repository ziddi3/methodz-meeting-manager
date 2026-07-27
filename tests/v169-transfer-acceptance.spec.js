const { test, expect } = require("@playwright/test");

const BASE_URL = process.env.METHODZ_BASE_URL || "http://127.0.0.1:4173";
const TENANT = "methodz-rehearsal";

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

async function checkAllAcceptanceConfirmations(page) {
  const checks = page.locator(".transfer-acceptance-check-v169");
  for (let index = 0; index < await checks.count(); index += 1) await checks.nth(index).check();
}

async function completeTransferApproval(page) {
  await page.locator("#transferDestinationReadyV168").check();
  await page.locator("#transferCollisionReviewedV168").check();
  await page.locator("#transferSourceUnchangedV168").check();
  await page.locator("#transferImportApprovedV168").check();
  await page.locator("#transferApprovalPhraseV168").fill("TRANSFER");
}

async function buildSourceBundle(page) {
  return page.evaluate(async ({ tenant }) => {
    const Contract = window.MethodzHostedProviderContract;
    const QueueCore = window.MethodzSyncQueuePortabilityV166;
    const transfer = window.MethodzCrossDeviceTransferV168;
    const tenantHash = Contract.fnv1a32(tenant);
    const queueKey = `methodzSyncRehearsalQueueV165:${tenantHash}`;
    const evidenceKey = `methodzSyncRehearsalOperatorEventsV166:${tenantHash}`;
    const now = "2026-07-27T12:00:00.000Z";
    const queueEntry = {
      id: "two-profile-queue-entry",
      version: "1.0.0",
      tenantId: tenant,
      operation: "push",
      state: "pending",
      recordId: "source-active",
      idempotencyKey: "two-profile-idempotency",
      attempts: 0,
      createdAt: now,
      updatedAt: now
    };
    const operatorEvent = QueueCore.createOperatorEvent({
      id: "two-profile-operator-event",
      tenantId: tenant,
      eventType: "queue-export",
      operation: "push",
      state: "pending",
      result: "exported",
      counts: { entries: 1 },
      occurredAt: now
    });
    const entries = {
      methodzMeetingRecords: JSON.stringify([{ id: "source-active", title: "Transferred disposable meeting" }]),
      methodzArchivedMeetingRecords: JSON.stringify([{ id: "source-archive", title: "Transferred disposable archive" }]),
      methodzMeetingRevisions: JSON.stringify({ "source-active": [{ revision: 1 }] }),
      methodzMeetingDirectory: JSON.stringify([{ name: "Transferred disposable attendee" }]),
      methodzOrganizationDirectory: JSON.stringify([{ name: "Transferred disposable organization" }]),
      methodzMeetingTemplates: JSON.stringify([{ id: "source-template" }]),
      methodzGovernanceState: JSON.stringify({ classification: "Internal" }),
      methodzSigningPublicKeys: JSON.stringify([{ keyId: "source-public-key", kty: "EC", crv: "P-256", x: "x", y: "y" }]),
      methodzKeyCustodyRecordsV162: JSON.stringify([{ event: "rotation" }]),
      methodzRecoveryDrillHistory: JSON.stringify([{ result: "passed" }]),
      [queueKey]: JSON.stringify([queueEntry]),
      [evidenceKey]: JSON.stringify([operatorEvent])
    };
    localStorage.clear();
    Object.entries(entries).forEach(([key, value]) => localStorage.setItem(key, value));

    const workspacePackage = window.createWorkspacePackageV08();
    const queuePackage = QueueCore.buildQueuePackage({
      tenantId: tenant,
      providerId: "disposable-http-pilot",
      generatedAt: now,
      entries: [queueEntry]
    });
    const operatorEvidencePackage = QueueCore.buildOperatorEvidencePackage({
      tenantId: tenant,
      generatedAt: now,
      events: [operatorEvent]
    });
    const readinessReport = await window.collectDeviceReadinessV167();
    return transfer.buildTransferPackage({
      workspacePackage,
      queuePackage,
      operatorEvidencePackage,
      readinessReport,
      storageKeys: window.METHODZ_MEETING_CONFIG.storageKeys,
      expectedTenantId: tenant,
      generatedAt: now,
      sourceSessionSeed: "two-profile-source",
      appShellVersion: window.METHODZ_MEETING_CONFIG.appShellVersion,
      recordSchemaVersion: window.METHODZ_MEETING_CONFIG.schemaVersion,
      checkpoints: {
        sourceWorkspaceSaved: true,
        sourceBackupStoredOffDevice: true,
        privateKeysSeparated: true,
        sourceKeptUnchanged: true
      }
    });
  }, { tenant: TENANT });
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
    await checkAllAcceptanceConfirmations(page);
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

  test("transfers between isolated browser profiles, accepts the destination, and restores the pre-import snapshot", async ({ browser }) => {
    const sourceContext = await browser.newContext();
    const destinationContext = await browser.newContext();
    const sourcePage = await sourceContext.newPage();
    const destinationPage = await destinationContext.newPage();

    try {
      await sourcePage.goto(`${BASE_URL}/meeting.html`);
      const bundle = await buildSourceBundle(sourcePage);

      await destinationPage.goto(`${BASE_URL}/meeting.html`);
      await destinationPage.evaluate(() => {
        localStorage.clear();
        localStorage.setItem("methodzMeetingRecords", JSON.stringify([{ id: "destination-original", title: "Original destination meeting" }]));
        localStorage.setItem("methodzArchivedMeetingRecords", JSON.stringify([]));
        localStorage.setItem("methodzMeetingRevisions", JSON.stringify({ "destination-original": [{ revision: 1 }] }));
      });
      await destinationPage.reload();

      await destinationPage.locator("#transferImportFileV168").setInputFiles({
        name: "two-profile-transfer.json",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify(bundle))
      });
      await expect(destinationPage.locator("#transferInspectionV168")).toContainText("Verified Destination Preview");
      await destinationPage.getByRole("button", { name: "Run No-Write Recovery Drill" }).click();
      await expect(destinationPage.locator("#transferDrillV168")).toContainText("No-Write Recovery Drill Passed");
      await completeTransferApproval(destinationPage);
      destinationPage.once("dialog", (dialog) => dialog.accept());
      await destinationPage.getByRole("button", { name: "Apply Verified Transfer" }).click();
      await expect(destinationPage.locator("#transferStatusV168")).toContainText("Verified transfer applied");
      await destinationPage.reload();

      const transferred = await destinationPage.evaluate(() => JSON.parse(localStorage.getItem("methodzMeetingRecords") || "[]"));
      expect(transferred[0].id).toBe("source-active");

      await destinationPage.getByRole("button", { name: "Run Acceptance Check" }).click();
      await expect(destinationPage.locator("#transferAcceptancePreviewV169")).toContainText("Automated Checks Passed");
      expect(await destinationPage.locator(".transfer-acceptance-check-v169:disabled").count()).toBe(0);
      await checkAllAcceptanceConfirmations(destinationPage);
      await destinationPage.locator("#transferAcceptancePhraseV169").fill("ACCEPT");
      await destinationPage.getByRole("button", { name: "Record Destination Acceptance" }).click();
      await expect(destinationPage.locator("#transferAcceptanceStatusV169")).toContainText("Destination acceptance recorded");

      await destinationPage.getByRole("button", { name: "Preview Rollback" }).click();
      await expect(destinationPage.locator("#transferRollbackPreviewV169")).toContainText("No-Write Rollback Preview Passed");
      await destinationPage.locator("#transferRollbackUnderstoodV169").check();
      await destinationPage.locator("#transferRollbackPhraseV169").fill("ROLLBACK");
      destinationPage.once("dialog", (dialog) => dialog.accept());
      await destinationPage.getByRole("button", { name: "Restore Pre-Import Snapshot" }).click();
      await expect(destinationPage.locator("#transferAcceptanceStatusV169")).toContainText("snapshot restored and verified");

      const result = await destinationPage.evaluate(() => {
        const restored = JSON.parse(localStorage.getItem("methodzMeetingRecords") || "[]");
        const preRollback = JSON.parse(localStorage.getItem("methodzPreRollbackBackupV169") || "null");
        const rollbackReports = JSON.parse(localStorage.getItem("methodzTransferRollbackReportsV169") || "[]");
        return { restored, preRollback, rollbackReports };
      });
      expect(result.restored[0].id).toBe("destination-original");
      expect(JSON.parse(result.preRollback.entries.methodzMeetingRecords)[0].id).toBe("source-active");
      expect(result.rollbackReports.at(-1).rollbackVerified).toBe(true);
      expect(JSON.stringify(result.rollbackReports.at(-1))).not.toContain("destination-original");
      expect(JSON.stringify(result.rollbackReports.at(-1))).not.toContain("source-active");
    } finally {
      await sourceContext.close();
      await destinationContext.close();
    }
  });
});
