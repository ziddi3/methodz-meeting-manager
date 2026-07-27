/* Methodz Meeting Manager v1.6.8 cross-device transfer rehearsal core. */
(function exposeMethodzCrossDeviceTransfer(root, factory) {
  const Contract = root?.MethodzHostedProviderContract || (typeof require === "function" ? require("./provider-contract.js") : null);
  const WorkspaceCore = root?.MethodzWorkspacePackageCore || (typeof require === "function" ? require("./workspace-package-core.js") : null);
  const QueueCore = root?.MethodzSyncQueuePortabilityV166 || (typeof require === "function" ? require("./sync-queue-portability.js") : null);
  const api = factory(Contract, WorkspaceCore, QueueCore);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MethodzCrossDeviceTransferV168 = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createCrossDeviceTransfer(Contract, WorkspaceCore, QueueCore) {
  "use strict";

  if (!Contract || !WorkspaceCore || !QueueCore) {
    throw new Error("The provider contract, workspace package core, and queue portability core must load before cross-device-transfer-core.js.");
  }

  const VERSION = "1.0.0";
  const PACKAGE_TYPE = "methodz-cross-device-transfer-rehearsal";
  const REPORT_TYPE = "methodz-cross-device-transfer-report";
  const INTEGRITY_ALGORITHM = "fnv1a32-canonical-json";
  const CHECKPOINTS = Object.freeze([
    "sourceWorkspaceSaved",
    "sourceBackupStoredOffDevice",
    "privateKeysSeparated",
    "sourceKeptUnchanged",
    "destinationReadinessRun",
    "packageInspected",
    "recoveryDrillPassed",
    "importApproved",
    "postImportVerified"
  ]);

  const clone = typeof Contract.clone === "function"
    ? Contract.clone
    : (value) => JSON.parse(JSON.stringify(value));

  function isPlainObject(value) {
    return Boolean(value && typeof value === "object" && !Array.isArray(value));
  }

  function validIso(value) {
    return typeof value === "string" && !Number.isNaN(new Date(value).getTime());
  }

  function nowIso(clock) {
    return new Date(typeof clock === "function" ? clock() : Date.now()).toISOString();
  }

  function hash(value) {
    return Contract.fnv1a32(Contract.canonicalStringify(value));
  }

  function opaqueReference(prefix, value) {
    return value == null || value === "" ? null : `${prefix}:${Contract.fnv1a32(String(value))}`;
  }

  function normalizeCheckpoints(value = {}) {
    const source = isPlainObject(value) ? value : {};
    return Object.fromEntries(CHECKPOINTS.map((key) => [key, source[key] === true]));
  }

  function inspectReadinessReport(report) {
    const errors = [];
    if (!isPlainObject(report)) return { valid: false, errors: ["A metadata-only Device Readiness report is required."] };
    if (report.type !== "methodz-device-readiness-report") errors.push("The readiness component has an unsupported type.");
    if (!validIso(report.generatedAt)) errors.push("The readiness component requires a valid generatedAt timestamp.");
    const boundaries = isPlainObject(report.boundaries) ? report.boundaries : {};
    const forbiddenTrue = [
      "containsMeetingContent",
      "containsRecordIds",
      "containsAttendeeNames",
      "containsSignatures",
      "containsCredentials",
      "containsKeyMaterial"
    ].filter((key) => boundaries[key] !== false);
    if (forbiddenTrue.length) errors.push(`The readiness component does not prove metadata-only boundaries for: ${forbiddenTrue.join(", ")}.`);
    return { valid: errors.length === 0, errors };
  }

  function rejectUnsafeComponent(value, operation) {
    Contract.rejectDisallowedMaterial(value, {
      operation,
      providerId: "methodz-cross-device-transfer"
    });
  }

  function requireWorkspaceReport(workspacePackage, options = {}) {
    rejectUnsafeComponent(workspacePackage, "buildCrossDeviceTransferWorkspace");
    const report = WorkspaceCore.inspectWorkspacePackage(workspacePackage, {
      storageKeys: options.storageKeys || {},
      limits: options.workspaceLimits || {},
      preRestoreKey: options.preRestoreKey
    });
    if (!report.valid) throw new Error(report.errors[0] || "Workspace package validation failed.");
    if (!report.checksumVerified) throw new Error("The workspace package checksum must verify before transfer.");
    return report;
  }

  function requireQueueReport(queuePackage, options = {}) {
    rejectUnsafeComponent(queuePackage, "buildCrossDeviceTransferQueue");
    const report = QueueCore.inspectQueuePackage(queuePackage, {
      expectedTenantId: options.expectedTenantId,
      maximumEntries: options.maximumQueueEntries
    });
    if (!report.valid) throw new Error(report.errors[0] || "Synchronization queue package validation failed.");
    if (!report.checksumVerified) throw new Error("The synchronization queue package checksum must verify before transfer.");
    return report;
  }

  function requireEvidenceReport(evidencePackage) {
    rejectUnsafeComponent(evidencePackage, "buildCrossDeviceTransferEvidence");
    const report = QueueCore.inspectOperatorEvidencePackage(evidencePackage);
    if (!report.valid) throw new Error(report.errors[0] || "Operator evidence package validation failed.");
    if (!report.checksumVerified) throw new Error("The operator evidence checksum must verify before transfer.");
    return report;
  }

  function assertTenantBinding(queueReport, evidencePackage) {
    const evidenceTenantReference = typeof evidencePackage?.tenantReference === "string" ? evidencePackage.tenantReference : "";
    if (!queueReport.tenantReference || evidenceTenantReference !== queueReport.tenantReference) {
      throw new Error("Synchronization queue and operator evidence tenant binding validation failed.");
    }
    return evidenceTenantReference;
  }

  function buildTransferPackage(options = {}) {
    const workspaceReport = requireWorkspaceReport(options.workspacePackage, options);
    const queueReport = requireQueueReport(options.queuePackage, options);
    const evidenceReport = requireEvidenceReport(options.operatorEvidencePackage);
    const evidenceTenantReference = assertTenantBinding(queueReport, options.operatorEvidencePackage);
    const readinessReport = inspectReadinessReport(options.readinessReport);
    if (!readinessReport.valid) throw new Error(readinessReport.errors[0]);
    rejectUnsafeComponent(options.readinessReport, "buildCrossDeviceTransferReadiness");

    const generatedAt = options.generatedAt || nowIso(options.clock);
    if (!validIso(generatedAt)) throw new Error("The transfer package requires a valid generatedAt timestamp.");
    const sourceSessionReference = opaqueReference("session", options.sourceSessionSeed || `${generatedAt}:${Math.random()}`);
    const checkpoints = normalizeCheckpoints(options.checkpoints);
    const body = {
      packageType: PACKAGE_TYPE,
      packageVersion: VERSION,
      appShellVersion: String(options.appShellVersion || "1.6.8"),
      recordSchemaVersion: String(options.recordSchemaVersion || "1.6.0"),
      generatedAt,
      sourceSessionReference,
      components: {
        workspace: clone(options.workspacePackage),
        synchronizationQueue: clone(options.queuePackage),
        operatorEvidence: clone(options.operatorEvidencePackage),
        deviceReadiness: clone(options.readinessReport)
      },
      manifest: {
        workspace: {
          checksumVerified: true,
          checksumReference: opaqueReference("workspace-checksum", workspaceReport.checksum),
          summary: clone(workspaceReport.summary),
          recognizedEntryCount: workspaceReport.recognizedKeys.length
        },
        synchronizationQueue: {
          checksumVerified: true,
          tenantReference: queueReport.tenantReference,
          summary: clone(queueReport.summary)
        },
        operatorEvidence: {
          checksumVerified: true,
          tenantReference: evidenceTenantReference,
          eventCount: evidenceReport.events.length
        },
        deviceReadiness: {
          metadataOnly: true,
          overall: String(options.readinessReport.overall || "Unknown"),
          generatedAt: String(options.readinessReport.generatedAt || "")
        }
      },
      checkpoints,
      boundaries: {
        includesWorkspaceValues: true,
        includesMeetingRecords: true,
        includesQueueEntries: true,
        includesPrivateSigningKeys: false,
        includesPrivateJwkMaterial: false,
        includesCredentials: false,
        includesProductionEndpoints: false,
        performsAutomaticImport: false,
        performsAutomaticSynchronization: false,
        provesDeviceIdentity: false,
        provesDelivery: false,
        provesAuthorization: false
      }
    };

    rejectUnsafeComponent(body.components, "buildCrossDeviceTransferComponents");
    return {
      ...body,
      integrity: { algorithm: INTEGRITY_ALGORITHM, value: hash(body) }
    };
  }

  function inspectTransferPackage(payload, options = {}) {
    const errors = [];
    const warnings = [];
    let checksumVerified = false;
    let workspaceReport = emptyWorkspaceReport();
    let queueReport = emptyQueueReport();
    let evidenceReport = { valid: false, checksumVerified: false, errors: [], events: [] };
    let readinessReport = { valid: false, errors: [] };

    if (!isPlainObject(payload)) return finalize();
    if (payload.packageType !== PACKAGE_TYPE) errors.push("This is not a Methodz cross-device transfer rehearsal package.");
    if (payload.packageVersion !== VERSION) errors.push(`Unsupported transfer package version: ${String(payload.packageVersion ?? "missing")}.`);
    if (!validIso(payload.generatedAt)) errors.push("The transfer package requires a valid generatedAt timestamp.");
    if (typeof payload.sourceSessionReference !== "string" || !payload.sourceSessionReference.startsWith("session:")) errors.push("The transfer package requires an opaque source session reference.");

    if (!isPlainObject(payload.integrity) || payload.integrity.algorithm !== INTEGRITY_ALGORITHM || typeof payload.integrity.value !== "string") {
      errors.push("The transfer package integrity metadata is missing or malformed.");
    } else {
      const body = { ...payload };
      delete body.integrity;
      if (hash(body) !== payload.integrity.value) errors.push("Transfer package integrity validation failed. The file may be incomplete or modified.");
      else checksumVerified = true;
    }

    const components = isPlainObject(payload.components) ? payload.components : {};
    for (const [name, value] of Object.entries({
      Workspace: components.workspace,
      Queue: components.synchronizationQueue,
      "Operator evidence": components.operatorEvidence,
      "Device readiness": components.deviceReadiness
    })) {
      try {
        rejectUnsafeComponent(value, `inspectCrossDeviceTransfer${name.replace(/\s+/g, "")}`);
      } catch (error) {
        errors.push(`${name}: ${error.message}`);
      }
    }

    try {
      workspaceReport = WorkspaceCore.inspectWorkspacePackage(components.workspace, {
        storageKeys: options.storageKeys || {},
        limits: options.workspaceLimits || {},
        preRestoreKey: options.preRestoreKey
      });
      if (!workspaceReport.valid) errors.push(...workspaceReport.errors.map((item) => `Workspace: ${item}`));
      if (!workspaceReport.checksumVerified) errors.push("Workspace: checksum verification is required.");
    } catch (error) {
      errors.push(`Workspace: ${error.message}`);
    }

    try {
      queueReport = QueueCore.inspectQueuePackage(components.synchronizationQueue, {
        expectedTenantId: options.expectedTenantId,
        maximumEntries: options.maximumQueueEntries
      });
      if (!queueReport.valid) errors.push(...queueReport.errors.map((item) => `Queue: ${item}`));
      if (!queueReport.checksumVerified) errors.push("Queue: checksum verification is required.");
      warnings.push(...queueReport.warnings.map((item) => `Queue: ${item}`));
    } catch (error) {
      errors.push(`Queue: ${error.message}`);
    }

    try {
      evidenceReport = QueueCore.inspectOperatorEvidencePackage(components.operatorEvidence);
      if (!evidenceReport.valid) errors.push(...evidenceReport.errors.map((item) => `Operator evidence: ${item}`));
      if (!evidenceReport.checksumVerified) errors.push("Operator evidence: checksum verification is required.");
    } catch (error) {
      errors.push(`Operator evidence: ${error.message}`);
    }

    if (queueReport.tenantReference && components.operatorEvidence?.tenantReference !== queueReport.tenantReference) {
      errors.push("Synchronization queue and operator evidence tenant binding validation failed.");
    }

    readinessReport = inspectReadinessReport(components.deviceReadiness);
    if (!readinessReport.valid) errors.push(...readinessReport.errors.map((item) => `Device readiness: ${item}`));

    const collisions = reviewDestinationCollisions({
      incomingWorkspaceEntries: workspaceReport.recognizedEntries,
      currentWorkspaceEntries: options.currentWorkspaceEntries || {},
      incomingQueueEntries: queueReport.entries,
      currentQueueEntries: options.currentQueueEntries || [],
      storageKeys: options.storageKeys || {}
    });

    const manifest = isPlainObject(payload.manifest) ? payload.manifest : {};
    if (manifest.workspace?.checksumVerified !== true || manifest.synchronizationQueue?.checksumVerified !== true || manifest.operatorEvidence?.checksumVerified !== true) {
      errors.push("The transfer manifest does not declare verified component integrity.");
    }
    if (manifest.synchronizationQueue?.tenantReference !== queueReport.tenantReference || manifest.operatorEvidence?.tenantReference !== queueReport.tenantReference) {
      errors.push("The transfer manifest tenant binding is inconsistent.");
    }

    return finalize(collisions);

    function finalize(collisions = emptyCollisionReport()) {
      return {
        valid: errors.length === 0 && checksumVerified && workspaceReport.checksumVerified === true && queueReport.checksumVerified === true && evidenceReport.checksumVerified === true && readinessReport.valid === true,
        checksumVerified,
        errors,
        warnings,
        sourceSessionReference: typeof payload?.sourceSessionReference === "string" ? payload.sourceSessionReference : "",
        generatedAt: typeof payload?.generatedAt === "string" ? payload.generatedAt : "",
        appShellVersion: String(payload?.appShellVersion || ""),
        recordSchemaVersion: String(payload?.recordSchemaVersion || ""),
        checkpoints: normalizeCheckpoints(payload?.checkpoints),
        workspaceReport,
        queueReport,
        operatorEvidenceReport: evidenceReport,
        readinessReport,
        collisions
      };
    }
  }

  function reviewDestinationCollisions(options = {}) {
    const keys = options.storageKeys || {};
    const incoming = isPlainObject(options.incomingWorkspaceEntries) ? options.incomingWorkspaceEntries : {};
    const current = isPlainObject(options.currentWorkspaceEntries) ? options.currentWorkspaceEntries : {};
    const recordsKey = keys.records || "methodzMeetingRecords";
    const archivedKey = keys.archivedRecords || "methodzArchivedMeetingRecords";
    const revisionsKey = keys.revisions || "methodzMeetingRevisions";
    const publicKeysKey = keys.signingPublicKeys || "methodzSigningPublicKeys";

    const incomingActive = identifiers(parseEntry(incoming[recordsKey]));
    const incomingArchived = identifiers(parseEntry(incoming[archivedKey]));
    const currentActive = identifiers(parseEntry(current[recordsKey]));
    const currentArchived = identifiers(parseEntry(current[archivedKey]));
    const incomingRevisions = objectIdentifiers(parseEntry(incoming[revisionsKey]));
    const currentRevisions = objectIdentifiers(parseEntry(current[revisionsKey]));
    const incomingPublicKeys = identifiers(parseEntry(incoming[publicKeysKey]));
    const currentPublicKeys = identifiers(parseEntry(current[publicKeysKey]));
    const incomingQueue = identifiers(options.incomingQueueEntries || []);
    const currentQueue = identifiers(options.currentQueueEntries || []);

    const groups = {
      activeRecords: intersection(incomingActive, currentActive, "record"),
      archivedRecords: intersection(incomingArchived, currentArchived, "archive"),
      incomingActiveVsLocalArchive: intersection(incomingActive, currentArchived, "record-archive"),
      incomingArchiveVsLocalActive: intersection(incomingArchived, currentActive, "archive-record"),
      revisionGroups: intersection(incomingRevisions, currentRevisions, "revision"),
      publicVerificationKeys: intersection(incomingPublicKeys, currentPublicKeys, "public-key"),
      synchronizationQueueEntries: intersection(incomingQueue, currentQueue, "queue")
    };
    const total = Object.values(groups).reduce((sum, items) => sum + items.length, 0);
    return {
      total,
      requiresReview: total > 0,
      groups,
      counts: Object.fromEntries(Object.entries(groups).map(([key, items]) => [key, items.length]))
    };
  }

  function buildRehearsalReport(options = {}) {
    const inspection = options.inspection || {};
    const checkpoints = normalizeCheckpoints(options.checkpoints || inspection.checkpoints);
    const generatedAt = options.generatedAt || nowIso(options.clock);
    const body = {
      reportType: REPORT_TYPE,
      reportVersion: VERSION,
      generatedAt,
      appShellVersion: String(options.appShellVersion || inspection.appShellVersion || "1.6.8"),
      recordSchemaVersion: String(options.recordSchemaVersion || inspection.recordSchemaVersion || "1.6.0"),
      rehearsalSessionReference: opaqueReference("rehearsal", options.rehearsalSeed || `${generatedAt}:${Math.random()}`),
      sourceSessionReference: inspection.sourceSessionReference || null,
      stage: String(options.stage || "inspection"),
      integrity: {
        transferPackageVerified: inspection.checksumVerified === true,
        workspaceVerified: inspection.workspaceReport?.checksumVerified === true,
        queueVerified: inspection.queueReport?.checksumVerified === true,
        operatorEvidenceVerified: inspection.operatorEvidenceReport?.checksumVerified === true,
        readinessMetadataOnly: inspection.readinessReport?.valid === true
      },
      counts: {
        activeRecords: Number(inspection.workspaceReport?.summary?.activeRecords || 0),
        archivedRecords: Number(inspection.workspaceReport?.summary?.archivedRecords || 0),
        revisionGroups: Number(inspection.workspaceReport?.summary?.revisionGroups || 0),
        storageEntries: Number(inspection.workspaceReport?.summary?.entryCount || 0),
        queueEntries: Number(inspection.queueReport?.summary?.entryCount || 0),
        queueConflicts: Number(inspection.queueReport?.summary?.conflictCount || 0),
        operatorEvents: Number(inspection.operatorEvidenceReport?.events?.length || 0),
        destinationCollisions: Number(inspection.collisions?.total || 0)
      },
      collisionCounts: clone(inspection.collisions?.counts || {}),
      checkpoints,
      result: {
        inspectionValid: inspection.valid === true,
        recoveryCreated: options.recoveryCreated === true,
        mutationApplied: options.mutationApplied === true,
        rollbackApplied: options.rollbackApplied === true,
        postImportVerified: checkpoints.postImportVerified === true
      },
      boundaries: {
        containsMeetingContent: false,
        containsRecordIds: false,
        containsAttendeeNames: false,
        containsSignatures: false,
        containsCredentials: false,
        containsPrivateKeyMaterial: false,
        provesDeviceIdentity: false,
        provesDelivery: false,
        provesAuthorization: false,
        provesLegalApproval: false
      }
    };
    return { ...body, checksum: WorkspaceCore.hashText(WorkspaceCore.stableStringify(body)) };
  }

  function parseEntry(raw) {
    if (typeof raw !== "string") return raw;
    try { return JSON.parse(raw); } catch (error) { return null; }
  }

  function identifiers(value) {
    const values = Array.isArray(value) ? value : isPlainObject(value) ? Object.values(value) : [];
    return new Set(values.map(identifierFor).filter(Boolean));
  }

  function objectIdentifiers(value) {
    if (!isPlainObject(value)) return new Set();
    return new Set(Object.keys(value).filter(Boolean));
  }

  function identifierFor(value) {
    if (typeof value === "string") return value;
    if (!isPlainObject(value)) return null;
    return value.id || value.recordId || value.meetingId || value.keyId || value.fingerprint || value.queueId || null;
  }

  function intersection(left, right, prefix) {
    const output = [];
    left.forEach((id) => {
      if (right.has(id)) output.push(opaqueReference(prefix, id));
    });
    return output.sort();
  }

  function emptyWorkspaceReport() {
    return { valid: false, checksumVerified: false, errors: [], warnings: [], recognizedEntries: {}, recognizedKeys: [], summary: {} };
  }

  function emptyQueueReport() {
    return { valid: false, checksumVerified: false, errors: [], warnings: [], tenantId: "", tenantReference: "", entries: [], summary: {} };
  }

  function emptyCollisionReport() {
    return { total: 0, requiresReview: false, groups: {}, counts: {} };
  }

  return Object.freeze({
    version: VERSION,
    packageType: PACKAGE_TYPE,
    reportType: REPORT_TYPE,
    checkpoints: CHECKPOINTS,
    normalizeCheckpoints,
    inspectReadinessReport,
    buildTransferPackage,
    inspectTransferPackage,
    reviewDestinationCollisions,
    buildRehearsalReport
  });
});
