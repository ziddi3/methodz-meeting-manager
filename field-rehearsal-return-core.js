/* Methodz Meeting Manager portable, metadata-only Field Rehearsal return contract. */
(function exposeMethodzFieldRehearsalReturnCore(root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MethodzFieldRehearsalReturnCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createMethodzFieldRehearsalReturnCore() {
  "use strict";

  const VERSION = "1.1.0";
  const PREFIX = "#methodz-evidence-return=";
  const READINESS = Object.freeze(["ready", "fail", "blocked", "incomplete"]);
  const ROWS = Object.freeze([
    Object.freeze({ key: "desktopChromium", label: "Desktop Chromium" }),
    Object.freeze({ key: "desktopNonChromium", label: "Desktop non-Chromium" }),
    Object.freeze({ key: "androidChrome", label: "Android Chrome" }),
    Object.freeze({ key: "iosSafari", label: "iOS Safari" }),
    Object.freeze({ key: "tablet", label: "Tablet" }),
    Object.freeze({ key: "twoDevice", label: "Two-device" })
  ]);

  const text = (value, maximum = 96) => String(value ?? "").trim().slice(0, maximum);

  function commitSha(value) {
    const normalized = text(value, 40).toLowerCase();
    return /^[0-9a-f]{7,40}$/.test(normalized) ? normalized : "";
  }

  function evidenceSha256(value) {
    const normalized = text(value, 64).toLowerCase();
    return /^[0-9a-f]{64}$/.test(normalized) ? normalized : "";
  }

  function rowDefinition(value) {
    const key = text(value, 40);
    return ROWS.find((row) => row.key === key) || null;
  }

  function readiness(value) {
    const normalized = text(value, 32).toLowerCase();
    return READINESS.includes(normalized) ? normalized : "";
  }

  function rowForEnvironment(environment = {}) {
    const platform = text(environment.platformFamily, 32).toLowerCase();
    const browser = text(environment.browserFamily, 32).toLowerCase();
    if (platform === "desktop" && (browser === "chrome" || browser === "edge")) return rowDefinition("desktopChromium");
    if (platform === "desktop" && (browser === "firefox" || browser === "safari")) return rowDefinition("desktopNonChromium");
    if (platform === "android" && browser === "chrome") return rowDefinition("androidChrome");
    if (platform === "ios" && browser === "safari") return rowDefinition("iosSafari");
    if (platform === "tablet") return rowDefinition("tablet");
    if (platform === "two-device") return rowDefinition("twoDevice");
    return null;
  }

  function evidenceBoundaryErrors(evidence) {
    const expected = {
      containsMeetingContent: false,
      containsRecordIds: false,
      containsAttendeeNames: false,
      containsSignatures: false,
      containsCredentials: false,
      containsPrivateKeyMaterial: false,
      containsStorageKeys: false,
      containsStorageValues: false,
      containsProviderSecrets: false,
      containsQueuePayloads: false,
      containsTransferContents: false
    };
    const boundaries = evidence?.boundaries || {};
    return Object.entries(expected)
      .filter(([key, value]) => boundaries[key] !== value)
      .map(([key]) => `evidence-boundary:${key}`);
  }

  function normalizeReturn(input = {}) {
    const errors = [];
    const row = rowDefinition(input.rowKey);
    const normalizedCommit = commitSha(input.commitSha);
    const normalizedReadiness = readiness(input.readiness);
    const normalizedReceipt = evidenceSha256(input.evidenceSha256);
    if (!row) errors.push("return:row");
    if (!normalizedCommit) errors.push("return:commit");
    if (!normalizedReadiness) errors.push("return:readiness");
    if (!normalizedReceipt) errors.push("return:receipt");
    if (errors.length) return Object.freeze({ ok: false, errors: Object.freeze(errors), returnTarget: null });

    return Object.freeze({
      ok: true,
      errors: Object.freeze([]),
      returnTarget: Object.freeze({
        reportType: "methodz-field-rehearsal-return",
        reportVersion: VERSION,
        rowKey: row.key,
        rowLabel: row.label,
        commitSha: normalizedCommit,
        readiness: normalizedReadiness,
        evidenceSha256: normalizedReceipt,
        boundaries: Object.freeze({
          metadataOnly: true,
          reportContentsTransferred: false,
          reportDigestTransferred: true,
          meetingRecordsRead: false,
          meetingRecordsWritten: false,
          browserStorageRead: false,
          browserStorageWritten: false,
          providerCalls: false,
          githubApiCalls: false,
          synchronization: false,
          transferMutation: false,
          automaticEvidenceImport: false,
          backgroundAutomation: false
        })
      })
    });
  }

  function buildFromEvidence(evidence, launch = null, receipt = "") {
    const errors = [];
    if (!evidence || evidence.reportType !== "methodz-field-rehearsal-evidence") errors.push("evidence:type");
    if (text(evidence?.reportVersion, 32) !== "1.0.0") errors.push("evidence:version");
    const normalizedCommit = commitSha(evidence?.commitSha);
    if (!normalizedCommit) errors.push("evidence:commit");
    const normalizedReadiness = readiness(evidence?.summary?.readiness);
    if (!normalizedReadiness) errors.push("evidence:readiness");
    if (evidence?.summary?.metadataComplete !== true) errors.push("evidence:metadata-incomplete");
    const row = rowForEnvironment(evidence?.environment || {});
    if (!row) errors.push("evidence:coverage-row");
    const normalizedReceipt = evidenceSha256(receipt);
    if (!normalizedReceipt) errors.push("evidence:receipt");
    errors.push(...evidenceBoundaryErrors(evidence));

    if (launch !== null && launch !== undefined) {
      if (launch?.reportType !== "methodz-field-rehearsal-launch") errors.push("launch:type");
      if (text(launch?.reportVersion, 32) !== "1.0.0") errors.push("launch:version");
      const launchRow = rowDefinition(launch?.rowKey);
      const launchCommit = commitSha(launch?.targetCommitSha);
      if (!launchRow) errors.push("launch:row");
      if (!launchCommit) errors.push("launch:target-commit");
      if (row && launchRow && row.key !== launchRow.key) errors.push("launch:row-drift");
      if (normalizedCommit && launchCommit && normalizedCommit !== launchCommit) errors.push("launch:commit-drift");
    }

    if (errors.length) return Object.freeze({ ok: false, errors: Object.freeze(errors.slice(0, 32)), returnTarget: null });
    return normalizeReturn({ rowKey: row.key, commitSha: normalizedCommit, readiness: normalizedReadiness, evidenceSha256: normalizedReceipt });
  }

  function matchesReportMetadata(returnTarget, normalizedReport) {
    const normalized = normalizeReturn(returnTarget);
    if (!normalized.ok || !normalized.returnTarget) return Object.freeze({ ok: false, errors: normalized.errors });
    const target = normalized.returnTarget;
    const errors = [];
    const row = rowForEnvironment(normalizedReport?.environment || {});
    const reportCommit = commitSha(normalizedReport?.commitSha);
    const reportReadiness = readiness(normalizedReport?.readiness);
    if (!row || row.key !== target.rowKey) errors.push("receipt:row-drift");
    if (!reportCommit || reportCommit !== target.commitSha) errors.push("receipt:commit-drift");
    if (!reportReadiness || reportReadiness !== target.readiness) errors.push("receipt:readiness-drift");
    return Object.freeze({ ok: errors.length === 0, errors: Object.freeze(errors) });
  }

  function encodeFragment(returnTarget) {
    const normalized = normalizeReturn(returnTarget);
    if (!normalized.ok) return "";
    const payload = normalized.returnTarget;
    const pairs = [
      ["v", VERSION],
      ["row", payload.rowKey],
      ["commit", payload.commitSha],
      ["readiness", payload.readiness],
      ["receipt", payload.evidenceSha256]
    ];
    return `${PREFIX}${pairs.map(([key, value]) => `${key}:${encodeURIComponent(value)}`).join(";")}`;
  }

  function parseFragment(fragment) {
    const source = String(fragment || "");
    if (!source.startsWith(PREFIX)) return Object.freeze({ recognized: false, ok: false, errors: Object.freeze([]), returnTarget: null });
    const raw = source.slice(PREFIX.length);
    if (!raw || raw.length > 512) return Object.freeze({ recognized: true, ok: false, errors: Object.freeze(["fragment:length"]), returnTarget: null });

    const values = {};
    const errors = [];
    raw.split(";").forEach((part) => {
      const separator = part.indexOf(":");
      if (separator <= 0) {
        errors.push("fragment:pair");
        return;
      }
      const key = part.slice(0, separator);
      if (!["v", "row", "commit", "readiness", "receipt"].includes(key) || Object.prototype.hasOwnProperty.call(values, key)) {
        errors.push("fragment:key");
        return;
      }
      try {
        values[key] = decodeURIComponent(part.slice(separator + 1));
      } catch (_error) {
        errors.push("fragment:encoding");
      }
    });
    if (values.v !== VERSION) errors.push("fragment:version");
    if (Object.keys(values).length !== 5) errors.push("fragment:fields");
    if (errors.length) return Object.freeze({ recognized: true, ok: false, errors: Object.freeze(errors.slice(0, 16)), returnTarget: null });

    const normalized = normalizeReturn({
      rowKey: values.row,
      commitSha: values.commit,
      readiness: values.readiness,
      evidenceSha256: values.receipt
    });
    return Object.freeze({ recognized: true, ok: normalized.ok, errors: normalized.errors, returnTarget: normalized.returnTarget });
  }

  return Object.freeze({
    version: VERSION,
    prefix: PREFIX,
    readiness: READINESS,
    rows: ROWS,
    rowForEnvironment,
    normalizeReturn,
    buildFromEvidence,
    matchesReportMetadata,
    encodeFragment,
    parseFragment
  });
});
