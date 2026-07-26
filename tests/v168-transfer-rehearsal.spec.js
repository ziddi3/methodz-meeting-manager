const { test, expect } = require("@playwright/test");
const Contract = require("../provider-contract.js");
const WorkspaceCore = require("../workspace-package-core.js");
const QueueCore = require("../sync-queue-portability.js");
const TransferCore = require("../cross-device-transfer-core.js");

const BASE_URL = process.env.METHODZ_BASE_URL || "http://127.0.0.1:4173";
const NOW = "2026-07-27T12:00:00.000Z";
const TENANT = "methodz-rehearsal";
const storageKeys = {
  records: "methodzMeetingRecords",
  archivedRecords: "methodzArchivedMeetingRecords",
  revisions: "methodzMeetingRevisions",
  signingPublicKeys: "methodzSigningPublicKeys"
};

function makeWorkspacePackage() {
  const entries = {
    methodzMeetingRecords: JSON.stringify([{ id: "incoming-active", title: "Incoming meeting" }]),
    methodzArchivedMeetingRecords: JSON.stringify([{ id: "incoming-archive", title: "Incoming archive" }]),
    methodzMeetingRevisions: JSON.stringify({ "incoming-active": [{ revision: 1 }] }),
    methodzSigningPublicKeys: JSON.stringify([{ keyId: "incoming-public-key", kty: "EC", crv: "P-256", x: "x", y: "y" }]),
    methodzRecoveryDrillLog: JSON.stringify([{ result: "passed", generatedAt: NOW }])
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

function makeBundle() {
  const queue = QueueCore.buildQueuePackage({
    tenantId: TENANT,
    providerId: "disposable-http-pilot",
    generatedAt: NOW,
    entries: []
  });
  const evidence = QueueCore.buildOperatorEvidencePackage({
    tenantId: TENANT,
    generatedAt: NOW,
    events: []
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
  return TransferCore.buildTransferPackage({
    workspacePackage: makeWorkspacePackage(),
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

  test("inspects, drills, and applies only after explicit approval", async ({ page }) => {
    await expect(page.locator("#crossDeviceTransferPanelV168")).toBeVisible();
    const bundle = makeBundle();
    const before = await page.evaluate(() => localStorage.getItem("methodzMeetingRecords"));

    await page.locator("#transferImportFileV168").setInputFiles({
      name: "methodz-transfer.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(bundle))
    });

    await expect(page.locator("#transferInspectionV168")).toContainText("Verified Destination Preview");
    await expect(page.locator("#transferInspectionV168")).toContainText("integrity verified");

    await page.getByRole("button", { name: "Run No-Write Recovery Drill" }).click();
    await expect(page.locator("#transferDrillV168")).toContainText("No-Write Recovery Drill Passed");
    expect(await page.evaluate(() => localStorage.getItem("methodzMeetingRecords"))).toBe(before);

    await page.locator("#transferDestinationReadyV168").check();
    await page.locator("#transferCollisionReviewedV168").check();
    await page.locator("#transferSourceUnchangedV168").check();
    await page.locator("#transferImportApprovedV168").check();
    await page.locator("#transferApprovalPhraseV168").fill("TRANSFER");
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Apply Verified Transfer" }).click();

    await expect(page.locator("#transferStatusV168")).toContainText("Verified transfer applied");
    const result = await page.evaluate(() => ({
      records: JSON.parse(localStorage.getItem("methodzMeetingRecords") || "[]"),
      recovery: localStorage.getItem("methodzPreRestoreBackup"),
      reports: JSON.parse(localStorage.getItem("methodzCrossDeviceTransferReportsV168") || "[]")
    }));
    expect(result.records[0].id).toBe("incoming-active");
    expect(result.recovery).toBeTruthy();
    expect(result.reports.at(-1).stage).toBe("destination-import-verified");
    expect(JSON.stringify(result.reports.at(-1))).not.toContain("Incoming meeting");
    expect(JSON.stringify(result.reports.at(-1))).not.toContain("incoming-active");
  });

  test("rejects tampering without changing destination storage", async ({ page }) => {
    const bundle = makeBundle();
    bundle.components.workspace.entries.methodzMeetingRecords = JSON.stringify([{ id: "tampered" }]);
    const before = await page.evaluate(() => localStorage.getItem("methodzMeetingRecords"));

    await page.locator("#transferImportFileV168").setInputFiles({
      name: "tampered-transfer.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(bundle))
    });

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
