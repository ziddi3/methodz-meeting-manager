import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Contract = require("../provider-contract.js");
const Portability = require("../sync-queue-portability.js");
const Workspace = require("../workspace-package-core.js");

const TENANT = "methodz-test-tenant";
const CREATED = "2026-07-25T12:00:00.000Z";

function record(id, title = "Operations Review") {
  return {
    id,
    title,
    date: "2026-07-25",
    status: "Completed",
    notes: "Meeting content belongs in the queue payload, never metadata-only evidence.",
    unknownFutureField: { preserved: true },
    attachments: [{ id: "reference-1", location: "protected-drive://reference-1" }]
  };
}

function queueEntry(overrides = {}) {
  const id = overrides.id || "queue-1";
  const recordId = overrides.recordId || "meeting-1";
  return {
    id,
    version: "1.0.0",
    tenantId: TENANT,
    operation: "push",
    recordId,
    recordRef: `record:${Contract.fnv1a32(recordId)}`,
    sourceConflictToken: null,
    idempotencyKey: `idempotency-${id}`,
    contentFingerprint: `sync:${id}`,
    baseFingerprint: null,
    sourceSnapshot: record(recordId),
    baseSnapshot: record(recordId),
    remoteSnapshot: null,
    state: "pending",
    attempts: 0,
    createdAt: CREATED,
    updatedAt: CREATED,
    lastError: null,
    resolution: null,
    ...overrides
  };
}

function run() {
  assert.equal(Portability.version, "1.0.0");
  assert.equal(Portability.queuePackageType, "methodz-sync-rehearsal-queue");

  const packagePayload = Portability.buildQueuePackage({
    tenantId: TENANT,
    providerId: "disposable-provider",
    entries: [queueEntry()],
    generatedAt: CREATED
  });
  const inspection = Portability.inspectQueuePackage(packagePayload, { expectedTenantId: TENANT });
  assert.equal(inspection.valid, true);
  assert.equal(inspection.checksumVerified, true);
  assert.equal(inspection.summary.entryCount, 1);
  assert.equal(inspection.summary.operations.push, 1);
  assert.equal(inspection.entries[0].sourceSnapshot.unknownFutureField.preserved, true);

  const tampered = structuredClone(packagePayload);
  tampered.entries[0].state = "completed";
  const tamperedInspection = Portability.inspectQueuePackage(tampered, { expectedTenantId: TENANT });
  assert.equal(tamperedInspection.valid, false);
  assert.equal(tamperedInspection.checksumVerified, false);
  assert.match(tamperedInspection.errors.join(" "), /integrity validation failed/i);

  const unsupported = structuredClone(packagePayload);
  unsupported.packageVersion = "99.0.0";
  assert.equal(Portability.inspectQueuePackage(unsupported, { expectedTenantId: TENANT }).valid, false);
  assert.equal(Portability.inspectQueuePackage(packagePayload, { expectedTenantId: "other-tenant" }).valid, false);

  assert.throws(() => Portability.buildQueuePackage({
    tenantId: TENANT,
    entries: [queueEntry({ sourceSnapshot: { ...record("private-record"), privateJwk: { kty: "EC", crv: "P-256", x: "x", y: "y", d: "private" } } })]
  }), (error) => error.code === Contract.errorCodes.PRIVATE_KEY_REJECTED);

  assert.throws(() => Portability.buildQueuePackage({
    tenantId: TENANT,
    entries: [queueEntry({ sourceSnapshot: { ...record("credential-record"), accessToken: "secret-token" } })]
  }), (error) => error.code === Contract.errorCodes.CREDENTIAL_REJECTED);

  assert.throws(() => Portability.buildQueuePackage({
    tenantId: TENANT,
    entries: [queueEntry({ sourceSnapshot: { ...record("binary-record"), fileBytes: [1, 2, 3] } })]
  }), (error) => error.code === Contract.errorCodes.BINARY_PAYLOAD_REJECTED);

  const localCollision = queueEntry({ id: "collision", updatedAt: "2026-07-25T12:10:00.000Z", state: "retryable-error" });
  const importedCollision = queueEntry({ id: "collision", updatedAt: "2026-07-25T12:20:00.000Z", state: "completed", completedAt: "2026-07-25T12:20:00.000Z" });
  const importedUnique = queueEntry({ id: "imported-unique", recordId: "meeting-2" });

  const keepLocal = Portability.mergeQueues([localCollision], [importedCollision, importedUnique], {
    tenantId: TENANT,
    strategy: "keep-local",
    maximumEntries: 10
  });
  assert.equal(keepLocal.entries.length, 2);
  assert.equal(keepLocal.entries.find((entry) => entry.id === "collision").state, "retryable-error");
  assert.equal(keepLocal.summary.retainedLocal, 1);

  const preferNewest = Portability.mergeQueues([localCollision], [importedCollision], {
    tenantId: TENANT,
    strategy: "prefer-newest-metadata",
    maximumEntries: 10
  });
  assert.equal(preferNewest.entries[0].state, "completed");
  assert.equal(preferNewest.summary.replacedByNewer, 1);

  const retainBoth = Portability.mergeQueues([localCollision], [importedCollision], {
    tenantId: TENANT,
    strategy: "retain-both",
    maximumEntries: 10,
    clock: () => Date.parse("2026-07-25T13:00:00.000Z")
  });
  assert.equal(retainBoth.entries.length, 2);
  assert.notEqual(retainBoth.entries[1].id, "collision");
  assert.equal(retainBoth.entries[1].importedFromId, "collision");

  const compactionEntries = [
    queueEntry({ id: "pending-protected", state: "pending" }),
    queueEntry({ id: "offline-protected", state: "offline" }),
    queueEntry({ id: "conflict-protected", state: "blocked-conflict" }),
    queueEntry({ id: "completed-old", state: "completed", completedAt: "2026-05-01T00:00:00.000Z", updatedAt: "2026-05-01T00:00:00.000Z" })
  ];
  const compactionPlan = Portability.planQueueCompaction(compactionEntries, {
    tenantId: TENANT,
    staleBefore: "2026-07-01T00:00:00.000Z",
    maximumRetained: 250
  });
  assert.deepEqual(compactionPlan.candidateIds, ["completed-old"]);
  assert.equal(compactionPlan.protectedEntries, 3);
  assert.throws(() => Portability.applyQueueCompaction(compactionEntries, ["pending-protected"], { tenantId: TENANT }), /Protected queue work/);
  const compacted = Portability.applyQueueCompaction(compactionEntries, ["completed-old"], { tenantId: TENANT });
  assert.equal(compacted.removed, 1);
  assert.equal(compacted.entries.some((entry) => entry.id === "pending-protected"), true);

  const enqueueEvent = Portability.createOperatorEvent({
    id: "event-1",
    tenantId: TENANT,
    eventType: "enqueue",
    entryId: "queue-1",
    operation: "push",
    state: "pending",
    result: "queued",
    occurredAt: CREATED
  });
  const importEvent = Portability.createOperatorEvent({
    id: "event-2",
    tenantId: TENANT,
    eventType: "queue-import",
    result: "applied",
    strategy: "keep-local",
    counts: { imported: 1, total: 2 },
    occurredAt: "2026-07-25T12:30:00.000Z"
  });
  const events = Portability.appendOperatorEvent([], enqueueEvent, { maximumEvents: 10 });
  const boundedEvents = Portability.appendOperatorEvent(events, importEvent, { maximumEvents: 1 });
  assert.equal(boundedEvents.length, 1);
  assert.equal(boundedEvents[0].id, "event-2");

  const evidence = Portability.buildOperatorEvidencePackage({
    tenantId: TENANT,
    events: [enqueueEvent, importEvent],
    generatedAt: CREATED
  });
  const evidenceText = JSON.stringify(evidence);
  assert.equal(evidenceText.includes(TENANT), false);
  assert.equal(evidenceText.includes("queue-1"), false);
  assert.equal(evidenceText.includes("meeting-1"), false);
  assert.equal(evidenceText.includes("Meeting content belongs"), false);
  assert.equal(Portability.inspectOperatorEvidencePackage(evidence).valid, true);

  const evidenceTampered = structuredClone(evidence);
  evidenceTampered.events[0].result = "changed";
  assert.equal(Portability.inspectOperatorEvidencePackage(evidenceTampered).valid, false);

  assert.throws(() => Portability.buildOperatorEvidencePackage({
    tenantId: TENANT,
    events: [{ ...enqueueEvent, notes: "meeting content leak" }]
  }), /unsupported field|meeting or secret material/i);

  const queueStorageKey = "methodzSyncRehearsalQueueV165:tenant-hash";
  assert.equal(Workspace.isRecognizedKey(queueStorageKey), true);
  const workspaceBody = {
    packageType: Workspace.PACKAGE_TYPE,
    packageVersion: 1,
    schemaVersion: "1.6.0",
    exportedAt: CREATED,
    entries: {
      methodzMeetingRecords: JSON.stringify([record("workspace-record")]),
      [queueStorageKey]: JSON.stringify([queueEntry()])
    }
  };
  workspaceBody.summary = Workspace.summarizeEntries(workspaceBody.entries, { records: "methodzMeetingRecords" });
  const workspacePayload = {
    ...workspaceBody,
    checksum: Workspace.hashText(Workspace.stableStringify(workspaceBody))
  };
  const workspaceInspection = Workspace.inspectWorkspacePackage(workspacePayload);
  assert.equal(workspaceInspection.valid, true);
  assert.equal(workspaceInspection.checksumVerified, true);
  assert.equal(workspaceInspection.recognizedKeys.includes(queueStorageKey), true);
  const restorePlan = Workspace.buildRestorePlan(workspacePayload, {}, { mode: "replace" });
  assert.equal(restorePlan.plan.add.includes(queueStorageKey), true);

  console.log("v1.6.6 synchronization queue portability tests passed");
}

run();
