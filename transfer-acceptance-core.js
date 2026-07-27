/* Methodz Meeting Manager v1.6.9 metadata-only transfer acceptance and diagnostics core. */
(function exposeTransferAcceptanceCore(root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MethodzTransferAcceptanceCoreV169 = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createTransferAcceptanceCore() {
  "use strict";

  const COMPONENTS = Object.freeze([
    { id: "activeRecords", label: "Active records" },
    { id: "archivedRecords", label: "Archive Vault records" },
    { id: "revisions", label: "Revision history" },
    { id: "directories", label: "Directories" },
    { id: "templates", label: "Templates" },
    { id: "governance", label: "Governance metadata" },
    { id: "publicKeys", label: "Public verification keys" },
    { id: "custody", label: "Custody records" },
    { id: "recovery", label: "Recovery logs" },
    { id: "tenantQueue", label: "Tenant queue state" }
  ]);

  function stableStringify(value) {
    if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
    if (value && typeof value === "object") {
      return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
    }
    return JSON.stringify(value);
  }

  function hashText(text) {
    let hash = 2166136261;
    const input = String(text ?? "");
    for (let index = 0; index < input.length; index += 1) {
      hash ^= input.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return `fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}`;
  }

  function byteLength(value) {
    const text = String(value ?? "");
    if (typeof TextEncoder === "function") return new TextEncoder().encode(text).length;
    if (typeof Buffer !== "undefined") return Buffer.byteLength(text, "utf8");
    return unescape(encodeURIComponent(text)).length;
  }

  function parseMetadata(value) {
    const bytes = byteLength(value);
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return { count: parsed.length, bytes, parseable: true, shape: "array" };
      if (parsed && typeof parsed === "object") return { count: Object.keys(parsed).length, bytes, parseable: true, shape: "object" };
      return { count: parsed === null || parsed === "" ? 0 : 1, bytes, parseable: true, shape: "scalar" };
    } catch (error) {
      return { count: value ? 1 : 0, bytes, parseable: false, shape: "text" };
    }
  }

  function lower(value) {
    return String(value || "").toLowerCase();
  }

  function classifyStorageKey(key, storageKeys) {
    const names = Object.entries(storageKeys || {})
      .filter(([, value]) => value === key)
      .map(([name]) => lower(name));
    const fingerprint = `${lower(key)} ${names.join(" ")}`;
    const categories = [];

    if (key === storageKeys?.records || names.includes("records")) categories.push("activeRecords");
    if (key === storageKeys?.archivedRecords || fingerprint.includes("archivedmeeting") || names.includes("archivedrecords")) categories.push("archivedRecords");
    if (key === storageKeys?.revisions || fingerprint.includes("revision")) categories.push("revisions");
    if (fingerprint.includes("directory")) categories.push("directories");
    if (fingerprint.includes("template")) categories.push("templates");
    if (/(governance|retention|redaction|approval|release|recipient|disposition|preservation|hold|policy|receipt)/.test(fingerprint)) categories.push("governance");
    if (/(signingpublickey|publicverificationkey|verificationkeys|publickeys)/.test(fingerprint)) categories.push("publicKeys");
    if (/(custody|keyrotation|keyrevocation|lostkey)/.test(fingerprint)) categories.push("custody");
    if (/(recovery|prerestore|drill)/.test(fingerprint)) categories.push("recovery");
    if (/(syncrehearsalqueue|syncqueue|queuepackage)/.test(fingerprint)) categories.push("tenantQueue");

    return Array.from(new Set(categories));
  }

  function emptyComponentSummary() {
    return COMPONENTS.reduce((summary, component) => {
      summary[component.id] = { entryCount: 0, itemCount: 0, bytes: 0, parseableEntries: 0, unparseableEntries: 0 };
      return summary;
    }, {});
  }

  function buildComponentSummary(options = {}) {
    const entries = options.entries && typeof options.entries === "object" ? options.entries : {};
    const storageKeys = options.storageKeys || {};
    const components = emptyComponentSummary();
    let totalBytes = 0;
    let parseableEntries = 0;
    let unparseableEntries = 0;

    Object.entries(entries).forEach(([key, value]) => {
      if (typeof value !== "string") return;
      const metadata = parseMetadata(value);
      totalBytes += metadata.bytes;
      if (metadata.parseable) parseableEntries += 1;
      else unparseableEntries += 1;

      classifyStorageKey(key, storageKeys).forEach((componentId) => {
        const component = components[componentId];
        component.entryCount += 1;
        component.itemCount += metadata.count;
        component.bytes += metadata.bytes;
        if (metadata.parseable) component.parseableEntries += 1;
        else component.unparseableEntries += 1;
      });
    });

    const summary = {
      version: "1.0.0",
      totalEntries: Object.values(entries).filter((value) => typeof value === "string").length,
      totalBytes,
      parseableEntries,
      unparseableEntries,
      components
    };
    summary.fingerprint = hashText(stableStringify(summary));
    return summary;
  }

  function normalizeChecks(checks) {
    const input = checks && typeof checks === "object" ? checks : {};
    return COMPONENTS.reduce((result, component) => {
      result[component.id] = input[component.id] === true;
      return result;
    }, {});
  }

  function buildAcceptanceReport(options = {}) {
    const checks = normalizeChecks(options.checks);
    const missing = COMPONENTS.filter((component) => !checks[component.id]).map((component) => component.id);
    const transferStage = String(options.transferStage || "unknown");
    const verifiedTransfer = transferStage === "destination-import-verified" || transferStage === "accepted";
    const summary = options.summary || buildComponentSummary();
    const body = {
      reportType: "methodz-transfer-acceptance-report",
      reportVersion: "1.0.0",
      generatedAt: options.generatedAt || new Date().toISOString(),
      appShellVersion: options.appShellVersion || "unknown",
      recordSchemaVersion: options.recordSchemaVersion || "unknown",
      transferStage,
      verifiedTransfer,
      accepted: verifiedTransfer && missing.length === 0,
      checkedComponents: COMPONENTS.length - missing.length,
      requiredComponents: COMPONENTS.length,
      missingComponents: missing,
      workspace: {
        totalEntries: Number(summary.totalEntries || 0),
        totalBytes: Number(summary.totalBytes || 0),
        parseableEntries: Number(summary.parseableEntries || 0),
        unparseableEntries: Number(summary.unparseableEntries || 0),
        components: COMPONENTS.reduce((result, component) => {
          const source = summary.components?.[component.id] || {};
          result[component.id] = {
            entryCount: Number(source.entryCount || 0),
            itemCount: Number(source.itemCount || 0),
            bytes: Number(source.bytes || 0),
            reviewed: checks[component.id]
          };
          return result;
        }, {})
      },
      boundaries: {
        containsMeetingContent: false,
        containsRawRecordIds: false,
        containsAttendeeNames: false,
        containsSignatures: false,
        containsCredentials: false,
        containsPrivateKeyMaterial: false,
        authenticatesPersonOrDevice: false
      }
    };
    return { ...body, checksum: hashText(stableStringify(body)) };
  }

  function buildDiagnosticsReport(options = {}) {
    const summary = options.summary || buildComponentSummary();
    const usage = Number(options.usageBytes);
    const quota = Number(options.quotaBytes);
    const ratio = Number.isFinite(usage) && Number.isFinite(quota) && quota > 0 ? usage / quota : null;
    const softLimit = Number(options.softStorageByteLimit) || 4 * 1024 * 1024;
    const warningRatio = Number(options.storageWarningRatio) || 0.75;
    const warnings = [];
    if (summary.totalBytes >= softLimit) warnings.push("soft-storage-limit");
    if (ratio !== null && ratio >= warningRatio) warnings.push("quota-ratio");
    if (summary.unparseableEntries > 0) warnings.push("unparseable-storage-entries");

    const body = {
      reportType: "methodz-workspace-diagnostics-report",
      reportVersion: "1.0.0",
      generatedAt: options.generatedAt || new Date().toISOString(),
      appShellVersion: options.appShellVersion || "unknown",
      recordSchemaVersion: options.recordSchemaVersion || "unknown",
      durationMilliseconds: Math.max(0, Number(options.durationMilliseconds) || 0),
      workspace: {
        totalEntries: Number(summary.totalEntries || 0),
        totalBytes: Number(summary.totalBytes || 0),
        parseableEntries: Number(summary.parseableEntries || 0),
        unparseableEntries: Number(summary.unparseableEntries || 0),
        componentTotals: COMPONENTS.reduce((result, component) => {
          const source = summary.components?.[component.id] || {};
          result[component.id] = {
            entryCount: Number(source.entryCount || 0),
            itemCount: Number(source.itemCount || 0),
            bytes: Number(source.bytes || 0)
          };
          return result;
        }, {})
      },
      browserStorage: {
        usageBytes: Number.isFinite(usage) ? usage : null,
        quotaBytes: Number.isFinite(quota) ? quota : null,
        usageRatio: ratio === null ? null : Number(ratio.toFixed(6)),
        persisted: options.persisted === true
      },
      warnings,
      boundaries: {
        containsMeetingContent: false,
        containsStorageValues: false,
        containsStorageKeyNames: false,
        containsRawRecordIds: false,
        containsCredentials: false,
        containsPrivateKeyMaterial: false
      }
    };
    return { ...body, checksum: hashText(stableStringify(body)) };
  }

  function buildRollbackReport(options = {}) {
    const body = {
      reportType: "methodz-transfer-rollback-rehearsal-report",
      reportVersion: "1.0.0",
      generatedAt: options.generatedAt || new Date().toISOString(),
      appShellVersion: options.appShellVersion || "unknown",
      recordSchemaVersion: options.recordSchemaVersion || "unknown",
      stage: options.stage || "unknown",
      checksumVerified: options.checksumVerified === true,
      recoveryCreated: options.recoveryCreated === true,
      mutationApplied: options.mutationApplied === true,
      readBackVerified: options.readBackVerified === true,
      automaticRecoveryApplied: options.automaticRecoveryApplied === true,
      counts: {
        add: Number(options.counts?.add || 0),
        replace: Number(options.counts?.replace || 0),
        unchanged: Number(options.counts?.unchanged || 0),
        remove: Number(options.counts?.remove || 0),
        ignored: Number(options.counts?.ignored || 0)
      },
      boundaries: {
        containsMeetingContent: false,
        containsStorageValues: false,
        containsRawRecordIds: false,
        containsCredentials: false,
        containsPrivateKeyMaterial: false,
        provesOperatorIdentity: false
      }
    };
    return { ...body, checksum: hashText(stableStringify(body)) };
  }

  return Object.freeze({
    COMPONENTS,
    stableStringify,
    hashText,
    byteLength,
    parseMetadata,
    classifyStorageKey,
    buildComponentSummary,
    normalizeChecks,
    buildAcceptanceReport,
    buildDiagnosticsReport,
    buildRollbackReport
  });
});
