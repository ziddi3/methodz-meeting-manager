/* Methodz Meeting Manager portable, metadata-only Field Evidence Coverage core. */
(function exposeMethodzEvidenceCoverageCore(root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MethodzEvidenceCoverageCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createMethodzEvidenceCoverageCore() {
  "use strict";

  const VERSION = "1.0.0";
  const SOURCE_REPORT_TYPE = "methodz-field-rehearsal-evidence";
  const SOURCE_REPORT_VERSION = "1.0.0";
  const MAX_REPORTS = 50;
  const READINESS = Object.freeze(["ready", "fail", "blocked", "incomplete"]);
  const PLATFORMS = Object.freeze(["android", "ios", "tablet", "desktop", "two-device"]);
  const BROWSERS = Object.freeze(["chrome", "safari", "firefox", "edge", "other"]);
  const VIEWPORTS = Object.freeze(["phone", "tablet", "desktop"]);
  const SERVICE_WORKER_MODES = Object.freeze(["https", "localhost", "direct-file"]);
  const COVERAGE_ROWS = Object.freeze([
    Object.freeze({ key: "desktopChromium", label: "Desktop Chromium" }),
    Object.freeze({ key: "desktopNonChromium", label: "Desktop non-Chromium" }),
    Object.freeze({ key: "androidChrome", label: "Android Chrome" }),
    Object.freeze({ key: "iosSafari", label: "iOS Safari" }),
    Object.freeze({ key: "tablet", label: "Tablet" }),
    Object.freeze({ key: "twoDevice", label: "Two-device" })
  ]);

  const text = (value, maximum = 64) => String(value ?? "").trim().slice(0, maximum);

  function choice(value, allowed) {
    const normalized = text(value, 40).toLowerCase();
    return allowed.includes(normalized) ? normalized : "";
  }

  function versionText(value) {
    const normalized = text(value, 32);
    return /^[0-9A-Za-z._-]+$/.test(normalized) ? normalized : "";
  }

  function commitSha(value) {
    const normalized = text(value, 40).toLowerCase();
    return /^[0-9a-f]{7,40}$/.test(normalized) ? normalized : "";
  }

  function isoTimestamp(value) {
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date.toISOString() : "";
  }

  function boundedInteger(value, minimum, maximum) {
    const numeric = Number(value);
    if (!Number.isSafeInteger(numeric) || numeric < minimum || numeric > maximum) return null;
    return numeric;
  }

  function issueNumbers(value) {
    const source = Array.isArray(value) ? value : [];
    const unique = [];
    source.forEach((entry) => {
      const numeric = boundedInteger(entry, 1, 2147483647);
      if (numeric !== null && !unique.includes(numeric) && unique.length < 20) unique.push(numeric);
    });
    return Object.freeze(unique);
  }

  function validateBoundaries(report) {
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
      containsTransferContents: false,
      provesDeviceIdentity: false,
      provesDelivery: false,
      provesAuthorization: false,
      provesLegalApproval: false
    };
    const boundaries = report?.boundaries || {};
    return Object.entries(expected)
      .filter(([key, value]) => boundaries[key] !== value)
      .map(([key]) => `boundary:${key}`);
  }

  function validateAndNormalizeReport(report) {
    const source = report && typeof report === "object" && !Array.isArray(report) ? report : null;
    if (!source) return Object.freeze({ ok: false, errors: Object.freeze(["report:not-object"]), report: null });

    const errors = [];
    if (source.reportType !== SOURCE_REPORT_TYPE) errors.push("report:type");
    if (source.reportVersion !== SOURCE_REPORT_VERSION) errors.push("report:version");

    const generatedAt = isoTimestamp(source.generatedAt);
    const normalizedCommit = commitSha(source.commitSha);
    const appShellVersion = versionText(source.appShellVersion);
    const recordSchemaVersion = versionText(source.recordSchemaVersion);
    if (!generatedAt) errors.push("report:generated-at");
    if (!normalizedCommit) errors.push("report:commit-sha");
    if (!appShellVersion) errors.push("report:app-shell-version");
    if (!recordSchemaVersion) errors.push("report:record-schema-version");

    const environment = source.environment && typeof source.environment === "object" ? source.environment : {};
    const platformFamily = choice(environment.platformFamily, PLATFORMS);
    const browserFamily = choice(environment.browserFamily, BROWSERS);
    const viewportClass = choice(environment.viewportClass, VIEWPORTS);
    const serviceWorkerMode = choice(environment.serviceWorkerMode, SERVICE_WORKER_MODES);
    const operatingSystemVersion = versionText(environment.operatingSystemVersion);
    const browserVersion = versionText(environment.browserVersion);
    const viewportWidth = boundedInteger(environment.viewportWidth, 1, 10000);
    const viewportHeight = boundedInteger(environment.viewportHeight, 1, 10000);
    if (!platformFamily) errors.push("environment:platform-family");
    if (!browserFamily) errors.push("environment:browser-family");
    if (!viewportClass) errors.push("environment:viewport-class");
    if (!serviceWorkerMode) errors.push("environment:service-worker-mode");
    if (!operatingSystemVersion) errors.push("environment:os-version");
    if (!browserVersion) errors.push("environment:browser-version");
    if (viewportWidth === null) errors.push("environment:viewport-width");
    if (viewportHeight === null) errors.push("environment:viewport-height");

    const summary = source.summary && typeof source.summary === "object" ? source.summary : {};
    const readiness = choice(summary.readiness, READINESS);
    if (!readiness) errors.push("summary:readiness");
    if (summary.metadataComplete !== true) errors.push("summary:metadata-incomplete");

    errors.push(...validateBoundaries(source));
    if (errors.length) {
      return Object.freeze({ ok: false, errors: Object.freeze(errors.slice(0, 32)), report: null });
    }

    return Object.freeze({
      ok: true,
      errors: Object.freeze([]),
      report: Object.freeze({
        generatedAt,
        commitSha: normalizedCommit,
        appShellVersion,
        recordSchemaVersion,
        environment: Object.freeze({
          platformFamily,
          operatingSystemVersion,
          browserFamily,
          browserVersion,
          viewportClass,
          serviceWorkerMode,
          serviceWorkerControlled: Boolean(environment.serviceWorkerControlled),
          online: Boolean(environment.online),
          viewportWidth,
          viewportHeight
        }),
        readiness,
        blockingIssues: issueNumbers(source.blockingIssues)
      })
    });
  }

  function rowKeyFor(report) {
    const platform = report?.environment?.platformFamily;
    const browser = report?.environment?.browserFamily;
    if (platform === "desktop" && (browser === "chrome" || browser === "edge")) return "desktopChromium";
    if (platform === "desktop" && (browser === "firefox" || browser === "safari")) return "desktopNonChromium";
    if (platform === "android" && browser === "chrome") return "androidChrome";
    if (platform === "ios" && browser === "safari") return "iosSafari";
    if (platform === "tablet") return "tablet";
    if (platform === "two-device") return "twoDevice";
    return "";
  }

  function listCommits(reports) {
    const source = Array.isArray(reports) ? reports.slice(0, MAX_REPORTS) : [];
    const map = new Map();
    source.forEach((report) => {
      const sha = commitSha(report?.commitSha);
      const generatedAt = isoTimestamp(report?.generatedAt);
      if (!sha || !generatedAt) return;
      const existing = map.get(sha) || { commitSha: sha, reportCount: 0, latestGeneratedAt: "" };
      existing.reportCount += 1;
      if (!existing.latestGeneratedAt || generatedAt > existing.latestGeneratedAt) existing.latestGeneratedAt = generatedAt;
      map.set(sha, existing);
    });
    return Object.freeze(Array.from(map.values())
      .sort((left, right) => right.latestGeneratedAt.localeCompare(left.latestGeneratedAt))
      .map((entry) => Object.freeze({ ...entry })));
  }

  function buildCoverage(reports, selectedCommitSha) {
    const selected = commitSha(selectedCommitSha);
    const source = Array.isArray(reports) ? reports.slice(0, MAX_REPORTS) : [];
    const sameCommit = selected ? source.filter((report) => commitSha(report?.commitSha) === selected) : [];
    const referencedIssues = [];

    const rows = COVERAGE_ROWS.map((definition) => {
      const matches = sameCommit
        .filter((report) => rowKeyFor(report) === definition.key && isoTimestamp(report?.generatedAt))
        .sort((left, right) => isoTimestamp(left.generatedAt).localeCompare(isoTimestamp(right.generatedAt)));
      const latest = matches[matches.length - 1] || null;
      matches.forEach((report) => {
        (Array.isArray(report.blockingIssues) ? report.blockingIssues : []).forEach((issue) => {
          const numeric = boundedInteger(issue, 1, 2147483647);
          if (numeric !== null && !referencedIssues.includes(numeric) && referencedIssues.length < 50) referencedIssues.push(numeric);
        });
      });
      return Object.freeze({
        key: definition.key,
        label: definition.label,
        state: latest ? choice(latest.readiness, READINESS) || "incomplete" : "missing",
        evidenceCount: matches.length,
        latestGeneratedAt: latest ? isoTimestamp(latest.generatedAt) : "",
        platformFamily: latest?.environment?.platformFamily || "",
        browserFamily: latest?.environment?.browserFamily || "",
        blockingIssues: latest ? issueNumbers(latest.blockingIssues) : Object.freeze([])
      });
    });

    const counts = { ready: 0, fail: 0, blocked: 0, incomplete: 0, missing: 0 };
    rows.forEach((row) => { counts[row.state] += 1; });
    const status = !selected || sameCommit.length === 0
      ? "no-evidence"
      : counts.ready === COVERAGE_ROWS.length
        ? "coverage-complete"
        : "coverage-incomplete";

    return Object.freeze({
      reportType: "methodz-field-evidence-coverage",
      reportVersion: VERSION,
      commitSha: selected,
      status,
      sourceReportCount: sameCommit.length,
      rowCount: COVERAGE_ROWS.length,
      counts: Object.freeze(counts),
      rows: Object.freeze(rows),
      referencedIssues: Object.freeze(referencedIssues.sort((a, b) => a - b)),
      boundaries: coverageBoundaries()
    });
  }

  function coverageBoundaries() {
    return Object.freeze({
      metadataOnly: true,
      importedReportsPersisted: false,
      meetingContentIncluded: false,
      recordIdentifiersIncluded: false,
      attendeeNamesIncluded: false,
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
      synchronization: false,
      provesProductionReadiness: false,
      provesDeviceIdentity: false,
      provesAuthorization: false,
      provesDelivery: false,
      provesLegalApproval: false
    });
  }

  function buildCoverageSummary(coverage, options = {}) {
    const safe = coverage && coverage.reportType === "methodz-field-evidence-coverage"
      ? coverage
      : buildCoverage([], "");
    const generatedAt = isoTimestamp(options.now || Date.now()) || new Date().toISOString();
    return Object.freeze({
      reportType: "methodz-field-evidence-coverage-summary",
      reportVersion: VERSION,
      generatedAt,
      commitSha: safe.commitSha,
      status: safe.status,
      sourceReportCount: safe.sourceReportCount,
      rowCount: safe.rowCount,
      counts: safe.counts,
      rows: safe.rows,
      referencedIssues: safe.referencedIssues,
      boundaries: coverageBoundaries()
    });
  }

  return Object.freeze({
    version: VERSION,
    sourceReportType: SOURCE_REPORT_TYPE,
    sourceReportVersion: SOURCE_REPORT_VERSION,
    maxReports: MAX_REPORTS,
    coverageRows: COVERAGE_ROWS,
    validateAndNormalizeReport,
    listCommits,
    buildCoverage,
    buildCoverageSummary
  });
});
