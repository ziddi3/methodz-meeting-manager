import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Core = require("../transfer-acceptance-core.js");

const storageKeys = {
  records: "methodzMeetingRecords",
  archivedRecords: "methodzArchivedMeetingRecords",
  revisions: "methodzMeetingRevisions",
  directory: "methodzMeetingDirectory",
  organizationDirectory: "methodzOrganizationDirectory",
  templates: "methodzMeetingTemplates",
  releaseState: "methodzMeetingReleaseState",
  signingPublicKeys: "methodzSigningPublicKeys",
  keyCustodyRecords: "methodzKeyCustodyRecordsV162",
  recoveryDrillLog: "methodzRecoveryDrillLog",
  syncRehearsalQueue: "methodzSyncRehearsalQueueV165"
};

const entries = {
  methodzMeetingRecords: JSON.stringify([{ id: "secret-record-id", title: "Confidential meeting title" }]),
  methodzArchivedMeetingRecords: JSON.stringify([{ id: "archived-secret", summary: "Private archive text" }]),
  methodzMeetingRevisions: JSON.stringify({ "secret-record-id": [{ revision: 1 }] }),
  methodzMeetingDirectory: JSON.stringify([{ name: "Private attendee" }]),
  methodzOrganizationDirectory: JSON.stringify([{ name: "Private organization" }]),
  methodzMeetingTemplates: JSON.stringify([{ label: "Private template" }]),
  methodzMeetingReleaseState: JSON.stringify({ approvals: [{ by: "Private approver" }] }),
  methodzSigningPublicKeys: JSON.stringify([{ keyId: "public-key-id" }]),
  methodzKeyCustodyRecordsV162: JSON.stringify([{ keyId: "custody-key-id" }]),
  methodzRecoveryDrillLog: JSON.stringify([{ result: "passed" }]),
  methodzSyncRehearsalQueueV165: JSON.stringify([{ id: "queue-id", recordId: "secret-record-id" }])
};

const summary = Core.buildComponentSummary({ entries, storageKeys });
assert.equal(summary.totalEntries, 11);
assert.equal(summary.components.activeRecords.itemCount, 1);
assert.equal(summary.components.archivedRecords.itemCount, 1);
assert.equal(summary.components.revisions.itemCount, 1);
assert.equal(summary.components.directories.itemCount, 2);
assert.equal(summary.components.templates.itemCount, 1);
assert.equal(summary.components.governance.itemCount, 1);
assert.equal(summary.components.publicKeys.itemCount, 1);
assert.equal(summary.components.custody.itemCount, 1);
assert.equal(summary.components.recovery.itemCount, 1);
assert.equal(summary.components.tenantQueue.itemCount, 1);
assert.match(summary.fingerprint, /^fnv1a-[0-9a-f]{8}$/);

const allChecks = Object.fromEntries(Core.COMPONENTS.map((component) => [component.id, true]));
const acceptance = Core.buildAcceptanceReport({
  checks: allChecks,
  summary,
  transferStage: "destination-import-verified",
  appShellVersion: "1.6.9",
  recordSchemaVersion: "1.6.0",
  generatedAt: "2026-07-28T12:00:00.000Z"
});
assert.equal(acceptance.accepted, true);
assert.equal(acceptance.verifiedTransfer, true);
assert.equal(acceptance.missingComponents.length, 0);
assert.equal(acceptance.workspace.components.activeRecords.reviewed, true);

const incomplete = Core.buildAcceptanceReport({
  checks: { ...allChecks, custody: false },
  summary,
  transferStage: "destination-import-verified"
});
assert.equal(incomplete.accepted, false);
assert.deepEqual(incomplete.missingComponents, ["custody"]);

const unverified = Core.buildAcceptanceReport({
  checks: allChecks,
  summary,
  transferStage: "source-exported"
});
assert.equal(unverified.accepted, false);
assert.equal(unverified.verifiedTransfer, false);

const diagnostics = Core.buildDiagnosticsReport({
  summary,
  durationMilliseconds: 12.5,
  usageBytes: 750,
  quotaBytes: 1000,
  persisted: true,
  softStorageByteLimit: 1,
  storageWarningRatio: 0.75,
  appShellVersion: "1.6.9",
  recordSchemaVersion: "1.6.0",
  generatedAt: "2026-07-28T12:01:00.000Z"
});
assert.deepEqual(diagnostics.warnings.sort(), ["quota-ratio", "soft-storage-limit"]);
assert.equal(diagnostics.browserStorage.usageRatio, 0.75);
assert.equal(diagnostics.boundaries.containsStorageValues, false);
assert.equal(diagnostics.boundaries.containsStorageKeyNames, false);

const rollback = Core.buildRollbackReport({
  stage: "pre-import-recovery-restored",
  checksumVerified: true,
  recoveryCreated: true,
  mutationApplied: true,
  readBackVerified: true,
  counts: { add: 1, replace: 2, unchanged: 3, remove: 4, ignored: 5 },
  appShellVersion: "1.6.9",
  recordSchemaVersion: "1.6.0"
});
assert.equal(rollback.readBackVerified, true);
assert.equal(rollback.counts.remove, 4);

const serialized = JSON.stringify({ acceptance, diagnostics, rollback });
for (const forbidden of [
  "Confidential meeting title",
  "Private archive text",
  "Private attendee",
  "Private organization",
  "Private approver",
  "secret-record-id",
  "archived-secret",
  "queue-id",
  "public-key-id",
  "custody-key-id"
]) {
  assert.equal(serialized.includes(forbidden), false, `metadata report leaked ${forbidden}`);
}

console.log("v1.6.9 transfer acceptance metadata checks passed");
