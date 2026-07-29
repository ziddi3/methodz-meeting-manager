import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Capacity = require("../workspace-capacity-core.js");
const Review = require("../meeting-review-core.js");

assert.equal(Capacity.version, "1.0.0");
assert.equal(Capacity.utf8ByteLength("☀"), 3);

const snapshot = {
  methodzMeetingRecords: JSON.stringify([{ id: "private-record-id", title: "Private meeting title" }]),
  methodzArchiveVaultV09: JSON.stringify([{ id: "archive-secret" }]),
  methodzSyncQueueV165: JSON.stringify([{ payload: "secret queue payload" }]),
  methodzPanelRegistryDiagnosticsV1610: JSON.stringify({ result: "pass" })
};
const report = Capacity.buildCapacityReport(snapshot, {
  browserUsageBytes: 3000,
  quotaBytes: 10000,
  softBudgetBytes: 100000,
  warningPercent: 70,
  criticalPercent: 90
});
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

const critical = Capacity.buildCapacityReport({ key: "x" }, { browserUsageBytes: 95, quotaBytes: 100, softBudgetBytes: 1000 });
assert.equal(critical.status, "critical");
assert.equal(critical.utilizationPercent, 95);

const limited = Capacity.buildCapacityReport({ a: "1", b: "2", c: "3" }, { maximumEntries: 2 });
assert.equal(limited.counts.truncated, true);
assert.equal(limited.counts.scannedEntries, 2);
assert.ok(limited.recommendations.some((item) => item.code === "entry-limit"));

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
