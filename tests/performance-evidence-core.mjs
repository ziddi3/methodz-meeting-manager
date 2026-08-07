import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const core = require("../performance-evidence-core.js");

assert.equal(core.version, "1.0.0");
assert.equal(core.sourceReportType, "methodz-workspace-capacity-rehearsal");
assert.equal(core.sourceReportVersion, "1.0.0");
assert.equal(core.maxRuns, 20);

function sourceReport(generatedAt, durationMs, targetDurationMs = 750, throughput = 5000) {
  return {
    reportType: "methodz-workspace-capacity-rehearsal",
    reportVersion: "1.0.0",
    generatedAt,
    appShellVersion: "1.6.12",
    recordSchemaVersion: "1.6.0",
    capacity: {
      status: "healthy",
      utilizationPercent: 12.5,
      boundaries: {
        metadataOnly: true,
        rawKeysIncluded: false,
        rawValuesIncluded: false,
        automaticCleanup: false,
        recordMutation: false,
        synchronization: false
      }
    },
    performance: {
      durationMs,
      targetDurationMs,
      throughputTasksPerSecond: throughput,
      counts: {
        syntheticRecords: 1000,
        syntheticTasks: 4000,
        classifiedTasks: 4000,
        returnedReviewItems: 4000,
        reviewTruncated: false
      },
      boundaries: {
        metadataOnly: true,
        syntheticDataPersisted: false,
        browserStorageWritten: false,
        meetingRecordsMutated: false,
        automaticSynchronization: false
      }
    },
    boundaries: {
      metadataOnly: true,
      meetingContentIncluded: false,
      recordIdentifiersIncluded: false,
      storageKeyNamesIncluded: false,
      credentialsIncluded: false,
      privateKeysIncluded: false,
      signaturesIncluded: false,
      queuePayloadsIncluded: false
    }
  };
}

const first = core.validateAndNormalizeReport(sourceReport("2026-08-01T12:00:00.000Z", 500, 750, 8000));
assert.equal(first.ok, true);
assert.equal(first.run.durationMs, 500);
assert.equal(first.run.targetMet, true);
assert.equal(first.run.capacity.status, "healthy");

const second = core.validateAndNormalizeReport(sourceReport("2026-08-02T12:00:00.000Z", 575, 750, 7000));
assert.equal(second.ok, true);

const comparison = core.compareRuns([second.run, first.run]);
assert.equal(comparison.runCount, 2);
assert.equal(comparison.baseline.durationMs, 500);
assert.equal(comparison.latest.durationMs, 575);
assert.equal(comparison.metrics.baselineToLatestPercent, 15);
assert.equal(comparison.metrics.medianDurationMs, 537.5);
assert.equal(comparison.metrics.targetPasses, 2);
assert.equal(comparison.trend, "regression");

const improved = core.validateAndNormalizeReport(sourceReport("2026-08-03T12:00:00.000Z", 450));
const improvedComparison = core.compareRuns([first.run, improved.run]);
assert.equal(improvedComparison.metrics.baselineToLatestPercent, -10);
assert.equal(improvedComparison.trend, "improved");

const stable = core.validateAndNormalizeReport(sourceReport("2026-08-04T12:00:00.000Z", 525));
assert.equal(core.compareRuns([first.run, stable.run]).trend, "stable");

const unsafe = sourceReport("2026-08-05T12:00:00.000Z", 500);
unsafe.boundaries.meetingContentIncluded = true;
const rejectedUnsafe = core.validateAndNormalizeReport(unsafe);
assert.equal(rejectedUnsafe.ok, false);
assert.ok(rejectedUnsafe.errors.includes("boundary:meetingContentIncluded"));

const wrongType = sourceReport("2026-08-05T12:00:00.000Z", 500);
wrongType.reportType = "meeting-record-export";
assert.equal(core.validateAndNormalizeReport(wrongType).ok, false);

const unknownSecrets = sourceReport("2026-08-05T12:00:00.000Z", 500);
unknownSecrets.meetingTitle = "FORBIDDEN_MEETING_TITLE";
unknownSecrets.recordId = "FORBIDDEN_RECORD_ID";
unknownSecrets.credentials = "FORBIDDEN_CREDENTIAL";
const normalizedUnknown = core.validateAndNormalizeReport(unknownSecrets);
assert.equal(normalizedUnknown.ok, true);
const serializedRun = JSON.stringify(normalizedUnknown.run);
for (const forbidden of ["FORBIDDEN_MEETING_TITLE", "FORBIDDEN_RECORD_ID", "FORBIDDEN_CREDENTIAL"]) {
  assert.equal(serializedRun.includes(forbidden), false);
}

const summary = core.buildComparisonReport(comparison, { now: "2026-08-07T23:20:00.000Z" });
assert.equal(summary.generatedAt, "2026-08-07T23:20:00.000Z");
assert.equal(summary.boundaries.metadataOnly, true);
assert.equal(summary.boundaries.importedReportsPersisted, false);
assert.equal(summary.boundaries.browserStorageRead, false);
assert.equal(summary.boundaries.browserStorageWritten, false);
assert.equal(summary.boundaries.providerCalls, false);

const many = [];
for (let index = 0; index < 25; index += 1) {
  const result = core.validateAndNormalizeReport(sourceReport(`2026-08-${String(index + 1).padStart(2, "0")}T12:00:00.000Z`, 400 + index));
  if (result.ok) many.push(result.run);
}
assert.equal(core.compareRuns(many).runCount, 20);

console.log("Performance Evidence Compare portable core tests passed.");
