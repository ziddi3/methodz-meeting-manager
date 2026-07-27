/* Methodz Meeting Manager v1.6.9 transfer acceptance, rollback, and diagnostics core. */
(function exposeMethodzTransferAcceptance(root, factory) {
  "use strict";
  const WorkspaceCore = root?.MethodzWorkspacePackageCore || (typeof require === "function" ? require("./workspace-package-core.js") : null);
  const api = factory(WorkspaceCore);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MethodzTransferAcceptanceV169 = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createTransferAcceptanceCore(WorkspaceCore) {
  "use strict";

  if (!WorkspaceCore) throw new Error("workspace-package-core.js must load before transfer-acceptance-core.js.");

  const VERSION = "1.0.0";
  const ACCEPTANCE_REPORT_TYPE = "methodz-transfer-acceptance-report";
  const ROLLBACK_REPORT_TYPE = "methodz-transfer-rollback-report";
  const DIAGNOSTICS_REPORT_TYPE = "methodz-workspace-diagnostics-report";
  const METADATA_BOUNDARIES = Object.freeze({
    containsMeetingContent: false,
    containsRecordIds: false,
    containsAttendeeNames: false,
    containsSignatures: false,
    containsCredentials: false,
    containsPrivateKeyMaterial: false,
    containsStorageKeys: false,
    provesDeviceIdentity: false,
    provesDelivery: false,
    provesAuthorization: false,
    provesLegalApproval: false
  });

  function isPlainObject(value) {
    return Boolean(value && typeof value === "object" && !Array.isArray(value));
  }

  function nowIso(clock) {
    return new Date(typeof clock === "function" ? clock() : Date.now()).toISOString();
  }

  function finiteNumber(value, fallback = 0) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
  }

  function parseStored(raw) {
    if (typeof raw !== "string") return { present: false, valid: false, value: null, count: 0 };
    try {
      const value = JSON.parse(raw);
      const count = Array.isArray(value) ? value.length : isPlainObject(value) ? Object.keys(value).length : value == null ? 0 : 1;
      return { present: true, valid: true, value, count };
    } catch (error) {
      return { present: true, valid: false, value: null, count: 0 };
    }
  }

  function byteLength(value) {
    return WorkspaceCore.byteLength(String(value ?? ""));
  }

  function buildWorkspacePackage(entries, options = {}) {
    const recognizedEntries = Object.fromEntries(Object.entries(isPlainObject(entries) ? entries : {})
      .filter(([key, value]) => WorkspaceCore.isRecognizedKey(key) && key !== String(options.preRestoreKey || "methodzPreRestoreBackup") && typeof value === "string"));
    const body = {
      packageType: WorkspaceCore.PACKAGE_TYPE,
      packageVersion: 1,
      schemaVersion: String(options.schemaVersion || "1.6.0"),
      exportedAt: options.generatedAt || nowIso(options.clock),
      entries: recognizedEntries,
      summary: WorkspaceCore.summarizeEntries(recognizedEntries, options.storageKeys || {})
    };
    return { ...body, checksum: WorkspaceCore.hashText(WorkspaceCore.stableStringify(body)) };
  }

  function categoryDefinitions(storageKeys = {}) {
    return [
      { id: "activeRecords", label: "Active records", exact: [storageKeys.records || "methodzMeetingRecords"], required: true },
      { id: "archivedRecords", label: "Archive Vault records", exact: [storageKeys.archivedRecords || "methodzArchivedMeetingRecords"], required: true },
      { id: "revisionGroups", label: "Revision history", exact: [storageKeys.revisions || "methodzMeetingRevisions"], required: true },
      { id: "directories", label: "Attendee and organization directories", exact: [storageKeys.directory, storageKeys.organizationDirectory].filter(Boolean), pattern: /(meetingdirectory|organizationdirectory)/i },
      { id: "templates", label: "Meeting templates", exact: [storageKeys.templates].filter(Boolean), pattern: /meetingtemplates/i },
      { id: "governance", label: "Governance and release metadata", pattern: /(governance|retention|preservation|hold|disposition|redaction|approval|recipient|release|policy)/i },
      { id: "publicVerificationKeys", label: "Public verification keys", exact: [storageKeys.signingPublicKeys].filter(Boolean), pattern: /(public.*key|signingpublickeys)/i },
      { id: "custodyRecords", label: "Key custody records", pattern: /(custody|keyrotation|keyrevocation|lostkey)/i },
      { id: "recoveryLogs", label: "Recovery and drill logs", pattern: /(recovery|restoredrill|recoverydrill)/i },
      { id: "tenantQueue", label: "Tenant synchronization queue state", exact: [storageKeys.syncRehearsalQueue].filter(Boolean), pattern: /(syncrehearsalqueue|syncqueue)/i }
    ];
  }

  function inspectCategories(entries, storageKeys = {}) {
    const source = isPlainObject(entries) ? entries : {};
    return categoryDefinitions(storageKeys).map((definition) => {
      const exact = new Set(definition.exact || []);
      const values = Object.entries(source).filter(([key]) => exact.has(key) || (!exact.size || !exact.has(key)) && definition.pattern?.test(key));
      let itemCount = 0;
      let parseErrors = 0;
      let bytes = 0;
      values.forEach(([, raw]) => {
        const parsed = parseStored(raw);
        bytes += byteLength(raw);
        itemCount += parsed.count;
        if (!parsed.valid) parseErrors += 1;
      });
      return {
        id: definition.id,
        label: definition.label,
        required: definition.required === true,
        storageEntryCount: values.length,
        itemCount,
        parseErrors,
        bytes
      };
    });
  }

  function expectedCountFor(categoryId, transferReport) {
    const counts = isPlainObject(transferReport?.counts) ? transferReport.counts : {};
    if (categoryId === "activeRecords") return finiteNumber(counts.activeRecords, null);
    if (categoryId === "archivedRecords") return finiteNumber(counts.archivedRecords, null);
    if (categoryId === "revisionGroups") return finiteNumber(counts.revisionGroups, null);
    if (categoryId === "tenantQueue") return finiteNumber(counts.queueEntries, null);
    return null;
  }

  function statusForCategory(category, expected) {
    if (category.parseErrors > 0) return { status: "fail", message: "One or more storage entries could not be parsed." };
    if (expected !== null && category.itemCount !== expected) return { status: "fail", message: `Expected ${expected}; found ${category.itemCount}.` };
    if (category.required && category.storageEntryCount === 0) return { status: "fail", message: "Required storage category is missing." };
    if (category.storageEntryCount === 0) return { status: "review", message: "No local entries are present for this optional category." };
    return { status: "pass", message: expected === null ? `${category.itemCount} item(s) available.` : `Count matches the verified transfer report (${expected}).` };
  }

  function inspectPreRestorePackage(payload, options = {}) {
    if (!isPlainObject(payload)) return { valid: false, checksumVerified: false, errors: ["The pre-import recovery package is unavailable."] };
    return WorkspaceCore.inspectWorkspacePackage(payload, {
      storageKeys: options.storageKeys || {},
      limits: options.limits || {},
      preRestoreKey: options.preRestoreKey
    });
  }

  function buildAcceptanceReport(options = {}) {
    const generatedAt = options.generatedAt || nowIso(options.clock);
    const currentPackage = buildWorkspacePackage(options.entries, {
      storageKeys: options.storageKeys,
      schemaVersion: options.recordSchemaVersion,
      preRestoreKey: options.preRestoreKey,
      generatedAt
    });
    const workspaceReport = WorkspaceCore.inspectWorkspacePackage(currentPackage, {
      storageKeys: options.storageKeys || {},
      limits: options.limits || {},
      preRestoreKey: options.preRestoreKey
    });
    const transferReport = isPlainObject(options.transferReport) ? options.transferReport : null;
    const transferVerified = transferReport?.reportType === "methodz-cross-device-transfer-report"
      && transferReport?.stage === "destination-import-verified"
      && transferReport?.result?.postImportVerified === true;
    const recoveryReport = inspectPreRestorePackage(options.preRestorePackage, options);
    const categories = inspectCategories(workspaceReport.recognizedEntries, options.storageKeys).map((category) => {
      const expected = expectedCountFor(category.id, transferReport);
      return { ...category, expectedCount: expected, ...statusForCategory(category, expected) };
    });
    const failures = categories.filter((item) => item.status === "fail").length;
    const reviews = categories.filter((item) => item.status === "review").length;
    const checks = {
      currentWorkspaceValid: workspaceReport.valid && workspaceReport.checksumVerified,
      transferImportReportVerified: transferVerified,
      preImportRecoveryVerified: recoveryReport.valid === true && recoveryReport.checksumVerified === true,
      requiredCategoryCountsMatch: failures === 0
    };
    const ready = Object.values(checks).every(Boolean);
    const body = {
      reportType: ACCEPTANCE_REPORT_TYPE,
      reportVersion: VERSION,
      generatedAt,
      appShellVersion: String(options.appShellVersion || "1.6.9"),
      recordSchemaVersion: String(options.recordSchemaVersion || "1.6.0"),
      ready,
      accepted: options.accepted === true && ready,
      checks,
      summary: {
        storageEntries: workspaceReport.summary.entryCount || 0,
        activeRecords: workspaceReport.summary.activeRecords || 0,
        archivedRecords: workspaceReport.summary.archivedRecords || 0,
        revisionGroups: workspaceReport.summary.revisionGroups || 0,
        workspaceBytes: workspaceReport.totalBytes || 0,
        failedChecks: failures,
        reviewChecks: reviews,
        durationMs: Math.max(0, finiteNumber(options.durationMs))
      },
      categories: categories.map(({ id, label, required, storageEntryCount, itemCount, parseErrors, bytes, expectedCount, status, message }) => ({
        id, label, required, storageEntryCount, itemCount, parseErrors, bytes, expectedCount, status, message
      })),
      boundaries: { ...METADATA_BOUNDARIES }
    };
    return { ...body, checksum: WorkspaceCore.hashText(WorkspaceCore.stableStringify(body)) };
  }

  function buildRollbackPreview(preRestorePackage, currentEntries, options = {}) {
    const plan = WorkspaceCore.buildRestorePlan(preRestorePackage, currentEntries, {
      mode: "replace",
      storageKeys: options.storageKeys || {},
      limits: options.limits || {},
      preRestoreKey: options.preRestoreKey
    });
    return {
      valid: plan.report.valid === true && plan.report.checksumVerified === true,
      checksumVerified: plan.report.checksumVerified === true,
      errors: [...plan.report.errors],
      warnings: [...plan.report.warnings],
      counts: { ...plan.counts },
      recoverySummary: { ...plan.report.summary },
      currentSummary: WorkspaceCore.summarizeEntries(isPlainObject(currentEntries) ? currentEntries : {}, options.storageKeys || {})
    };
  }

  function buildRollbackReport(options = {}) {
    const preview = isPlainObject(options.preview) ? options.preview : {};
    const generatedAt = options.generatedAt || nowIso(options.clock);
    const body = {
      reportType: ROLLBACK_REPORT_TYPE,
      reportVersion: VERSION,
      generatedAt,
      appShellVersion: String(options.appShellVersion || "1.6.9"),
      recordSchemaVersion: String(options.recordSchemaVersion || "1.6.0"),
      previewVerified: preview.valid === true && preview.checksumVerified === true,
      rollbackApplied: options.rollbackApplied === true,
      rollbackVerified: options.rollbackVerified === true,
      originalSnapshotRecoveredAfterFailure: options.originalSnapshotRecoveredAfterFailure === true,
      errorCode: options.errorCode ? String(options.errorCode).slice(0, 80) : null,
      planCounts: {
        add: finiteNumber(preview.counts?.add),
        replace: finiteNumber(preview.counts?.replace),
        unchanged: finiteNumber(preview.counts?.unchanged),
        remove: finiteNumber(preview.counts?.remove),
        ignored: finiteNumber(preview.counts?.ignored)
      },
      restoredSummary: {
        storageEntries: finiteNumber(options.restoredSummary?.entryCount),
        activeRecords: finiteNumber(options.restoredSummary?.activeRecords),
        archivedRecords: finiteNumber(options.restoredSummary?.archivedRecords),
        revisionGroups: finiteNumber(options.restoredSummary?.revisionGroups),
        workspaceBytes: finiteNumber(options.restoredSummary?.byteEstimate)
      },
      durationMs: Math.max(0, finiteNumber(options.durationMs)),
      boundaries: { ...METADATA_BOUNDARIES }
    };
    return { ...body, checksum: WorkspaceCore.hashText(WorkspaceCore.stableStringify(body)) };
  }

  function buildDiagnosticsReport(options = {}) {
    const started = finiteNumber(options.startedAtMs, 0);
    const finished = finiteNumber(options.finishedAtMs, started);
    const source = isPlainObject(options.entries) ? options.entries : {};
    const recognized = Object.entries(source).filter(([key, raw]) => WorkspaceCore.isRecognizedKey(key) && typeof raw === "string");
    let totalBytes = 0;
    let largestEntryBytes = 0;
    let parseErrors = 0;
    const buckets = { under10KB: 0, from10KBTo100KB: 0, from100KBTo1MB: 0, over1MB: 0 };
    recognized.forEach(([, raw]) => {
      const bytes = byteLength(raw);
      totalBytes += bytes;
      largestEntryBytes = Math.max(largestEntryBytes, bytes);
      if (!parseStored(raw).valid) parseErrors += 1;
      if (bytes < 10 * 1024) buckets.under10KB += 1;
      else if (bytes < 100 * 1024) buckets.from10KBTo100KB += 1;
      else if (bytes < 1024 * 1024) buckets.from100KBTo1MB += 1;
      else buckets.over1MB += 1;
    });
    const summary = WorkspaceCore.summarizeEntries(Object.fromEntries(recognized), options.storageKeys || {});
    const quota = Math.max(0, finiteNumber(options.quotaBytes));
    const usage = Math.max(0, finiteNumber(options.usageBytes, totalBytes));
    const quotaRatio = quota > 0 ? usage / quota : null;
    const warningBytes = Math.max(1, finiteNumber(options.warningBytes, 8 * 1024 * 1024));
    const criticalBytes = Math.max(warningBytes, finiteNumber(options.criticalBytes, 12 * 1024 * 1024));
    const quotaWarningRatio = Math.min(1, Math.max(0, finiteNumber(options.quotaWarningRatio, 0.8)));
    const level = totalBytes >= criticalBytes || (quotaRatio !== null && quotaRatio >= 0.95)
      ? "critical"
      : totalBytes >= warningBytes || (quotaRatio !== null && quotaRatio >= quotaWarningRatio)
        ? "warning"
        : "ready";
    const body = {
      reportType: DIAGNOSTICS_REPORT_TYPE,
      reportVersion: VERSION,
      generatedAt: options.generatedAt || nowIso(options.clock),
      appShellVersion: String(options.appShellVersion || "1.6.9"),
      recordSchemaVersion: String(options.recordSchemaVersion || "1.6.0"),
      level,
      durationMs: Math.max(0, finished - started),
      storage: {
        entryCount: recognized.length,
        totalBytes,
        largestEntryBytes,
        parseErrors,
        activeRecords: summary.activeRecords || 0,
        archivedRecords: summary.archivedRecords || 0,
        revisionGroups: summary.revisionGroups || 0,
        buckets
      },
      quota: {
        available: quota > 0,
        usageBytes: usage,
        quotaBytes: quota,
        usageRatio: quotaRatio
      },
      boundaries: { ...METADATA_BOUNDARIES }
    };
    return { ...body, checksum: WorkspaceCore.hashText(WorkspaceCore.stableStringify(body)) };
  }

  function reportIsMetadataOnly(report) {
    if (!isPlainObject(report) || !isPlainObject(report.boundaries)) return false;
    return Object.entries(METADATA_BOUNDARIES).every(([key, value]) => report.boundaries[key] === value);
  }

  return Object.freeze({
    version: VERSION,
    acceptanceReportType: ACCEPTANCE_REPORT_TYPE,
    rollbackReportType: ROLLBACK_REPORT_TYPE,
    diagnosticsReportType: DIAGNOSTICS_REPORT_TYPE,
    metadataBoundaries: METADATA_BOUNDARIES,
    buildWorkspacePackage,
    inspectCategories,
    inspectPreRestorePackage,
    buildAcceptanceReport,
    buildRollbackPreview,
    buildRollbackReport,
    buildDiagnosticsReport,
    reportIsMetadataOnly
  });
});
