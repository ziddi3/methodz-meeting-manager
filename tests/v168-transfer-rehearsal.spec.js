const { test, expect } = require("@playwright/test");
const Contract = require("../provider-contract.js");
const WorkspaceCore = require("../workspace-package-core.js");
const QueueCore = require("../sync-queue-portability.js");
const TransferCore = require("../cross-device-transfer-core.js");

const BASE_URL = process.env.METHODZ_BASE_URL || "http://127.0.0.1:4173";
const NOW = "2026-07-27T12:00:00.000Z";
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

function queueEntry(id = "component-queue-entry") {
  return {
    id,
    version: "1.0.0",
    tenantId: TENANT,
    operation: "push",
    state: "pending",
    recordId: "incoming-active",
    idempotencyKey: `idempotency-${id}`,
    attempts: 0,
    createdAt: NOW,
    updatedAt: NOW
  };
}

function makeWorkspacePackage(extraEntries = {}) {
  const entries = {
    methodzMeetingRecords: JSON.stringify([{ id: "incoming-active", title: "Incoming meeting" }]),
    methodzArchivedMeetingRecords: JSON.stringify([{ id: "incoming-archive", title: "Incoming archive" }]),
    methodzMeetingRevisions: JSON.stringify({ "incoming-active": [{ revision: 1 }] }),
    methodzSigningPublicKeys: JSON.stringify([{ keyId: "incoming-public-key", kty: "EC", crv: "P-256", x: "x", y: "y" }]),
    methodzRecoveryDrillLog: JSON.stringify([{ result: "passed", generatedAt: NOW }]),
    ...extraEntries
  };
  const body = {
    packageType: "methodz-meeting-manager-workspace",
    packageVersion: 1,
    schemaVersion: "1.6.0",
    exportedAt: NOW,
    entries,
    summary: WorkspaceCore.summarizeEntries(entries, storageKeys)
  };
  return { ...body, checksum: WorkspaceCore.hashText(WorkspaceCore.stableStringify(body)) };
}

function makeBundle(options = {}) {
  const queueEntries = options.queueEntries || [queueEntry()];
  const operatorEvent = QueueCore.createOperatorEvent({
    id: "component-operator-event",
    tenantId: TENANT,
    eventType: "queue-export",
    operation: "push",
    state: "pending",
    result: "exported",
    counts: { entries: queueEntries.length },
    occurredAt: NOW
  });
  const queue = QueueCore.buildQueuePackage({
    tenantId: TENANT,
    providerId: "disposable-http-pilot",
    generatedAt: NOW,
    entries: queueEntries
  });
  const evidence = QueueCore.buildOperatorEvidencePackage({
    tenantId: TENANT,
    generatedAt: NOW,
    events: [operatorEvent]
  });
  const readiness = {
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
  const workspacePackage = makeWorkspacePackage(options.workspaceEntries || {
    [QUEUE_KEY]: JSON.stringify([queueEntry("workspace-mismatch-entry")]),
    [EVIDENCE_KEY]: JSON.stringify([{ id: "workspace-mismatch-event" }])
  });
  return TransferCore.buildTransferPackage({
    workspacePackage,
    queuePackage: queue,
    operatorEvidencePackage: evidence,
    readinessReport: readiness,
    storageKeys,
    expectedTenantId: TENANT,
    generatedAt: NOW,
    sourceSessionSeed: "browser-source",
    checkpoints: {
      sourceWorkspaceSaved: true,
      privateKeysSeparated: true,
      sourceKeptUnchanged: true
    }
  });
}

async function selectBundle(page, bundle, name = "methodz-transfer.json") {
  await page.locator("#transferImportFileV168").setInputFiles({
    name,
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(bundle))
  });
}

async function completeApproval(page) {
  await page.locator("#transferDestinationReadyV168").check();
  await page.locator("#transferCollisionReviewedV168").check();
  await page.locator("#transferSourceUnchangedV168").check();
  await page.locator("#transferImportApprovedV168").check();
  await page.locator("#transferApprovalPhraseV168").fill("TRANSFER");
}

test.describe("v1.6.8 cross-device transfer rehearsal", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/meeting.html`);
    await page.evaluate(() => localStorage.clear());
    await page.evaluate(() => {
      localStorage.setItem("methodzMeetingRecords", JSON.stringify([{ id: "destination-active", title: "Destination meeting" }]));
      localStorage.setItem("methodzArchivedMeetingRecords", JSON.stringify([]));
      localStorage.setItem("methodzMeetingRevisions", JSON.stringify({ "destination-active": [{ revision: 1 }] }));
      localStorage.setItem("methodzSigningPublicKeys", JSON.stringify([]));
    });
    await page.reload();
  });

  test("inspects, drills, binds independent queue components, and applies only after explicit approval", async ({ page }) => {
    await expect(page.locator("#crossDeviceTransferPanelV168")).toBeVisible();
    const bundle = makeBundle();
    const before = await page.evaluate(() => localStorage.getItem("methodzMeetingRecords"));
    await selectBundle(page, bundle);

    await expect(page.locator("#transferInspectionV168")).toContainText("Verified Destination Preview");
    await expect(page.locator("#transferInspectionV168")).toContainText("integrity verified");

    await page.getByRole("button", { name: "Run No-Write Recovery Drill" }).click();
    await expect(page.locator("#transferDrillV168")).toContainText("No-Write Recovery Drill Passed");
    await expect(page.locator("#transferDrillV168")).toContainText("independently inspected queue");
    expect(await page.evaluate(() => localStorage.getItem("methodzMeetingRecords"))).toBe(before);

    await completeApproval(page);
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Apply Verified Transfer" }).click();

    await expect(page.locator("#transferStatusV168")).toContainText("Verified transfer applied");
    const result = await page.evaluate(({ queueKey, evidenceKey }) => ({
      records: JSON.parse(localStorage.getItem("methodzMeetingRecords") || "[]"),
      queue: JSON.parse(localStorage.getItem(queueKey) || "[]"),
      evidence: JSON.parse(localStorage.getItem(evidenceKey) || "[]"),
      recovery: localStorage.getItem("methodzPreRestoreBackup"),
      reports: JSON.parse(localStorage.getItem("methodzCrossDeviceTransferReportsV168") || "[]")
    }), { queueKey: QUEUE_KEY, evidenceKey: EVIDENCE_KEY });
    expect(result.records[0].id).toBe("incoming-active");
    expect(result.queue).toHaveLength(1);
    expect(result.queue[0].id).toBe("component-queue-entry");
    expect(result.queue[0].id).not.toBe("workspace-mismatch-entry");
    expect(result.evidence).toHaveLength(1);
    expect(result.evidence[0].id).toBe("component-operator-event");
    expect(result.recovery).toBeTruthy();
    expect(result.reports.at(-1).stage).toBe("destination-import-verified");
    expect(JSON.stringify(result.reports.at(-1))).not.toContain("Incoming meeting");
    expect(JSON.stringify(result.reports.at(-1))).not.toContain("incoming-active");
  });

  test("invalidates the drill and re-presents collisions when destination state changes", async ({ page }) => {
    const bundle = makeBundle();
    await selectBundle(page, bundle);
    await page.getByRole("button", { name: "Run No-Write Recovery Drill" }).click();
    await expect(page.locator("#transferDrillV168")).toContainText("No-Write Recovery Drill Passed");

    await page.evaluate(() => {
      localStorage.setItem("methodzMeetingRecords", JSON.stringify([{ id: "incoming-active", title: "Late local destination work" }]));
    });
    await completeApproval(page);
    await page.getByRole("button", { name: "Apply Verified Transfer" }).click();

    await expect(page.locator("#transferStatusV168")).toContainText("Destination workspace or collision state changed");
    await expect(page.locator("#transferInspectionV168")).toContainText("1 collisions");
    await expect(page.locator("#transferDrillV168")).toBeHidden();
    await expect(page.locator("#transferCollisionReviewedV168")).not.toBeChecked();
    await expect(page.locator("#transferImportApprovedV168")).not.toBeChecked();
    const records = await page.evaluate(() => JSON.parse(localStorage.getItem("methodzMeetingRecords") || "[]"));
    expect(records[0].title).toBe("Late local destination work");
  });

  test("rejects tampering without changing destination storage", async ({ page }) => {
    const bundle = makeBundle();
    bundle.components.workspace.entries.methodzMeetingRecords = JSON.stringify([{ id: "tampered" }]);
    const before = await page.evaluate(() => localStorage.getItem("methodzMeetingRecords"));
    await selectBundle(page, bundle, "tampered-transfer.json");

    await expect(page.locator("#transferInspectionV168")).toContainText("Transfer Package Rejected");
    expect(await page.evaluate(() => localStorage.getItem("methodzMeetingRecords"))).toBe(before);
  });

  test("keeps the narrow mobile viewport free of page-level horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await expect(page.locator("#crossDeviceTransferPanelV168")).toBeVisible();
    const metrics = await page.evaluate(() => ({
      innerWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth
    }));
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.innerWidth + 2);
  });
});
