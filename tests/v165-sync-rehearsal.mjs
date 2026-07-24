import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Contract = require("../provider-contract.js");
const Adapters = require("../hosted-provider-adapters.js");
const Pilot = require("../http-provider-pilot.js");
const Sync = require("../sync-rehearsal-hardening.js");

class MemoryStorage {
  constructor() { this.values = new Map(); }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}

function createLocalRepository(records = []) {
  const active = new Map(records.map((record) => [record.id, Contract.clone(record)]));
  return {
    active,
    async getRecord(recordId) { return active.has(recordId) ? Contract.clone(active.get(recordId)) : null; },
    async upsertRecord(record) { active.set(record.id, Contract.clone(record)); return Contract.clone(record); }
  };
}

function createRecord(id, title = "Operations Review") {
  return {
    id,
    title,
    date: "2026-07-24",
    status: "Completed",
    notes: "Sensitive meeting content that must never appear in reports.",
    unknownFutureField: { preserved: true },
    attachments: [{ id: "ref-1", location: "protected-drive://meeting/ref-1" }],
    governance: { hold: true },
    signatureMetadata: { publicKeyId: "public-only" }
  };
}

function createPilot(tenantId, suffix = tenantId) {
  return Pilot.createPilotProvider({
    tenantId,
    suffix,
    maxRetries: 0,
    timeoutMs: 200,
    retryDelay: async () => {}
  });
}

async function run() {
  assert.equal(Sync.version, "1.0.0");
  assert.equal(Sync.queueStates.BLOCKED_CONFLICT, "blocked-conflict");

  const storage = new MemoryStorage();
  const record = createRecord("meeting-sync-1");
  const local = createLocalRepository([record]);
  const remote = createPilot("tenant-a", "basic");
  const queueStore = new Sync.StorageQueueStore({ storage, key: "queue", maximumEntries: 20 });
  const coordinator = new Sync.SyncRehearsalCoordinator({
    tenantId: "tenant-a",
    remoteProvider: remote,
    localRepository: local,
    queueStore,
    online: false
  });

  const offlineEntry = coordinator.enqueuePush(record, { entryId: "queue-offline", idempotencyKey: "idem-offline" });
  assert.equal(offlineEntry.state, "offline");
  assert.equal(coordinator.listQueue().length, 1);

  const recoveredCoordinator = new Sync.SyncRehearsalCoordinator({
    tenantId: "tenant-a",
    remoteProvider: remote,
    localRepository: local,
    queueStore: new Sync.StorageQueueStore({ storage, key: "queue" })
  });
  assert.equal(recoveredCoordinator.listQueue()[0].id, "queue-offline", "queue must recover after reload");
  recoveredCoordinator.setOnline(true);
  const pushed = await recoveredCoordinator.process("queue-offline");
  assert.equal(pushed.state, "completed");
  assert.equal((await remote.getRecord(record.id)).record.unknownFutureField.preserved, true);

  const uncertainRecord = createRecord("meeting-sync-uncertain", "Uncertain Write");
  local.active.set(uncertainRecord.id, Contract.clone(uncertainRecord));
  recoveredCoordinator.enqueuePush(uncertainRecord, { entryId: "queue-uncertain", idempotencyKey: "idem-uncertain" });
  remote.queueFault("upsertRecord", { kind: "dropResponse", phase: "after" });
  const uncertain = await recoveredCoordinator.process("queue-uncertain");
  assert.equal(uncertain.state, "retryable-error");
  assert.equal(uncertain.lastError.retryable, true);
  recoveredCoordinator.retry("queue-uncertain");
  const reconciled = await recoveredCoordinator.process("queue-uncertain");
  assert.equal(reconciled.state, "completed");
  assert.equal(reconciled.idempotentReplay, true, "retry must reuse the original idempotency key");

  const changedRecord = createRecord("meeting-sync-local-change", "Original");
  local.active.set(changedRecord.id, Contract.clone(changedRecord));
  recoveredCoordinator.enqueuePush(changedRecord, { entryId: "queue-local-change", idempotencyKey: "idem-local-change" });
  local.active.set(changedRecord.id, { ...changedRecord, title: "Changed after enqueue" });
  const blockedLocal = await recoveredCoordinator.process("queue-local-change");
  assert.equal(blockedLocal.state, "blocked-conflict");
  assert.equal(blockedLocal.lastError.code, "LOCAL_CHANGED_AFTER_ENQUEUE");
  const conflictPreview = recoveredCoordinator.conflictPreview("queue-local-change");
  assert.ok(conflictPreview.localChangedPaths.includes("$.title"));
  assert.equal(conflictPreview.valuesIncluded, false);

  const remoteConflictRecord = createRecord("meeting-sync-remote-change", "Remote Base");
  local.active.set(remoteConflictRecord.id, Contract.clone(remoteConflictRecord));
  const firstWrite = await remote.upsertRecord(remoteConflictRecord, { idempotencyKey: "remote-base" });
  const localWithToken = Contract.clone(firstWrite.record);
  local.active.set(remoteConflictRecord.id, localWithToken);
  recoveredCoordinator.enqueuePush(localWithToken, {
    entryId: "queue-remote-conflict",
    idempotencyKey: "idem-remote-conflict",
    sourceConflictToken: firstWrite.conflictToken
  });
  await remote.upsertRecord({ ...firstWrite.record, title: "Remote changed" }, {
    idempotencyKey: "remote-change",
    expectedConflictToken: firstWrite.conflictToken
  });
  const blockedRemote = await recoveredCoordinator.process("queue-remote-conflict");
  assert.equal(blockedRemote.state, "blocked-conflict");
  assert.equal(blockedRemote.lastError.code, Contract.errorCodes.CONFLICT);
  const rebased = await recoveredCoordinator.resolveConflict("queue-remote-conflict", "rebase-and-push");
  assert.equal(rebased.state, "pending");
  assert.notEqual(rebased.idempotencyKey, "idem-remote-conflict");

  const pullRemote = createPilot("tenant-pull", "pull");
  const pullRecord = createRecord("meeting-pull-1", "Remote Pull");
  await pullRemote.upsertRecord(pullRecord, { idempotencyKey: "pull-seed" });
  const pullLocal = createLocalRepository([]);
  const pullCoordinator = new Sync.SyncRehearsalCoordinator({
    tenantId: "tenant-pull",
    remoteProvider: pullRemote,
    localRepository: pullLocal,
    queueStore: new Sync.MemoryQueueStore()
  });
  const preview = await pullCoordinator.previewPull();
  assert.equal(preview.candidates.length, 1);
  assert.equal(await pullLocal.getRecord(pullRecord.id), null, "preview must not mutate local data");
  const pullEntry = await pullCoordinator.enqueuePull(pullRecord.id, { entryId: "queue-pull" });
  assert.equal(pullEntry.state, "pending");
  await pullCoordinator.process("queue-pull");
  assert.equal((await pullLocal.getRecord(pullRecord.id)).title, "Remote Pull");

  const sharedSimulator = new Pilot.HttpProviderSimulator({ id: "tenant-isolation-simulator" });
  const tenantOne = new Pilot.HttpHostedProviderClient({ simulator: sharedSimulator, tenantId: "tenant-one", maxRetries: 0 });
  const tenantTwo = new Pilot.HttpHostedProviderClient({ simulator: sharedSimulator, tenantId: "tenant-two", maxRetries: 0 });
  await tenantOne.upsertRecord(createRecord("isolated-record"), { idempotencyKey: "tenant-one-write" });
  assert.equal((await tenantTwo.listRecords()).length, 0, "tenant state must remain isolated");

  const report = recoveredCoordinator.createReport();
  const reportText = JSON.stringify(report);
  assert.equal(report.packageType, "methodz-sync-rehearsal-report");
  assert.ok(report.integrity.value);
  assert.equal(reportText.includes("Sensitive meeting content"), false);
  assert.equal(reportText.includes("Operations Review"), false);
  assert.equal(reportText.includes("idem-offline"), false);
  assert.equal(reportText.includes(firstWrite.conflictToken), false);
  assert.equal(reportText.includes("privateKey"), false);

  assert.throws(() => recoveredCoordinator.enqueuePush({
    ...createRecord("unsafe-record"),
    privateJwk: { kty: "EC", crv: "P-256", x: "x", y: "y", d: "private" }
  }), (error) => error.code === Contract.errorCodes.PRIVATE_KEY_REJECTED);

  console.log("v1.6.5 synchronization rehearsal tests passed");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
