import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const WorkspaceCore = require("../workspace-package-core.js");
const QueueCore = require("../sync-queue-portability.js");
const TransferCore = require("../cross-device-transfer-core.js");

const NOW = "2026-07-27T12:00:00.000Z";
const TENANT = "methodz-rehearsal";
const storageKeys = {
  records: "methodzMeetingRecords",
  archivedRecords: "methodzArchivedMeetingRecords",
  revisions: "methodzMeetingRevisions",
  signingPublicKeys: "methodzSigningPublicKeys"
};

function workspacePackage(overrides = {}) {
  const entries = {
    methodzMeetingRecords: JSON.stringify([{ id: "record-active-1", title: "Private meeting title" }]),
    methodzArchivedMeetingRecords: JSON.stringify([{ id: "record-archive-1", title: "Archived private title" }]),
    methodzMeetingRevisions: JSON.stringify({ "record-active-1": [{ revision: 1 }] }),
    methodzSigningPublicKeys: JSON.stringify([{ keyId: "public-key-1", kty: "EC", crv: "P-256", x: "public-x", y: "public-y" }]),
    methodzRecoveryDrillLog: JSON.stringify([{ result: "passed", generatedAt: NOW }]),
    ...overrides
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

function queuePackage() {
  return QueueCore.buildQueuePackage({
    tenantId: TENANT,
    providerId: "disposable-http-pilot",
    generatedAt: NOW,
    entries: [{
      id: "queue-entry-1",
      version: "1.0.0",
      tenantId: TENANT,
      operation: "push",
      state: "pending",
      recordId: "record-active-1",
      idempotencyKey: "idempotency-1",
      attempts: 0,
      createdAt: NOW,
      updatedAt: NOW
    }]
  });
}

function evidencePackage() {
  const event = QueueCore.createOperatorEvent({
    id: "event-1",
    tenantId: TENANT,
    eventType: "queue-export",
    operation: "push",
    state: "pending",
    result: "exported",
    counts: { entries: 1 },
    occurredAt: NOW
  });
  return QueueCore.buildOperatorEvidencePackage({ tenantId: TENANT, events: [event], generatedAt: NOW });
}

function readinessReport() {
  return {
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
}

const transfer = TransferCore.buildTransferPackage({
  workspacePackage: workspacePackage(),
  queuePackage: queuePackage(),
  operatorEvidencePackage: evidencePackage(),
  readinessReport: readinessReport(),
  storageKeys,
  expectedTenantId: TENANT,
  generatedAt: NOW,
  sourceSessionSeed: "source-device-a",
  checkpoints: {
    sourceWorkspaceSaved: true,
    privateKeysSeparated: true,
    sourceKeptUnchanged: true
  }
});

assert.equal(transfer.packageType, TransferCore.packageType);
assert.equal(transfer.packageVersion, "1.0.0");
assert.equal(transfer.boundaries.includesPrivateSigningKeys, false);
assert.equal(transfer.manifest.workspace.checksumVerified, true);
assert.equal(transfer.manifest.synchronizationQueue.summary.entryCount, 1);

const currentEntries = {
  methodzMeetingRecords: JSON.stringify([{ id: "record-active-1" }]),
  methodzArchivedMeetingRecords: JSON.stringify([{ id: "record-archive-1" }]),
  methodzMeetingRevisions: JSON.stringify({ "record-active-1": [{ revision: 9 }] }),
  methodzSigningPublicKeys: JSON.stringify([{ keyId: "public-key-1" }])
};
const inspection = TransferCore.inspectTransferPackage(transfer, {
  storageKeys,
  expectedTenantId: TENANT,
  currentWorkspaceEntries: currentEntries,
  currentQueueEntries: [{ id: "queue-entry-1" }]
});

assert.equal(inspection.valid, true);
assert.equal(inspection.checksumVerified, true);
assert.equal(inspection.workspaceReport.checksumVerified, true);
assert.equal(inspection.queueReport.checksumVerified, true);
assert.equal(inspection.operatorEvidenceReport.checksumVerified, true);
assert.equal(inspection.collisions.counts.activeRecords, 1);
assert.equal(inspection.collisions.counts.archivedRecords, 1);
assert.equal(inspection.collisions.counts.revisionGroups, 1);
assert.equal(inspection.collisions.counts.publicVerificationKeys, 1);
assert.equal(inspection.collisions.counts.synchronizationQueueEntries, 1);
assert.equal(inspection.collisions.total, 5);
assert.match(inspection.collisions.groups.activeRecords[0], /^record:/);
assert.equal(JSON.stringify(inspection.collisions).includes("record-active-1"), false);

const report = TransferCore.buildRehearsalReport({
  stage: "destination-inspected",
  inspection,
  generatedAt: NOW,
  rehearsalSeed: "destination-device-b",
  checkpoints: {
    packageInspected: true,
    recoveryDrillPassed: true,
    destinationReadinessRun: true
  }
});

assert.equal(report.reportType, TransferCore.reportType);
assert.equal(report.integrity.transferPackageVerified, true);
assert.equal(report.counts.destinationCollisions, 5);
assert.equal(report.boundaries.containsMeetingContent, false);
assert.equal(report.boundaries.containsRecordIds, false);
assert.equal(JSON.stringify(report).includes("Private meeting title"), false);
assert.equal(JSON.stringify(report).includes("record-active-1"), false);
assert.equal(JSON.stringify(report).includes("queue-entry-1"), false);

const tampered = structuredClone(transfer);
tampered.components.workspace.entries.methodzMeetingRecords = JSON.stringify([{ id: "tampered" }]);
const tamperedInspection = TransferCore.inspectTransferPackage(tampered, { storageKeys, expectedTenantId: TENANT });
assert.equal(tamperedInspection.valid, false);
assert.equal(tamperedInspection.checksumVerified, false);
assert.ok(tamperedInspection.errors.some((message) => message.includes("integrity validation failed")));

const unsafeWorkspace = workspacePackage({
  methodzUnsafeFixture: JSON.stringify({ privateJwk: { kty: "EC", crv: "P-256", d: "private-secret" } })
});
assert.throws(() => TransferCore.buildTransferPackage({
  workspacePackage: unsafeWorkspace,
  queuePackage: queuePackage(),
  operatorEvidencePackage: evidencePackage(),
  readinessReport: readinessReport(),
  storageKeys,
  expectedTenantId: TENANT,
  generatedAt: NOW
}), /Private cryptographic key material|private/i);

const unsafeReadiness = readinessReport();
unsafeReadiness.boundaries.containsRecordIds = true;
assert.throws(() => TransferCore.buildTransferPackage({
  workspacePackage: workspacePackage(),
  queuePackage: queuePackage(),
  operatorEvidencePackage: evidencePackage(),
  readinessReport: unsafeReadiness,
  storageKeys,
  expectedTenantId: TENANT,
  generatedAt: NOW
}), /metadata-only boundaries/i);

console.log("v1.6.8 cross-device transfer rehearsal core checks passed");
