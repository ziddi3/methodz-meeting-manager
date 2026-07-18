/* Methodz Meeting Manager workspace package validation and recovery planning core. */
(function exposeWorkspacePackageCore(root, factory) {
  "use strict";

  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MethodzWorkspacePackageCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createWorkspacePackageCore() {
  "use strict";

  const PACKAGE_TYPE = "methodz-meeting-manager-workspace";
  const DEFAULT_LIMITS = Object.freeze({
    maxEntries: 500,
    maxEntryBytes: 2 * 1024 * 1024,
    maxTotalBytes: 12 * 1024 * 1024
  });
  const PRIVATE_JWK_FIELDS = new Set(["d", "p", "q", "dp", "dq", "qi", "oth"]);

  function inspectWorkspacePackage(payload, options = {}) {
    const limits = {
      ...DEFAULT_LIMITS,
      ...(isPlainObject(options.limits) ? options.limits : {})
    };
    const preRestoreKey = String(options.preRestoreKey || "methodzPreRestoreBackup");
    const errors = [];
    const warnings = [];
    const entries = {};
    const ignoredKeys = [];
    const malformedJsonKeys = [];
    const privateMaterialPaths = [];
    const entrySizes = {};
    let totalBytes = 0;

    if (!isPlainObject(payload)) {
      errors.push("The selected file is not a JSON object.");
      return finalizeReport();
    }

    if (payload.packageType !== PACKAGE_TYPE) {
      errors.push("This is not a Methodz Meeting Manager workspace package.");
    }

    if (payload.packageVersion !== 1) {
      errors.push(`Unsupported workspace package version: ${String(payload.packageVersion ?? "missing")}.`);
    }

    if (!isPlainObject(payload.entries)) {
      errors.push("The workspace package does not contain a valid entries object.");
      return finalizeReport();
    }

    const sourceEntries = Object.entries(payload.entries);
    if (sourceEntries.length > limits.maxEntries) {
      errors.push(`The package contains ${sourceEntries.length} entries; the limit is ${limits.maxEntries}.`);
    }

    sourceEntries.forEach(([key, raw]) => {
      if (!isRecognizedKey(key) || key === preRestoreKey) {
        ignoredKeys.push(String(key));
        return;
      }

      if (typeof raw !== "string") {
        errors.push(`Storage entry "${key}" must contain a string value.`);
        return;
      }

      const bytes = byteLength(raw);
      entrySizes[key] = bytes;
      totalBytes += bytes;

      if (bytes > limits.maxEntryBytes) {
        errors.push(`Storage entry "${key}" exceeds the ${formatBytes(limits.maxEntryBytes)} per-entry limit.`);
      }

      const parsed = parseJson(raw);
      if (!parsed.ok) {
        malformedJsonKeys.push(key);
      } else {
        scanForPrivateJwk(parsed.value, `entries.${key}`, privateMaterialPaths);
      }

      entries[key] = raw;
    });

    if (!Object.keys(entries).length) {
      errors.push("No recognized Methodz Meeting Manager storage entries were found.");
    }

    if (totalBytes > limits.maxTotalBytes) {
      errors.push(`Recognized workspace data exceeds the ${formatBytes(limits.maxTotalBytes)} package limit.`);
    }

    if (ignoredKeys.length) {
      warnings.push(`${ignoredKeys.length} unsupported or protected storage entr${ignoredKeys.length === 1 ? "y was" : "ies were"} excluded from the restore plan.`);
    }

    if (malformedJsonKeys.length) {
      warnings.push(`${malformedJsonKeys.length} recognized storage entr${malformedJsonKeys.length === 1 ? "y is" : "ies are"} not valid JSON and will be restored as raw text.`);
    }

    if (privateMaterialPaths.length) {
      errors.push("Private cryptographic key material was detected inside the workspace package.");
    }

    if (!payload.checksum) {
      warnings.push("The package has no checksum. Integrity cannot be confirmed before import.");
    } else if (typeof payload.checksum !== "string") {
      errors.push("The workspace package checksum must be a string.");
    } else {
      const body = { ...payload };
      delete body.checksum;
      const actualChecksum = hashText(stableStringify(body));
      if (actualChecksum !== payload.checksum) {
        errors.push("Package checksum validation failed. The file may be incomplete or modified.");
      }
    }

    if (payload.exportedAt) {
      const exportedAt = new Date(payload.exportedAt);
      if (Number.isNaN(exportedAt.getTime())) warnings.push("The package export timestamp is not a valid date.");
    } else {
      warnings.push("The package does not include an export timestamp.");
    }

    const actualSummary = summarizeEntries(entries, options.storageKeys || {});
    if (isPlainObject(payload.summary)) {
      compareSummary(payload.summary, actualSummary, warnings);
    } else {
      warnings.push("The package does not include a workspace summary.");
    }

    return finalizeReport(actualSummary);

    function finalizeReport(actualSummary = summarizeEntries(entries, options.storageKeys || {})) {
      return {
        valid: errors.length === 0,
        packageType: payload?.packageType || "",
        packageVersion: payload?.packageVersion ?? null,
        schemaVersion: String(payload?.schemaVersion || ""),
        exportedAt: String(payload?.exportedAt || ""),
        checksum: String(payload?.checksum || ""),
        checksumVerified: Boolean(payload?.checksum) && !errors.some((message) => message.startsWith("Package checksum validation failed")),
        errors,
        warnings,
        recognizedEntries: entries,
        recognizedKeys: Object.keys(entries).sort(),
        ignoredKeys: ignoredKeys.sort(),
        malformedJsonKeys: malformedJsonKeys.sort(),
        privateMaterialPaths: privateMaterialPaths.sort(),
        entrySizes,
        totalBytes,
        summary: actualSummary,
        limits
      };
    }
  }

  function assertValidWorkspacePackage(payload, options = {}) {
    const report = inspectWorkspacePackage(payload, options);
    if (report.valid) return report;

    const error = new Error(report.errors[0] || "Workspace package validation failed.");
    error.name = "WorkspacePackageValidationError";
    error.report = report;
    throw error;
  }

  function buildRestorePlan(payload, currentEntries = {}, options = {}) {
    const report = inspectWorkspacePackage(payload, options);
    const current = isPlainObject(currentEntries) ? currentEntries : {};
    const plan = {
      add: [],
      replace: [],
      unchanged: [],
      ignored: [...report.ignoredKeys],
      remove: []
    };

    if (report.valid) {
      Object.entries(report.recognizedEntries).forEach(([key, value]) => {
        if (!(key in current)) plan.add.push(key);
        else if (current[key] === value) plan.unchanged.push(key);
        else plan.replace.push(key);
      });

      if (options.mode === "replace") {
        Object.keys(current)
          .filter((key) => isRecognizedKey(key) && key !== String(options.preRestoreKey || "methodzPreRestoreBackup"))
          .filter((key) => !(key in report.recognizedEntries))
          .forEach((key) => plan.remove.push(key));
      }
    }

    Object.values(plan).forEach((items) => items.sort());
    return {
      generatedAt: new Date().toISOString(),
      mode: options.mode === "replace" ? "replace" : "merge",
      report,
      plan,
      counts: Object.fromEntries(Object.entries(plan).map(([key, items]) => [key, items.length]))
    };
  }

  function summarizeEntries(entries, storageKeys = {}) {
    const keys = {
      records: storageKeys.records || "methodzMeetingRecords",
      archivedRecords: storageKeys.archivedRecords || "methodzArchivedMeetingRecords",
      revisions: storageKeys.revisions || "methodzMeetingRevisions"
    };

    return {
      entryCount: Object.keys(entries).length,
      activeRecords: parsedCollectionCount(entries[keys.records]),
      archivedRecords: parsedCollectionCount(entries[keys.archivedRecords]),
      revisionGroups: parsedCollectionCount(entries[keys.revisions]),
      byteEstimate: Object.values(entries).reduce((sum, raw) => sum + byteLength(raw), 0)
    };
  }

  function compareSummary(declared, actual, warnings) {
    const fields = ["entryCount", "activeRecords", "archivedRecords", "revisionGroups", "byteEstimate"];
    const mismatches = fields.filter((field) => Number(declared[field] ?? 0) !== Number(actual[field] ?? 0));
    if (mismatches.length) {
      warnings.push(`The declared workspace summary does not match package contents for: ${mismatches.join(", ")}.`);
    }
  }

  function parsedCollectionCount(raw) {
    if (typeof raw !== "string") return 0;
    const parsed = parseJson(raw);
    if (!parsed.ok) return 0;
    if (Array.isArray(parsed.value)) return parsed.value.length;
    if (isPlainObject(parsed.value)) return Object.keys(parsed.value).length;
    return 0;
  }

  function scanForPrivateJwk(value, path, findings, depth = 0, seen = new Set()) {
    if (depth > 24 || value == null || typeof value !== "object" || seen.has(value)) return;
    seen.add(value);

    if (isPlainObject(value)) {
      const keys = Object.keys(value);
      const privateFields = keys.filter((key) => PRIVATE_JWK_FIELDS.has(key));
      if (typeof value.kty === "string" && privateFields.length) {
        findings.push(`${path}.${privateFields.join(",")}`);
      }

      keys.forEach((key) => {
        const lowered = key.toLowerCase();
        if ((lowered === "privatekey" || lowered === "privatejwk" || lowered === "privatekeyjwk") && value[key]) {
          findings.push(`${path}.${key}`);
        }
        scanForPrivateJwk(value[key], `${path}.${key}`, findings, depth + 1, seen);
      });
      return;
    }

    value.forEach((item, index) => scanForPrivateJwk(item, `${path}[${index}]`, findings, depth + 1, seen));
  }

  function isRecognizedKey(key) {
    return typeof key === "string" && (key.startsWith("methodz") || key === "meetingRecords");
  }

  function isPlainObject(value) {
    return Boolean(value && typeof value === "object" && !Array.isArray(value));
  }

  function parseJson(raw) {
    try {
      return { ok: true, value: JSON.parse(raw) };
    } catch (error) {
      return { ok: false, error };
    }
  }

  function byteLength(value) {
    const text = String(value ?? "");
    if (typeof TextEncoder === "function") return new TextEncoder().encode(text).length;
    if (typeof Buffer !== "undefined") return Buffer.byteLength(text, "utf8");
    return unescape(encodeURIComponent(text)).length;
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  function hashText(text) {
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return `fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}`;
  }

  function stableStringify(value) {
    if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
    if (value && typeof value === "object") {
      return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
    }
    return JSON.stringify(value);
  }

  return Object.freeze({
    PACKAGE_TYPE,
    DEFAULT_LIMITS,
    inspectWorkspacePackage,
    assertValidWorkspacePackage,
    buildRestorePlan,
    summarizeEntries,
    hashText,
    stableStringify,
    byteLength,
    formatBytes,
    isRecognizedKey
  });
});
