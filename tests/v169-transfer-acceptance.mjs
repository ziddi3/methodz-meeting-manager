import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const WorkspaceCore = require("../workspace-package-core.js");
const AcceptanceCore = require("../transfer-acceptance-core.js");

const storageKeys = {
  records: "methodzMeetingRecords",
  archivedRecords: "methodzArchivedMeetingRecords",
  revisions: "methodzMeetingRevisions",
  directory: "methodzMeetingDirectory",
  organizationDirectory: "methodzOrganizationDirectory",
  templates: "methodzMeetingTemplates",
  signingPublicKeys: "methodzSigningPublicKeys",
  syncRehearsalQueue: "methodzSyncRehearsalQueueV165",
  preRestoreBackup: "methodzPreRestoreBackup",
  preRollbackBackup: "methodzPreRollbackBackupV169",
  crossDeviceTransferState: "methodzCrossDeviceTransferStateV168",
  crossDeviceTransferReports: "methodzCrossDeviceTransferReportsV168",
  transferAcceptanceState: "methodzTransferAcceptanceStateV169",
  transferAcceptanceReports: "methodzTransferAcceptanceReportsV169",
  transferRollbackReports: "methodzTransferRollbackReportsV169",
  workspaceDiagnosticsReports: "methodzWorkspaceDiagnosticsReportsV169",
  meetingDayPreferences: "methodzMeetingDayPreferencesV169"
};

function makePackage(entries) {
  const body = {
    packageType: WorkspaceCore.PACKAGE_TYPE,
    packageVersion: 1,
    schemaVersion: "1.6.0",
    exportedAt: "2026-07-27T12:00:00.000Z",
    entries,
    summary: WorkspaceCore.summarizeEntries(entries, storageKeys)
  };
  return { ...body, checksum: WorkspaceCore.hashText(WorkspaceCore.stableStringify(body)) };
}

const entries = {
  methodzMeetingRecords: JSON.stringify([{ id: "record-alpha", title: "Disposable meeting" }]),
  methodzArchivedMeetingRecords: JSON.stringify([{ id: "record-beta", title: "Archived disposable meeting" }]),
  methodzMeetingRevisions: JSON.stringify({ "record-alpha": [{ revision: 1 }] }),
  methodzMeetingDirectory: JSON.stringify([{ name: "Disposable attendee" }]),
  methodzOrganizationDirectory: JSON.stringify([{ name: "Disposable organization" }]),
  methodzMeetingTemplates: JSON.stringify([{ id: "template-one" }]),
  methodzGovernanceState: JSON.stringify({ classification: "Internal" }),
  methodzSigningPublicKeys: JSON.stringify([{ keyId: "public-test-key" }]),
  methodzKeyCustodyRecordsV162: JSON.stringify([{ ceremony: "rotation" }]),
  methodzRecoveryDrillHistory: JSON.stringify([{ result: "passed" }]),
  "methodzSyncRehearsalQueueV165:tenanthash": JSON.stringify([{ queueId: "queue-one" }])
};

const transferReport = {
  reportType: "methodz-cross-device-transfer-report",
  stage: "destination-import-verified",
  result: { postImportVerified: true },
  counts: {
    activeRecords: 1,
    archivedRecords: 1,
    revisionGroups: 1,
    queueEntries: 1
  }
};

const preRestorePackage = makePackage({
  methodzMeetingRecords: JSON.stringify([]),
  methodzArchivedMeetingRecords: JSON.stringify([]),
  methodzMeetingRevisions: JSON.stringify({})
});

const acceptance = AcceptanceCore.buildAcceptanceReport({
  entries,
  transferReport,
  preRestorePackage,
  storageKeys,
  preRestoreKey: "methodzPreRestoreBackup",
  appShellVersion: "1.6.9",
  recordSchemaVersion: "1.6.0",
  durationMs: 4.2
});

assert.equal(acceptance.ready, true, "matching imported counts and a verified recovery package should be ready");
assert.equal(acceptance.checks.transferImportReportVerified, true);
assert.equal(acceptance.checks.preImportRecoveryVerified, true);
assert.equal(acceptance.summary.activeRecords, 1);
assert.equal(acceptance.summary.archivedRecords, 1);
assert.equal(acceptance.summary.revisionGroups, 1);
assert.equal(AcceptanceCore.reportIsMetadataOnly(acceptance), true);
assert.equal(JSON.stringify(acceptance).includes("record-alpha"), false, "acceptance reports must exclude raw record identifiers");
assert.equal(JSON.stringify(acceptance).includes("Disposable attendee"), false, "acceptance reports must exclude attendee names");
assert.equal(JSON.stringify(acceptance).includes("methodzMeetingRecords"), false, "acceptance reports must exclude storage-key names");

const mismatch = AcceptanceCore.buildAcceptanceReport({
  entries,
  transferReport: { ...transferReport, counts: { ...transferReport.counts, activeRecords: 9 } },
  preRestorePackage,
  storageKeys,
  preRestoreKey: "methodzPreRestoreBackup"
});
assert.equal(mismatch.ready, false, "count mismatches must block acceptance");
assert.equal(mismatch.categories.find((item) => item.id === "activeRecords")?.status, "fail");

const emptyAcceptance = AcceptanceCore.buildAcceptanceReport({
  entries: {},
  transferReport: {
    ...transferReport,
    counts: { activeRecords: 0, archivedRecords: 0, revisionGroups: 0, queueEntries: 0 }
  },
  preRestorePackage,
  storageKeys,
  preRestoreKey: "methodzPreRestoreBackup"
});
assert.equal(emptyAcceptance.ready, true, "verified zero-count categories may omit empty storage keys");
assert.equal(emptyAcceptance.categories.find((item) => item.id === "activeRecords")?.status, "pass");
assert.equal(emptyAcceptance.categories.find((item) => item.id === "archivedRecords")?.status, "pass");
assert.equal(emptyAcceptance.categories.find((item) => item.id === "revisionGroups")?.status, "pass");

const rollback = AcceptanceCore.buildRollbackPreview(preRestorePackage, entries, {
  storageKeys,
  preRestoreKey: "methodzPreRestoreBackup"
});
assert.equal(rollback.valid, true);
assert.equal(rollback.checksumVerified, true);
assert.ok(rollback.counts.replace >= 3);
assert.ok(rollback.counts.remove >= 1);
assert.equal(JSON.stringify(rollback).includes("record-alpha"), false, "rollback previews must expose counts, not identifiers");

const rollbackWithPreservedControls = AcceptanceCore.buildRollbackPreview(preRestorePackage, {
  ...entries,
  methodzTransferAcceptanceStateV169: JSON.stringify({ stage: "accepted" }),
  methodzTransferAcceptanceReportsV169: JSON.stringify([{ accepted: true }]),
  methodzWorkspaceDiagnosticsReportsV169: JSON.stringify([{ level: "ready" }]),
  methodzMeetingDayPreferencesV169: JSON.stringify({ enabled: true })
}, {
  storageKeys,
  preRestoreKey: "methodzPreRestoreBackup"
});
assert.deepEqual(rollbackWithPreservedControls.counts, rollback.counts, "rollback preview must exclude control entries preserved by the real mutation path");

const rollbackReport = AcceptanceCore.buildRollbackReport({
  preview: rollback,
  rollbackApplied: true,
  rollbackVerified: true,
  restoredSummary: preRestorePackage.summary,
  durationMs: 7.5
});
assert.equal(rollbackReport.rollbackVerified, true);
assert.equal(AcceptanceCore.reportIsMetadataOnly(rollbackReport), true);

const diagnostics = AcceptanceCore.buildDiagnosticsReport({
  entries,
  storageKeys,
  startedAtMs: 10,
  finishedAtMs: 15.5,
  usageBytes: 2048,
  quotaBytes: 1024 * 1024,
  warningBytes: 8 * 1024 * 1024,
  criticalBytes: 12 * 1024 * 1024
});
assert.equal(diagnostics.level, "ready");
assert.equal(diagnostics.durationMs, 5.5);
assert.equal(diagnostics.storage.entryCount, Object.keys(entries).length);
assert.equal(diagnostics.storage.parseErrors, 0);
assert.equal(AcceptanceCore.reportIsMetadataOnly(diagnostics), true);
assert.equal(JSON.stringify(diagnostics).includes("record-alpha"), false);
assert.equal(JSON.stringify(diagnostics).includes("methodzMeetingRecords"), false);

console.log("v1.6.9 transfer acceptance, rollback, and diagnostics core tests passed");
