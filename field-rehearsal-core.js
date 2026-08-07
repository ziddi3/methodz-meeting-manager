/* Methodz Meeting Manager portable, metadata-only Field Rehearsal Evidence core. */
(function exposeMethodzFieldRehearsalCore(root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MethodzFieldRehearsalCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createMethodzFieldRehearsalCore() {
  "use strict";

  const VERSION = "1.0.0";
  const APP_SHELL_VERSION = "1.6.12";
  const RECORD_SCHEMA_VERSION = "1.6.0";
  const RESULT_KEYS = Object.freeze([
    "panelRegistry",
    "coreMeetingWorkflow",
    "meetingDayMode",
    "offlineReload",
    "printOrPdf",
    "transferImport",
    "destinationAcceptance",
    "preImportRollback"
  ]);
  const OUTCOMES = Object.freeze(["not-run", "pass", "fail", "blocked", "not-applicable"]);
  const PLATFORM_FAMILIES = Object.freeze(["android", "ios", "tablet", "desktop", "two-device"]);
  const BROWSER_FAMILIES = Object.freeze(["chrome", "safari", "firefox", "edge", "other"]);
  const VIEWPORT_CLASSES = Object.freeze(["phone", "tablet", "desktop"]);
  const SERVICE_WORKER_MODES = Object.freeze(["https", "localhost", "direct-file"]);

  function text(value, maximum = 64) {
    return String(value ?? "").trim().slice(0, maximum);
  }

  function choice(value, allowed, fallback = "") {
    const normalized = text(value, 40).toLowerCase();
    return allowed.includes(normalized) ? normalized : fallback;
  }

  function boundedInteger(value, fallback = 0, minimum = 0, maximum = 10000000) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.min(maximum, Math.max(minimum, Math.trunc(numeric)));
  }

  function versionText(value) {
    const normalized = text(value, 32);
    return /^[0-9A-Za-z._-]*$/.test(normalized) ? normalized : "";
  }

  function commitSha(value) {
    const normalized = text(value, 40);
    return /^[0-9a-f]{7,40}$/i.test(normalized) ? normalized.toLowerCase() : "";
  }

  function issueNumbers(value) {
    const source = Array.isArray(value) ? value : String(value ?? "").split(/[\s,]+/);
    const unique = [];
    source.forEach((item) => {
      const numeric = Number(item);
      if (!Number.isInteger(numeric) || numeric < 1 || numeric > 2147483647) return;
      if (!unique.includes(numeric) && unique.length < 20) unique.push(numeric);
    });
    return unique;
  }

  function classifyViewport(width) {
    const normalized = boundedInteger(width, 0, 0, 10000);
    if (normalized <= 0) return "";
    if (normalized <= 600) return "phone";
    if (normalized <= 1024) return "tablet";
    return "desktop";
  }

  function summarizeResults(input = {}) {
    const normalized = {};
    const counts = { pass: 0, fail: 0, blocked: 0, notApplicable: 0, notRun: 0 };

    RESULT_KEYS.forEach((key) => {
      const outcome = choice(input[key], OUTCOMES, "not-run");
      normalized[key] = outcome;
      if (outcome === "pass") counts.pass += 1;
      else if (outcome === "fail") counts.fail += 1;
      else if (outcome === "blocked") counts.blocked += 1;
      else if (outcome === "not-applicable") counts.notApplicable += 1;
      else counts.notRun += 1;
    });

    let readiness = "incomplete";
    if (counts.fail > 0) readiness = "fail";
    else if (counts.blocked > 0) readiness = "blocked";
    else if (counts.pass === RESULT_KEYS.length) readiness = "ready";

    return Object.freeze({
      results: Object.freeze(normalized),
      counts: Object.freeze(counts),
      readiness,
      requiredChecks: RESULT_KEYS.length
    });
  }

  function normalizeAggregates(input = {}) {
    const fields = [
      "registeredPanels",
      "resolvedPanels",
      "registryErrors",
      "registryWarnings",
      "coreWorkflowDurationMs",
      "transferDurationMs",
      "rollbackDurationMs"
    ];
    const output = {};
    fields.forEach((key) => {
      output[key] = boundedInteger(input[key], 0, 0, key.endsWith("DurationMs") ? 86400000 : 1000000);
    });
    return Object.freeze(output);
  }

  function normalizeEnvironment(input = {}) {
    const width = boundedInteger(input.viewportWidth, 0, 0, 10000);
    const height = boundedInteger(input.viewportHeight, 0, 0, 10000);
    const explicitViewport = choice(input.viewportClass, VIEWPORT_CLASSES, "");
    return Object.freeze({
      platformFamily: choice(input.platformFamily, PLATFORM_FAMILIES, ""),
      operatingSystemVersion: versionText(input.operatingSystemVersion),
      browserFamily: choice(input.browserFamily, BROWSER_FAMILIES, ""),
      browserVersion: versionText(input.browserVersion),
      viewportClass: explicitViewport || classifyViewport(width),
      serviceWorkerMode: choice(input.serviceWorkerMode, SERVICE_WORKER_MODES, ""),
      serviceWorkerControlled: Boolean(input.serviceWorkerControlled),
      online: Boolean(input.online),
      viewportWidth: width,
      viewportHeight: height
    });
  }

  function generatedAt(value) {
    const date = value instanceof Date ? value : new Date(value || Date.now());
    return Number.isFinite(date.getTime()) ? date.toISOString() : new Date().toISOString();
  }

  function buildEvidence(input = {}, options = {}) {
    const resultSummary = summarizeResults(input.results || {});
    const environment = normalizeEnvironment(input.environment || {});
    const aggregates = normalizeAggregates(input.aggregates || {});
    const normalizedCommitSha = commitSha(input.commitSha);
    const metadataComplete = Boolean(
      normalizedCommitSha &&
      environment.platformFamily &&
      environment.operatingSystemVersion &&
      environment.browserFamily &&
      environment.browserVersion &&
      environment.viewportClass &&
      environment.serviceWorkerMode
    );
    const readiness = resultSummary.readiness === "ready" && !metadataComplete ? "incomplete" : resultSummary.readiness;

    return Object.freeze({
      reportType: "methodz-field-rehearsal-evidence",
      reportVersion: VERSION,
      appShellVersion: APP_SHELL_VERSION,
      recordSchemaVersion: RECORD_SCHEMA_VERSION,
      generatedAt: generatedAt(options.now),
      commitSha: normalizedCommitSha,
      environment,
      results: resultSummary.results,
      summary: Object.freeze({
        readiness,
        metadataComplete,
        requiredChecks: resultSummary.requiredChecks,
        pass: resultSummary.counts.pass,
        fail: resultSummary.counts.fail,
        blocked: resultSummary.counts.blocked,
        notApplicable: resultSummary.counts.notApplicable,
        notRun: resultSummary.counts.notRun
      }),
      aggregates,
      blockingIssues: Object.freeze(issueNumbers(input.blockingIssues)),
      boundaries: Object.freeze({
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
      })
    });
  }

  return Object.freeze({
    version: VERSION,
    appShellVersion: APP_SHELL_VERSION,
    recordSchemaVersion: RECORD_SCHEMA_VERSION,
    resultKeys: RESULT_KEYS,
    outcomes: OUTCOMES,
    classifyViewport,
    summarizeResults,
    buildEvidence
  });
});
