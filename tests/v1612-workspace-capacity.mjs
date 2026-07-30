import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const originalTextEncoderDescriptor = Object.getOwnPropertyDescriptor(globalThis, "TextEncoder");
const NativeTextEncoder = globalThis.TextEncoder;
let textEncoderConstructions = 0;
let Capacity;

class InstrumentedTextEncoder {
  constructor() {
    textEncoderConstructions += 1;
    this.encoder = new NativeTextEncoder();
  }

  encode(value) {
    return this.encoder.encode(value);
  }

  encodeInto(source, destination) {
    return this.encoder.encodeInto(source, destination);
  }
}

function withInstrumentedTextEncoder(callback) {
  Object.defineProperty(globalThis, "TextEncoder", {
    configurable: true,
    enumerable: originalTextEncoderDescriptor?.enumerable ?? false,
    writable: true,
    value: InstrumentedTextEncoder
  });
  try {
    return callback();
  } finally {
    if (originalTextEncoderDescriptor) {
      Object.defineProperty(globalThis, "TextEncoder", originalTextEncoderDescriptor);
    } else {
      delete globalThis.TextEncoder;
    }
  }
}

Capacity = withInstrumentedTextEncoder(() => {
  const core = require("../workspace-capacity-core.js");
  assert.equal(core.utf8ByteLength("☀"), 3);
  assert.equal(core.utf8ByteLength("plain"), 5);
  assert.equal(core.utf8ByteLength("é"), 2);
  return core;
});

const Review = require("../meeting-review-core.js");

assert.equal(Capacity.version, "1.0.0");
assert.equal(textEncoderConstructions, 1, "capacity measurements should reuse one TextEncoder");

const snapshot = {
  methodzMeetingRecords: JSON.stringify([{ id: "private-record-id", title: "Private meeting title" }]),
  methodzArchiveVaultV09: JSON.stringify([{ id: "archive-secret" }]),
  methodzSyncQueueV165: JSON.stringify([{ payload: "secret queue payload" }]),
  methodzPanelRegistryDiagnosticsV1610: JSON.stringify({ result: "pass" })
};
const report = withInstrumentedTextEncoder(() => Capacity.buildCapacityReport(snapshot, {
  browserUsageBytes: 3000,
  quotaBytes: 10000,
  softBudgetBytes: 100000,
  warningPercent: 70,
  criticalPercent: 90
}));
assert.equal(report.status, "healthy");
assert.equal(report.utilizationPercent, 30);
assert.equal(report.counts.scannedEntries, 4);
assert.equal(report.boundaries.rawKeysIncluded, false);
assert.equal(report.boundaries.rawValuesIncluded, false);
assert.deepEqual(report.categories.map((item) => item.id), ["active-records", "archive", "sync-transfer", "preferences-diagnostics"]);
const serialized = JSON.stringify(report);
for (const forbidden of ["private-record-id", "Private meeting title", "archive-secret", "secret queue payload", "methodzMeetingRecords", "methodzSyncQueueV165"]) {
  assert.equal(serialized.includes(forbidden), false, `capacity report leaked ${forbidden}`);
}

const archivedRecordsReport = withInstrumentedTextEncoder(() => Capacity.buildCapacityReport({
  methodzArchivedMeetingRecords: JSON.stringify([{ id: "archived-record" }])
}));
assert.equal(Capacity.categoryForKey("methodzArchivedMeetingRecords").id, "archive");
assert.deepEqual(archivedRecordsReport.categories.map((item) => item.id), ["archive"]);
assert.equal(archivedRecordsReport.categories.some((item) => item.id === "active-records"), false);

const critical = withInstrumentedTextEncoder(() => Capacity.buildCapacityReport(
  { key: "x" },
  { browserUsageBytes: 95, quotaBytes: 100, softBudgetBytes: 1000 }
));
assert.equal(critical.status, "critical");
assert.equal(critical.utilizationPercent, 95);

const limited = withInstrumentedTextEncoder(() => Capacity.buildCapacityReport(
  { a: "1", b: "2", c: "3" },
  { maximumEntries: 2 }
));
assert.equal(limited.counts.truncated, true);
assert.equal(limited.counts.scannedEntries, 2);
assert.ok(limited.recommendations.some((item) => item.code === "entry-limit"));

const storageEntries = [
  ["methodzMeetingRecords", JSON.stringify([{ id: "active" }])],
  ["methodzArchivedMeetingRecords", JSON.stringify([{ id: "archived" }])],
  ["methodzSyncQueueV165", JSON.stringify([{ id: "queued" }])],
  ["methodzPanelRegistryDiagnosticsV1610", JSON.stringify({ result: "pass" })]
];
const selectedValueReads = [];
const boundedStorage = {
  get length() {
    return storageEntries.length;
  },
  key(index) {
    return storageEntries[index]?.[0] ?? null;
  },
  getItem(key) {
    selectedValueReads.push(key);
    return storageEntries.find(([entryKey]) => entryKey === key)?.[1] ?? null;
  }
};
const boundedStorageReport = withInstrumentedTextEncoder(() => Capacity.buildStorageCapacityReport(boundedStorage, {
  maximumEntries: 2,
  softBudgetBytes: 100000
}));
assert.equal(boundedStorageReport.availability.localStorage, "available");
assert.equal(boundedStorageReport.counts.totalEntries, 4);
assert.equal(boundedStorageReport.counts.scannedEntries, 2);
assert.equal(boundedStorageReport.counts.truncated, true);
assert.deepEqual(selectedValueReads, ["methodzArchivedMeetingRecords", "methodzMeetingRecords"]);

const storageReadFailureMessage = "deterministic localStorage read failure";
const failedStorageReport = withInstrumentedTextEncoder(() => Capacity.buildStorageCapacityReport({
  length: 1,
  key(index) {
    return index === 0 ? "methodzMeetingRecords" : null;
  },
  getItem() {
    throw new Error(storageReadFailureMessage);
  }
}));
assert.equal(failedStorageReport.status, "unavailable");
assert.equal(failedStorageReport.availability.localStorage, "unavailable");
assert.equal(failedStorageReport.availability.errorCode, "local-storage-read-failed");
assert.equal(failedStorageReport.counts.totalEntries, null);
assert.equal(failedStorageReport.counts.scannedEntries, null);
assert.equal(failedStorageReport.counts.truncated, null);
assert.notEqual(failedStorageReport.status, "healthy");
assert.equal(JSON.stringify(failedStorageReport).includes(storageReadFailureMessage), false);

const storageEnumerationFailureMessage = "deterministic localStorage enumeration failure";
const failedEnumerationReport = withInstrumentedTextEncoder(() => Capacity.buildStorageCapacityReport({
  length: 1,
  key() {
    throw new Error(storageEnumerationFailureMessage);
  },
  getItem() {
    assert.fail("value reads must not run after key enumeration fails");
  }
}));
assert.equal(failedEnumerationReport.status, "unavailable");
assert.equal(failedEnumerationReport.availability.localStorage, "unavailable");
assert.equal(failedEnumerationReport.availability.errorCode, "local-storage-read-failed");
assert.equal(failedEnumerationReport.counts.totalEntries, null);
assert.equal(failedEnumerationReport.counts.scannedEntries, null);
assert.equal(JSON.stringify(failedEnumerationReport).includes(storageEnumerationFailureMessage), false);
assert.equal(textEncoderConstructions, 1, "report measurements should keep reusing one TextEncoder");

const ticks = [10, 35];
const performance = Capacity.runFollowUpPerformanceRehearsal(Review, {
  recordCount: 20,
  tasksPerRecord: 5,
  targetDurationMs: 50,
  maximumReviewItems: 50,
  now: () => ticks.shift()
});
assert.equal(performance.status, "within-target");
assert.equal(performance.durationMs, 25);
assert.equal(performance.counts.syntheticRecords, 20);
assert.equal(performance.counts.syntheticTasks, 100);
assert.equal(performance.counts.classifiedTasks, 100);
assert.equal(performance.counts.returnedReviewItems, 50);
assert.equal(performance.counts.reviewTruncated, true);
assert.equal(performance.boundaries.syntheticDataPersisted, false);
assert.equal(JSON.stringify(performance).includes("synthetic-record"), false);

const metadata = Capacity.buildMetadataReport(report, performance, { appShellVersion: "1.6.12", recordSchemaVersion: "1.6.0" });
assert.equal(metadata.appShellVersion, "1.6.12");
assert.equal(metadata.recordSchemaVersion, "1.6.0");
assert.equal(metadata.boundaries.meetingContentIncluded, false);
assert.equal(metadata.boundaries.storageKeyNamesIncluded, false);

assert.throws(() => Capacity.runFollowUpPerformanceRehearsal({}, {}), /compatible meeting review core/);
console.log("v1.6.12 workspace capacity core tests passed");
