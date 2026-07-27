const { test, expect } = require("@playwright/test");
const Contract = require("../provider-contract.js");
const QueueCore = require("../sync-queue-portability.js");
const TransferCore = require("../cross-device-transfer-core.js");

const BASE_URL = process.env.METHODZ_BASE_URL || "http://127.0.0.1:4173";
const NOW = "2026-07-28T12:00:00.000Z";
const TENANT = "methodz-rehearsal";
const TENANT_HASH = Contract.fnv1a32(TENANT);
const QUEUE_KEY = `methodzSyncRehearsalQueueV165:${TENANT_HASH}`;
const EVIDENCE_KEY = `methodzSyncRehearsalOperatorEventsV166:${TENANT_HASH}`;
const storageKeys = {
  records: "methodzMeetingRecords",
  archivedRecords: "methodzArchivedMeetingRecords",
  revisions: "methodzMeetingRevisions",
  signingPublicKeys: "methodzSigningPublicKeys"
};

function queueEntry() {
  return {
    id: "v169-queue-entry",
    version: "1.0.0",
    tenantId: TENANT,
    operation: "push",
    state: "pending",
    recordId: "source-active",
    idempotencyKey: "v169-idempotency",
    attempts: 0,
    createdAt: NOW,
    updatedAt: NOW
  };
}

function buildBundle(workspacePackage) {
  const queueEntries = [queueEntry()];
  const operatorEvent = QueueCore.createOperatorEvent({
    id: "v169-operator-event",
    tenantId: TENANT,
    eventType: "queue-export",
    operation: "push",
    state: "pending",
    result: "exported",
    counts: { entries: queueEntries.length },
    occurredAt: NOW
  });
  const queuePackage = QueueCore.buildQueuePackage({
    tenantId: TENANT,
    providerId: "disposable-http-pilot",
    generatedAt: NOW,
    entries: queueEntries
  });
  const evidencePackage = QueueCore.buildOperatorEvidencePackage({
    tenantId: TENANT,
    generatedAt: NOW,
    events: [operatorEvent]
  });
  const readinessReport = {
    type: "methodz-device-readiness-report",
    version: "1.0.0",
    generatedAt: NOW,
    overall: "Ready",
    boundaries: {
      containsMeetingContent: false,
      containsRecordIds: false,
      containsAttendeeNames: false,
      containsSignatures: false,
      containsCredentials: false,
      containsKeyMaterial: false
    }
  };
  return TransferCore.buildTransferPackage({
    workspacePackage,
    queuePackage,
    operatorEvidencePackage: evidencePackage,
    readinessReport,
    storageKeys,
    expectedTenantId: TENANT,
    generatedAt: NOW,
    sourceSessionSeed: "v169-two-profile-source",
    checkpoints: {
      sourceWorkspaceSaved: true,
      privateKeysSeparated: true,
      sourceKeptUnchanged: true
    }
  });
}

async function completeTransferApproval(page) {
  await page.locator("#transferDestinationReadyV168").check();
  await page.locator("#transferCollisionReviewedV168").check();
  await page.locator("#transferSourceUnchangedV168").check();
  await page.locator("#transferImportApprovedV168").check();
  await page.locator("#transferApprovalPhraseV168").fill("TRANSFER");
}

test.describe("v1.6.9 transfer acceptance and meeting-day workflow", () => {
  test("meeting-day mode keeps capture sections available and preserves tool visibility", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE_URL}/meeting.html`);
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    await expect(page.locator("#meetingDayControlV169")).toBeVisible();
    await expect(page.locator("#minutesPreview")).toBeHidden();
    await page.locator("#meetingDayToggleV169").click();
    await expect(page.locator("body")).toHaveClass(/methodz-meeting-day-mode-v169/);
    await expect(page.locator("#meetingDayInformationV169")).toBeVisible();
    await expect(page.locator("#meetingDayNotesV169")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Saved Meeting Records" })).toBeHidden();
    await expect(page.locator("#minutesPreview")).toBeHidden();

    await page.getByRole("button", { name: "Notes", exact: true }).click();
    const preferences = await page.evaluate(() => JSON.parse(localStorage.getItem("methodzMeetingDayPreferencesV169") || "{}"));
    expect(preferences.enabled).toBe(true);
    expect(preferences.lastSectionId).toBe("meetingDayNotesV169");

    await page.reload();
    await expect(page.locator("body")).toHaveClass(/methodz-meeting-day-mode-v169/);
    await expect(page.locator('[data-meeting-day-target-v169="meetingDayNotesV169"]')).toHaveAttribute("aria-current", "location");
    await page.locator("#meetingDayToolsToggleV169").click();
    await expect(page.getByRole("heading", { name: "Saved Meeting Records" })).toBeVisible();
    await expect(page.locator("#minutesPreview")).toBeHidden();

    await page.locator("#meetingDayToggleV169").click();
    await expect(page.locator("body")).not.toHaveClass(/methodz-meeting-day-mode-v169/);
    await expect(page.locator("#minutesPreview")).toBeHidden();

    const viewport = await page.evaluate(() => ({
      width: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth
    }));
    expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.width + 2);
  });

  test("meeting-day collapse can be disabled by configuration", async ({ page }) => {
    await page.goto(`${BASE_URL}/meeting.html`);
    await page.evaluate(() => {
      localStorage.clear();
      window.METHODZ_MEETING_CONFIG.meetingDay.collapseSecondaryTools = false;
    });
    await page.locator("#meetingDayToggleV169").click();
    await expect(page.locator("body")).toHaveClass(/methodz-meeting-day-mode-v169/);
    await expect(page.getByRole("heading", { name: "Saved Meeting Records" })).toBeVisible();
    await expect(page.locator("#meetingDayToolsToggleV169")).toBeHidden();
    await expect(page.locator("#meetingDayStatusV169")).toContainText("remain visible by configuration");
  });

  test("two browser profiles transfer, accept, diagnose, and restore the destination", async ({ browser }) => {
    const sourceContext = await browser.newContext();
    const destinationContext = await browser.newContext();
    const sourcePage = await sourceContext.newPage();
    const destinationPage = await destinationContext.newPage();

    await sourcePage.goto(`${BASE_URL}/meeting.html`);
    await sourcePage.evaluate(({ queueKey, evidenceKey }) => {
      localStorage.clear();
      localStorage.setItem("methodzMeetingRecords", JSON.stringify([{ id: "source-active", title: "Disposable source meeting" }]));
      localStorage.setItem("methodzArchivedMeetingRecords", JSON.stringify([{ id: "source-archive", title: "Disposable source archive" }]));
      localStorage.setItem("methodzMeetingRevisions", JSON.stringify({ "source-active": [{ revision: 1 }] }));
      localStorage.setItem("methodzMeetingDirectory", JSON.stringify([{ name: "Disposable attendee" }]));
      localStorage.setItem("methodzOrganizationDirectory", JSON.stringify([{ name: "Disposable organization" }]));
      localStorage.setItem("methodzMeetingTemplates", JSON.stringify([{ label: "Disposable template" }]));
      localStorage.setItem("methodzMeetingReleaseState", JSON.stringify({ approvals: [] }));
      localStorage.setItem("methodzSigningPublicKeys", JSON.stringify([{ keyId: "disposable-public-key", kty: "EC", crv: "P-256", x: "x", y: "y" }]));
      localStorage.setItem("methodzKeyCustodyRecordsV162", JSON.stringify([{ keyId: "disposable-public-key", status: "active" }]));
      localStorage.setItem("methodzRecoveryDrillLog", JSON.stringify([{ result: "passed" }]));
      localStorage.setItem(queueKey, JSON.stringify([{ id: "workspace-queue-copy" }]));
      localStorage.setItem(evidenceKey, JSON.stringify([{ id: "workspace-evidence-copy" }]));
    }, { queueKey: QUEUE_KEY, evidenceKey: EVIDENCE_KEY });
    await sourcePage.reload();
    const workspacePackage = await sourcePage.evaluate(() => window.createWorkspacePackageV08());
    const bundle = buildBundle(workspacePackage);

    await destinationPage.goto(`${BASE_URL}/meeting.html`);
    await destinationPage.evaluate(() => {
      localStorage.clear();
      localStorage.setItem("methodzMeetingRecords", JSON.stringify([{ id: "destination-active", title: "Destination before transfer" }]));
      localStorage.setItem("methodzArchivedMeetingRecords", JSON.stringify([]));
      localStorage.setItem("methodzMeetingRevisions", JSON.stringify({ "destination-active": [{ revision: 1 }] }));
      localStorage.setItem("methodzSigningPublicKeys", JSON.stringify([]));
    });
    await destinationPage.reload();

    await destinationPage.locator("#transferImportFileV168").setInputFiles({
      name: "methodz-v169-two-profile-transfer.json",
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

    await destinationPage.evaluate(() => window.refreshTransferAcceptanceV169());
    await expect(destinationPage.locator("#transferAcceptancePanelV169")).toBeVisible();
    await expect(destinationPage.locator("#transferAcceptanceTransferStateV169")).toContainText("Verified destination transfer detected");
    const checklist = destinationPage.locator("[data-acceptance-check-v169]");
    await expect(checklist).toHaveCount(10);
    for (let index = 0; index < 10; index += 1) await checklist.nth(index).check();
    destinationPage.once("dialog", (dialog) => dialog.accept());
    await destinationPage.getByRole("button", { name: "Complete Acceptance" }).click();
    await expect(destinationPage.locator("#transferAcceptanceStatusV169")).toContainText("Destination acceptance completed");

    await destinationPage.getByRole("button", { name: "Run Diagnostics" }).click();
    await expect(destinationPage.locator("#workspaceDiagnosticsV169")).toContainText("Aggregate Diagnostics Complete");

    const evidence = await destinationPage.evaluate(() => ({
      records: JSON.parse(localStorage.getItem("methodzMeetingRecords") || "[]"),
      reports: JSON.parse(localStorage.getItem("methodzTransferAcceptanceReportsV169") || "[]"),
      diagnostics: JSON.parse(localStorage.getItem("methodzWorkspaceDiagnosticsReportsV169") || "[]")
    }));
    expect(evidence.records[0].id).toBe("source-active");
    expect(evidence.reports.at(-1).accepted).toBe(true);
    expect(JSON.stringify(evidence.reports)).not.toContain("Disposable source meeting");
    expect(JSON.stringify(evidence.reports)).not.toContain("source-active");
    expect(JSON.stringify(evidence.diagnostics)).not.toContain("Disposable source meeting");
    expect(JSON.stringify(evidence.diagnostics)).not.toContain("methodzMeetingRecords");

    await destinationPage.reload();
    await expect(destinationPage.locator("#transferAcceptanceStatusV169")).toContainText("completed acceptance report");
    await expect(destinationPage.locator("[data-acceptance-check-v169]:checked")).toHaveCount(10);

    await destinationPage.getByRole("button", { name: "Preview Rollback" }).click();
    await expect(destinationPage.locator("#transferRollbackPreviewV169")).toContainText("Verified Rollback Preview");
    await destinationPage.locator("#transferRollbackReviewedV169").check();
    await destinationPage.locator("#transferRollbackPhraseV169").fill("ROLLBACK");
    destinationPage.once("dialog", (dialog) => dialog.accept());
    await destinationPage.getByRole("button", { name: "Restore Pre-Import Recovery" }).click();
    await expect(destinationPage.locator("#transferAcceptanceStatusV169")).toContainText("Pre-import recovery restored and verified");

    const restored = await destinationPage.evaluate(() => ({
      records: JSON.parse(localStorage.getItem("methodzMeetingRecords") || "[]"),
      rollbackRecovery: localStorage.getItem("methodzTransferRollbackRecoveryV169"),
      reports: JSON.parse(localStorage.getItem("methodzTransferAcceptanceReportsV169") || "[]"),
      transferState: JSON.parse(localStorage.getItem("methodzCrossDeviceTransferStateV168") || "{}")
    }));
    expect(restored.records[0].id).toBe("destination-active");
    expect(restored.rollbackRecovery).toBeTruthy();
    expect(restored.reports.at(-1).reportType).toBe("methodz-transfer-rollback-rehearsal-report");
    expect(restored.reports.at(-1).readBackVerified).toBe(true);
    expect(restored.transferState.stage).toBe("rolled-back-to-pre-import");
    expect(JSON.stringify(restored.reports.at(-1))).not.toContain("Destination before transfer");

    await destinationPage.reload();
    await expect(destinationPage.locator("#transferAcceptanceTransferStateV169")).toContainText("No verified destination transfer state");
    await expect(destinationPage.locator("#transferAcceptanceStatusV169")).toContainText("Acceptance is blocked");

    await sourceContext.close();
    await destinationContext.close();
  });
});
