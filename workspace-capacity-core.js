/* Methodz Meeting Manager v1.6.12 portable workspace capacity and performance rehearsal core. */
(function exposeMethodzWorkspaceCapacityCore(root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MethodzWorkspaceCapacityCoreV1612 = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createMethodzWorkspaceCapacityCoreV1612() {
  "use strict";

  const VERSION = "1.0.0";
  const CATEGORY_DEFINITIONS = Object.freeze([
    { id: "active-records", label: "Active meeting records", pattern: /meetingrecords|activerecords|savedrecords/i },
    { id: "archive", label: "Archive Vault", pattern: /archive/i },
    { id: "revisions", label: "Revision history", pattern: /revision|history/i },
    { id: "recovery", label: "Recovery and backup", pattern: /recovery|backup|workspacepackage/i },
    { id: "sync-transfer", label: "Synchronization and transfer", pattern: /sync|queue|transfer|acceptance|rollback/i },
    { id: "governance-security", label: "Governance and verification", pattern: /governance|policy|retention|custody|publickey|keyregistry|receipt|signature|release/i },
    { id: "preferences-diagnostics", label: "Preferences and diagnostics", pattern: /preference|diagnostic|readiness|evidence|report|meetingday|panelregistry/i },
    { id: "other", label: "Other application data", pattern: null }
  ]);

  const text = (value) => String(value ?? "");

  function boundedInteger(value, fallback, minimum, maximum) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.min(maximum, Math.max(minimum, Math.trunc(numeric)));
  }

  function finiteNonNegative(value) {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric >= 0 ? numeric : null;
  }

  function utf8ByteLength(value) {
    const content = text(value);
    if (typeof TextEncoder === "function") return new TextEncoder().encode(content).length;
    if (typeof Buffer === "function") return Buffer.byteLength(content, "utf8");
    return unescape(encodeURIComponent(content)).length;
  }

  function categoryForKey(key) {
    const normalized = text(key);
    return CATEGORY_DEFINITIONS.find((definition) => definition.pattern?.test(normalized)) || CATEGORY_DEFINITIONS[CATEGORY_DEFINITIONS.length - 1];
  }

  function buildRecommendations(status, utilizationPercent, truncated, browserUsageHigher) {
    const recommendations = [];
    if (status === "critical") recommendations.push({ code: "capacity-critical", message: "Protect a current workspace backup and review storage pressure before adding large records or attachments." });
    else if (status === "review") recommendations.push({ code: "capacity-review", message: "Review workspace growth and retain a verified backup before any operator-led cleanup." });
    else recommendations.push({ code: "capacity-healthy", message: "Capacity is within the configured rehearsal thresholds; continue normal explicit backup practice." });
    if (truncated) recommendations.push({ code: "entry-limit", message: "The scan reached its configured entry limit, so repeat with a higher approved limit before relying on category totals." });
    if (browserUsageHigher) recommendations.push({ code: "browser-storage", message: "Browser-reported origin usage exceeds measured localStorage use and may include static caches or other origin storage." });
    if (utilizationPercent === null) recommendations.push({ code: "quota-unavailable", message: "Browser quota was unavailable, so status also uses the configured soft budget." });
    recommendations.push({ code: "no-automatic-cleanup", message: "This report never deletes, compacts, archives, synchronizes, or changes meeting records." });
    return recommendations;
  }

  function buildCapacityReport(snapshot, options = {}) {
    const source = snapshot && typeof snapshot === "object" && !Array.isArray(snapshot) ? snapshot : {};
    const maximumEntries = boundedInteger(options.maximumEntries, 5000, 1, 50000);
    const warningPercent = boundedInteger(options.warningPercent, 70, 1, 99);
    const criticalPercent = boundedInteger(options.criticalPercent, 90, warningPercent + 1, 100);
    const softBudgetBytes = finiteNonNegative(options.softBudgetBytes) ?? 4 * 1024 * 1024;
    const keys = Object.keys(source).sort();
    const selectedKeys = keys.slice(0, maximumEntries);
    const categories = new Map(CATEGORY_DEFINITIONS.map(({ id, label }) => [id, { id, label, entries: 0, bytes: 0 }]));
    let measuredBytes = 0;

    selectedKeys.forEach((key) => {
      const value = source[key];
      const bytes = utf8ByteLength(key) + utf8ByteLength(value);
      measuredBytes += bytes;
      const category = categories.get(categoryForKey(key).id);
      category.entries += 1;
      category.bytes += bytes;
    });

    const quotaBytes = finiteNonNegative(options.quotaBytes);
    const browserUsageBytes = finiteNonNegative(options.browserUsageBytes);
    const effectiveUsageBytes = Math.max(measuredBytes, browserUsageBytes ?? 0);
    const utilizationPercent = quotaBytes && quotaBytes > 0 ? Math.min(100, Math.round((effectiveUsageBytes / quotaBytes) * 10000) / 100) : null;
    const status = utilizationPercent !== null && utilizationPercent >= criticalPercent
      ? "critical"
      : utilizationPercent !== null && utilizationPercent >= warningPercent
        ? "review"
        : effectiveUsageBytes >= softBudgetBytes
          ? "review"
          : "healthy";
    const browserUsageHigher = browserUsageBytes !== null && browserUsageBytes > measuredBytes;
    const truncated = keys.length > selectedKeys.length;

    return {
      reportType: "methodz-workspace-capacity",
      reportVersion: VERSION,
      generatedAt: new Date().toISOString(),
      status,
      counts: { scannedEntries: selectedKeys.length, totalEntries: keys.length, truncated },
      bytes: {
        measuredLocalStorage: measuredBytes,
        browserReportedOriginUsage: browserUsageBytes,
        quota: quotaBytes,
        effectiveUsage: effectiveUsageBytes,
        configuredSoftBudget: softBudgetBytes
      },
      utilizationPercent,
      thresholds: { warningPercent, criticalPercent },
      categories: Array.from(categories.values()).filter((category) => category.entries > 0),
      recommendations: buildRecommendations(status, utilizationPercent, truncated, browserUsageHigher),
      boundaries: {
        metadataOnly: true,
        rawKeysIncluded: false,
        rawValuesIncluded: false,
        automaticCleanup: false,
        recordMutation: false,
        synchronization: false
      }
    };
  }

  function createSyntheticRecords(recordCount, tasksPerRecord) {
    const records = [];
    for (let recordIndex = 0; recordIndex < recordCount; recordIndex += 1) {
      const tasks = [];
      for (let taskIndex = 0; taskIndex < tasksPerRecord; taskIndex += 1) {
        const mode = (recordIndex + taskIndex) % 5;
        tasks.push({
          task: `Synthetic task ${taskIndex + 1}`,
          assignedTo: mode === 2 ? "" : "Synthetic assignee",
          priority: mode === 0 ? "High" : "Normal",
          due: mode === 3 ? "invalid-date" : mode === 4 ? "2030-01-01" : "2026-01-01",
          status: mode === 1 ? "Completed" : mode === 4 ? "In Progress" : "Pending"
        });
      }
      records.push({
        id: `synthetic-record-${recordIndex + 1}`,
        meetingNumber: String(recordIndex + 1).padStart(3, "0"),
        title: "Synthetic performance rehearsal",
        date: "2026-01-01",
        status: "Completed",
        updatedAt: "2026-01-01T00:00:00.000Z",
        tasks
      });
    }
    return records;
  }

  function runFollowUpPerformanceRehearsal(reviewCore, options = {}) {
    if (!reviewCore || typeof reviewCore.buildFollowUpReview !== "function") {
      throw new TypeError("A compatible meeting review core is required.");
    }
    const recordCount = boundedInteger(options.recordCount, 1000, 1, 5000);
    const tasksPerRecord = boundedInteger(options.tasksPerRecord, 4, 1, 20);
    const targetDurationMs = boundedInteger(options.targetDurationMs, 750, 1, 60000);
    const maximumReviewItems = boundedInteger(options.maximumReviewItems, 5000, 1, 5000);
    const now = typeof options.now === "function"
      ? options.now
      : typeof performance === "object" && typeof performance.now === "function"
        ? () => performance.now()
        : () => Date.now();
    const records = createSyntheticRecords(recordCount, tasksPerRecord);
    const startedAt = Number(now());
    const review = reviewCore.buildFollowUpReview(records, {
      today: "2026-07-29",
      dueSoonDays: 7,
      maxItems: maximumReviewItems
    });
    const completedAt = Number(now());
    const durationMs = Number.isFinite(completedAt - startedAt) ? Math.max(0, Math.round((completedAt - startedAt) * 100) / 100) : 0;
    const generatedTasks = recordCount * tasksPerRecord;
    const throughputTasksPerSecond = durationMs > 0 ? Math.round((generatedTasks / durationMs) * 1000) : null;

    return {
      reportType: "methodz-follow-up-performance-rehearsal",
      reportVersion: VERSION,
      generatedAt: new Date().toISOString(),
      status: durationMs <= targetDurationMs ? "within-target" : "review",
      durationMs,
      targetDurationMs,
      throughputTasksPerSecond,
      counts: {
        syntheticRecords: recordCount,
        syntheticTasks: generatedTasks,
        classifiedTasks: review.totalItems,
        returnedReviewItems: review.items.length,
        reviewTruncated: review.truncated
      },
      boundaries: {
        metadataOnly: true,
        syntheticDataPersisted: false,
        browserStorageWritten: false,
        meetingRecordsMutated: false,
        automaticSynchronization: false
      }
    };
  }

  function buildMetadataReport(capacityReport, performanceReport, options = {}) {
    return {
      reportType: "methodz-workspace-capacity-rehearsal",
      reportVersion: VERSION,
      generatedAt: new Date().toISOString(),
      appShellVersion: text(options.appShellVersion),
      recordSchemaVersion: text(options.recordSchemaVersion),
      capacity: capacityReport || null,
      performance: performanceReport || null,
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

  return Object.freeze({
    version: VERSION,
    utf8ByteLength,
    categoryForKey,
    buildCapacityReport,
    runFollowUpPerformanceRehearsal,
    buildMetadataReport
  });
});
