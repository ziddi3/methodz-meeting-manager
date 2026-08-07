/* Methodz Meeting Manager portable, metadata-only Performance Evidence Compare core. */
(function exposeMethodzPerformanceEvidenceCore(root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MethodzPerformanceEvidenceCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createMethodzPerformanceEvidenceCore() {
  "use strict";

  const VERSION = "1.0.0";
  const SOURCE_REPORT_TYPE = "methodz-workspace-capacity-rehearsal";
  const SOURCE_REPORT_VERSION = "1.0.0";
  const MAX_RUNS = 20;
  const CAPACITY_STATUSES = Object.freeze(["healthy", "review", "critical", "unavailable"]);

  const text = (value, maximum = 64) => String(value ?? "").trim().slice(0, maximum);

  function finiteNumber(value, minimum, maximum) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric < minimum || numeric > maximum) return null;
    return numeric;
  }

  function boundedInteger(value, minimum, maximum) {
    const numeric = Number(value);
    if (!Number.isSafeInteger(numeric) || numeric < minimum || numeric > maximum) return null;
    return numeric;
  }

  function versionText(value) {
    const normalized = text(value, 32);
    return /^[0-9A-Za-z._-]+$/.test(normalized) ? normalized : "";
  }

  function isoTimestamp(value) {
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date.toISOString() : "";
  }

  function strictBoundary(value, expected) {
    return value === expected;
  }

  function validateBoundaries(report) {
    const errors = [];
    const root = report?.boundaries || {};
    const capacity = report?.capacity?.boundaries || {};
    const performance = report?.performance?.boundaries || {};

    const rootContract = {
      metadataOnly: true,
      meetingContentIncluded: false,
      recordIdentifiersIncluded: false,
      storageKeyNamesIncluded: false,
      credentialsIncluded: false,
      privateKeysIncluded: false,
      signaturesIncluded: false,
      queuePayloadsIncluded: false
    };
    Object.entries(rootContract).forEach(([key, expected]) => {
      if (!strictBoundary(root[key], expected)) errors.push(`boundary:${key}`);
    });

    const capacityContract = {
      metadataOnly: true,
      rawKeysIncluded: false,
      rawValuesIncluded: false,
      automaticCleanup: false,
      recordMutation: false,
      synchronization: false
    };
    Object.entries(capacityContract).forEach(([key, expected]) => {
      if (!strictBoundary(capacity[key], expected)) errors.push(`capacity-boundary:${key}`);
    });

    const performanceContract = {
      metadataOnly: true,
      syntheticDataPersisted: false,
      browserStorageWritten: false,
      meetingRecordsMutated: false,
      automaticSynchronization: false
    };
    Object.entries(performanceContract).forEach(([key, expected]) => {
      if (!strictBoundary(performance[key], expected)) errors.push(`performance-boundary:${key}`);
    });
    return errors;
  }

  function validateAndNormalizeReport(report) {
    const source = report && typeof report === "object" && !Array.isArray(report) ? report : null;
    if (!source) return { ok: false, errors: ["report:not-object"], run: null };

    const errors = [];
    if (source.reportType !== SOURCE_REPORT_TYPE) errors.push("report:type");
    if (source.reportVersion !== SOURCE_REPORT_VERSION) errors.push("report:version");

    const generatedAt = isoTimestamp(source.generatedAt);
    if (!generatedAt) errors.push("report:generated-at");

    const appShellVersion = versionText(source.appShellVersion);
    const recordSchemaVersion = versionText(source.recordSchemaVersion);
    if (!appShellVersion) errors.push("report:app-shell-version");
    if (!recordSchemaVersion) errors.push("report:record-schema-version");

    const performance = source.performance && typeof source.performance === "object" ? source.performance : null;
    const capacity = source.capacity && typeof source.capacity === "object" ? source.capacity : null;
    if (!performance) errors.push("report:performance-missing");
    if (!capacity) errors.push("report:capacity-missing");

    const durationMs = performance ? finiteNumber(performance.durationMs, 0, 86400000) : null;
    const targetDurationMs = performance ? finiteNumber(performance.targetDurationMs, 1, 60000) : null;
    const throughputTasksPerSecond = performance?.throughputTasksPerSecond == null
      ? null
      : finiteNumber(performance.throughputTasksPerSecond, 0, 1000000000);
    if (durationMs === null) errors.push("performance:duration");
    if (targetDurationMs === null) errors.push("performance:target");
    if (performance?.throughputTasksPerSecond != null && throughputTasksPerSecond === null) errors.push("performance:throughput");

    const counts = performance?.counts || {};
    const syntheticRecords = boundedInteger(counts.syntheticRecords, 1, 5000);
    const syntheticTasks = boundedInteger(counts.syntheticTasks, 1, 100000);
    const classifiedTasks = boundedInteger(counts.classifiedTasks, 0, 100000);
    const returnedReviewItems = boundedInteger(counts.returnedReviewItems, 0, 5000);
    if (syntheticRecords === null) errors.push("performance:synthetic-records");
    if (syntheticTasks === null) errors.push("performance:synthetic-tasks");
    if (classifiedTasks === null) errors.push("performance:classified-tasks");
    if (returnedReviewItems === null) errors.push("performance:returned-items");

    const capacityStatus = CAPACITY_STATUSES.includes(capacity?.status) ? capacity.status : "";
    if (!capacityStatus) errors.push("capacity:status");
    const utilizationPercent = capacity?.utilizationPercent == null
      ? null
      : finiteNumber(capacity.utilizationPercent, 0, 100);
    if (capacity?.utilizationPercent != null && utilizationPercent === null) errors.push("capacity:utilization");

    errors.push(...validateBoundaries(source));
    if (errors.length) return { ok: false, errors: Object.freeze(errors.slice(0, 32)), run: null };

    return {
      ok: true,
      errors: Object.freeze([]),
      run: Object.freeze({
        generatedAt,
        appShellVersion,
        recordSchemaVersion,
        durationMs: Math.round(durationMs * 100) / 100,
        targetDurationMs: Math.round(targetDurationMs * 100) / 100,
        throughputTasksPerSecond: throughputTasksPerSecond === null ? null : Math.round(throughputTasksPerSecond),
        targetMet: durationMs <= targetDurationMs,
        counts: Object.freeze({
          syntheticRecords,
          syntheticTasks,
          classifiedTasks,
          returnedReviewItems,
          reviewTruncated: Boolean(counts.reviewTruncated)
        }),
        capacity: Object.freeze({
          status: capacityStatus,
          utilizationPercent: utilizationPercent === null ? null : Math.round(utilizationPercent * 100) / 100
        })
      })
    };
  }

  function median(values) {
    if (!values.length) return null;
    const sorted = values.slice().sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    const result = sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
    return Math.round(result * 100) / 100;
  }

  function percentChange(from, to) {
    if (!Number.isFinite(from) || !Number.isFinite(to) || from === 0) return null;
    return Math.round((((to - from) / from) * 100) * 100) / 100;
  }

  function classifyTrend(runCount, regressionPercent) {
    if (runCount < 2) return "baseline-only";
    if (regressionPercent === null) return "indeterminate";
    if (regressionPercent > 10) return "regression";
    if (regressionPercent < -5) return "improved";
    return "stable";
  }

  function compareRuns(runs) {
    const source = Array.isArray(runs) ? runs.slice(0, MAX_RUNS) : [];
    const normalized = source.map((run) => ({ ...run })).filter((run) => isoTimestamp(run.generatedAt));
    normalized.sort((left, right) => left.generatedAt.localeCompare(right.generatedAt));
    if (!normalized.length) {
      return Object.freeze({
        reportType: "methodz-performance-evidence-comparison",
        reportVersion: VERSION,
        runCount: 0,
        trend: "no-evidence",
        baseline: null,
        latest: null,
        metrics: null,
        runs: Object.freeze([]),
        boundaries: comparisonBoundaries()
      });
    }

    const durations = normalized.map((run) => run.durationMs);
    const baseline = normalized[0];
    const latest = normalized[normalized.length - 1];
    const regressionPercent = percentChange(baseline.durationMs, latest.durationMs);
    const targetPasses = normalized.filter((run) => run.targetMet).length;
    const fastest = Math.min(...durations);
    const slowest = Math.max(...durations);

    return Object.freeze({
      reportType: "methodz-performance-evidence-comparison",
      reportVersion: VERSION,
      runCount: normalized.length,
      trend: classifyTrend(normalized.length, regressionPercent),
      baseline: Object.freeze({ generatedAt: baseline.generatedAt, durationMs: baseline.durationMs }),
      latest: Object.freeze({ generatedAt: latest.generatedAt, durationMs: latest.durationMs }),
      metrics: Object.freeze({
        fastestDurationMs: Math.round(fastest * 100) / 100,
        medianDurationMs: median(durations),
        slowestDurationMs: Math.round(slowest * 100) / 100,
        baselineToLatestPercent: regressionPercent,
        targetPasses,
        targetFailures: normalized.length - targetPasses
      }),
      runs: Object.freeze(normalized.map((run, index) => Object.freeze({
        ordinal: index + 1,
        generatedAt: run.generatedAt,
        appShellVersion: text(run.appShellVersion, 32),
        recordSchemaVersion: text(run.recordSchemaVersion, 32),
        durationMs: run.durationMs,
        targetDurationMs: run.targetDurationMs,
        throughputTasksPerSecond: run.throughputTasksPerSecond,
        targetMet: Boolean(run.targetMet),
        counts: Object.freeze({ ...run.counts }),
        capacity: Object.freeze({ ...run.capacity })
      }))),
      boundaries: comparisonBoundaries()
    });
  }

  function comparisonBoundaries() {
    return Object.freeze({
      metadataOnly: true,
      importedReportsPersisted: false,
      meetingContentIncluded: false,
      recordIdentifiersIncluded: false,
      storageKeyNamesIncluded: false,
      storageValuesIncluded: false,
      credentialsIncluded: false,
      privateKeysIncluded: false,
      signaturesIncluded: false,
      queuePayloadsIncluded: false,
      transferContentsIncluded: false,
      browserStorageRead: false,
      browserStorageWritten: false,
      providerCalls: false,
      synchronization: false
    });
  }

  function buildComparisonReport(comparison, options = {}) {
    const safe = comparison && comparison.reportType === "methodz-performance-evidence-comparison"
      ? comparison
      : compareRuns([]);
    return Object.freeze({
      reportType: "methodz-performance-evidence-summary",
      reportVersion: VERSION,
      generatedAt: isoTimestamp(options.now || Date.now()) || new Date().toISOString(),
      runCount: safe.runCount,
      trend: safe.trend,
      baseline: safe.baseline,
      latest: safe.latest,
      metrics: safe.metrics,
      runs: safe.runs,
      boundaries: comparisonBoundaries()
    });
  }

  return Object.freeze({
    version: VERSION,
    sourceReportType: SOURCE_REPORT_TYPE,
    sourceReportVersion: SOURCE_REPORT_VERSION,
    maxRuns: MAX_RUNS,
    validateAndNormalizeReport,
    compareRuns,
    buildComparisonReport
  });
});
