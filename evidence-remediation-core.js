/* Methodz Meeting Manager portable, metadata-only Field Evidence Remediation core. */
(function exposeMethodzEvidenceRemediationCore(root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MethodzEvidenceRemediationCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createMethodzEvidenceRemediationCore() {
  "use strict";

  const VERSION = "1.0.0";
  const SOURCE_REPORT_VERSION = "1.0.0";
  const SOURCE_REPORT_TYPES = Object.freeze([
    "methodz-field-evidence-coverage",
    "methodz-field-evidence-coverage-summary"
  ]);
  const MAX_ITEMS = 6;
  const ROWS = Object.freeze([
    Object.freeze({ key: "desktopChromium", label: "Desktop Chromium" }),
    Object.freeze({ key: "desktopNonChromium", label: "Desktop non-Chromium" }),
    Object.freeze({ key: "androidChrome", label: "Android Chrome" }),
    Object.freeze({ key: "iosSafari", label: "iOS Safari" }),
    Object.freeze({ key: "tablet", label: "Tablet" }),
    Object.freeze({ key: "twoDevice", label: "Two-device" })
  ]);
  const STATES = Object.freeze(["ready", "fail", "blocked", "incomplete", "missing"]);
  const COVERAGE_STATUSES = Object.freeze(["coverage-complete", "coverage-incomplete", "no-evidence"]);
  const ACTIONS = Object.freeze({
    fail: Object.freeze({
      actionType: "code-remediation",
      priority: 1,
      nextAction: "Reproduce the failed row, isolate the smallest code or configuration cause, fix it, then rerun this row on the new commit."
    }),
    blocked: Object.freeze({
      actionType: "environment-remediation",
      priority: 2,
      nextAction: "Resolve the documented blocking condition or linked issue, then rerun this row on the same commit if code did not change."
    }),
    incomplete: Object.freeze({
      actionType: "evidence-completion",
      priority: 3,
      nextAction: "Complete the required rehearsal checks and capture a new Field Rehearsal report for this exact commit."
    }),
    missing: Object.freeze({
      actionType: "evidence-collection",
      priority: 4,
      nextAction: "Run the documented physical-device rehearsal for this row and capture evidence for this exact commit."
    })
  });

  const text = (value, maximum = 160) => String(value ?? "").trim().slice(0, maximum);

  function commitSha(value) {
    const normalized = text(value, 40).toLowerCase();
    return /^[0-9a-f]{7,40}$/.test(normalized) ? normalized : "";
  }

  function choice(value, allowed) {
    const normalized = text(value, 64).toLowerCase();
    return allowed.includes(normalized) ? normalized : "";
  }

  function isoTimestamp(value) {
    if (!value) return "";
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
    return Object.freeze(unique.sort((left, right) => left - right));
  }

  function boundariesValid(source) {
    const boundaries = source && typeof source === "object" ? source.boundaries : null;
    if (!boundaries || typeof boundaries !== "object") return false;
    return boundaries.metadataOnly === true &&
      boundaries.importedReportsPersisted === false &&
      boundaries.meetingContentIncluded === false &&
      boundaries.recordIdentifiersIncluded === false &&
      boundaries.attendeeNamesIncluded === false &&
      boundaries.storageKeyNamesIncluded === false &&
      boundaries.storageValuesIncluded === false &&
      boundaries.credentialsIncluded === false &&
      boundaries.privateKeysIncluded === false &&
      boundaries.signaturesIncluded === false &&
      boundaries.queuePayloadsIncluded === false &&
      boundaries.transferContentsIncluded === false &&
      boundaries.browserStorageRead === false &&
      boundaries.browserStorageWritten === false &&
      boundaries.providerCalls === false &&
      boundaries.synchronization === false;
  }

  function normalizeCoverage(source) {
    if (!source || typeof source !== "object" || Array.isArray(source)) {
      return Object.freeze({ ok: false, errors: Object.freeze(["coverage:not-object"]), coverage: null });
    }

    const errors = [];
    const reportType = SOURCE_REPORT_TYPES.includes(source.reportType) ? source.reportType : "";
    const reportVersion = text(source.reportVersion, 32);
    const normalizedCommit = commitSha(source.commitSha);
    const status = choice(source.status, COVERAGE_STATUSES);
    if (!reportType) errors.push("coverage:type");
    if (reportVersion !== SOURCE_REPORT_VERSION) errors.push("coverage:version");
    if (!normalizedCommit) errors.push("coverage:commit-sha");
    if (!status) errors.push("coverage:status");
    if (!boundariesValid(source)) errors.push("coverage:boundaries");

    const sourceRows = Array.isArray(source.rows) ? source.rows : [];
    const seen = new Set();
    const rows = [];
    for (const definition of ROWS) {
      const candidate = sourceRows.find((row) => row && row.key === definition.key);
      if (!candidate) {
        errors.push(`row:${definition.key}:missing`);
        continue;
      }
      if (seen.has(definition.key)) continue;
      seen.add(definition.key);
      const state = choice(candidate.state, STATES);
      const evidenceCount = boundedInteger(candidate.evidenceCount, 0, 1000000);
      if (!state) errors.push(`row:${definition.key}:state`);
      if (evidenceCount === null) errors.push(`row:${definition.key}:evidence-count`);
      rows.push(Object.freeze({
        key: definition.key,
        label: definition.label,
        state: state || "missing",
        evidenceCount: evidenceCount === null ? 0 : evidenceCount,
        latestGeneratedAt: isoTimestamp(candidate.latestGeneratedAt),
        browserFamily: text(candidate.browserFamily, 32).toLowerCase(),
        platformFamily: text(candidate.platformFamily, 32).toLowerCase(),
        blockingIssues: issueNumbers(candidate.blockingIssues)
      }));
    }

    if (sourceRows.length !== ROWS.length) errors.push("coverage:row-count");
    if (errors.length) {
      return Object.freeze({ ok: false, errors: Object.freeze(errors.slice(0, 32)), coverage: null });
    }

    return Object.freeze({
      ok: true,
      errors: Object.freeze([]),
      coverage: Object.freeze({
        reportType,
        reportVersion,
        commitSha: normalizedCommit,
        status,
        rows: Object.freeze(rows)
      })
    });
  }

  function buildWorklist(source) {
    const normalized = normalizeCoverage(source);
    if (!normalized.ok) {
      return Object.freeze({ ok: false, errors: normalized.errors, worklist: null });
    }

    const coverage = normalized.coverage;
    const items = coverage.rows
      .filter((row) => row.state !== "ready")
      .map((row) => {
        const action = ACTIONS[row.state];
        return Object.freeze({
          rowKey: row.key,
          rowLabel: row.label,
          state: row.state,
          actionType: action.actionType,
          priority: action.priority,
          nextAction: action.nextAction,
          evidenceCount: row.evidenceCount,
          latestGeneratedAt: row.latestGeneratedAt,
          platformFamily: row.platformFamily,
          browserFamily: row.browserFamily,
          blockingIssues: row.blockingIssues
        });
      })
      .sort((left, right) => left.priority - right.priority || left.rowLabel.localeCompare(right.rowLabel))
      .slice(0, MAX_ITEMS);

    const counts = {
      codeRemediation: 0,
      environmentRemediation: 0,
      evidenceCompletion: 0,
      evidenceCollection: 0
    };
    items.forEach((item) => {
      if (item.actionType === "code-remediation") counts.codeRemediation += 1;
      else if (item.actionType === "environment-remediation") counts.environmentRemediation += 1;
      else if (item.actionType === "evidence-completion") counts.evidenceCompletion += 1;
      else if (item.actionType === "evidence-collection") counts.evidenceCollection += 1;
    });

    const status = coverage.status === "no-evidence"
      ? "no-evidence"
      : items.length === 0
        ? "no-remediation-needed"
        : "remediation-needed";

    return Object.freeze({
      ok: true,
      errors: Object.freeze([]),
      worklist: Object.freeze({
        reportType: "methodz-field-evidence-remediation-worklist",
        reportVersion: VERSION,
        sourceReportType: coverage.reportType,
        sourceReportVersion: coverage.reportVersion,
        commitSha: coverage.commitSha,
        status,
        itemCount: items.length,
        counts: Object.freeze(counts),
        items: Object.freeze(items),
        boundaries: worklistBoundaries()
      })
    });
  }

  function shortSha(value) {
    return commitSha(value).slice(0, 12);
  }

  function buildIssueDraft(worklist, itemIndex) {
    const index = boundedInteger(itemIndex, 0, MAX_ITEMS - 1);
    if (!worklist || worklist.reportType !== "methodz-field-evidence-remediation-worklist" || index === null) return null;
    const item = worklist.items?.[index];
    if (!item) return null;

    const linkedIssues = item.blockingIssues.length
      ? item.blockingIssues.map((number) => `#${number}`).join(", ")
      : "None recorded in the latest same-commit evidence.";
    const latest = item.latestGeneratedAt || "No accepted rehearsal timestamp for this row.";
    const environment = [item.platformFamily, item.browserFamily].filter(Boolean).join(" / ") || "Not established by current row metadata.";
    const title = `[Field Evidence] ${item.rowLabel}: ${item.state} on ${shortSha(worklist.commitSha)}`;
    const body = [
      "## Evidence source",
      "",
      `- Commit: \`${worklist.commitSha}\``,
      `- Coverage row: **${item.rowLabel}**`,
      `- Latest state: **${item.state}**`,
      `- Work type: \`${item.actionType}\``,
      `- Accepted evidence count for row: ${item.evidenceCount}`,
      `- Latest accepted evidence: ${latest}`,
      `- Environment: ${environment}`,
      `- Existing blocking issue references: ${linkedIssues}`,
      "",
      "## Next action",
      "",
      item.nextAction,
      "",
      "## Acceptance criteria",
      "",
      "- [ ] Address only the cause or evidence gap represented by this same-commit row.",
      "- [ ] Preserve static deployment and the browser-local default meeting-record provider.",
      "- [ ] Do not introduce automatic meeting mutation, background synchronization, or production-provider behavior.",
      "- [ ] If code changes, capture replacement Field Rehearsal evidence against the new commit instead of carrying this result forward.",
      "- [ ] If no code changes, rerun the affected physical-device row against this exact commit after the blocking or evidence condition is resolved.",
      "",
      "## Evidence boundary",
      "",
      "This draft is derived from metadata-only Field Evidence Coverage. It does not prove that a software defect exists, identify a device operator, or establish production readiness, authorization, delivery, legal approval, or regulatory compliance."
    ].join("\n");

    return Object.freeze({ title, body });
  }

  function buildIssueDraftBundle(worklist) {
    if (!worklist || worklist.reportType !== "methodz-field-evidence-remediation-worklist") return "";
    if (!Array.isArray(worklist.items) || worklist.items.length === 0) {
      return `# Field Evidence Remediation Drafts\n\nCommit: \`${worklist.commitSha || "unknown"}\`\n\nNo remediation drafts are required by the current worklist.\n`;
    }
    const sections = worklist.items.map((item, index) => {
      const draft = buildIssueDraft(worklist, index);
      return `# ${draft.title}\n\n${draft.body}`;
    });
    return `${sections.join("\n\n---\n\n")}\n`;
  }

  function worklistBoundaries() {
    return Object.freeze({
      metadataOnly: true,
      importedEvidencePersisted: false,
      meetingRecordsRead: false,
      meetingRecordsWritten: false,
      browserStorageRead: false,
      browserStorageWritten: false,
      providerCalls: false,
      githubApiCalls: false,
      issuesCreated: false,
      synchronization: false,
      transferMutation: false,
      provesSoftwareDefect: false,
      provesProductionReadiness: false,
      provesDeviceIdentity: false,
      provesAuthorization: false,
      provesDelivery: false,
      provesLegalApproval: false
    });
  }

  function buildWorklistSummary(worklist, options = {}) {
    if (!worklist || worklist.reportType !== "methodz-field-evidence-remediation-worklist") return null;
    const generatedAt = isoTimestamp(options.now || Date.now()) || new Date().toISOString();
    return Object.freeze({
      reportType: "methodz-field-evidence-remediation-summary",
      reportVersion: VERSION,
      generatedAt,
      sourceReportType: worklist.sourceReportType,
      sourceReportVersion: worklist.sourceReportVersion,
      commitSha: worklist.commitSha,
      status: worklist.status,
      itemCount: worklist.itemCount,
      counts: worklist.counts,
      items: worklist.items,
      boundaries: worklistBoundaries()
    });
  }

  return Object.freeze({
    version: VERSION,
    sourceReportVersion: SOURCE_REPORT_VERSION,
    sourceReportTypes: SOURCE_REPORT_TYPES,
    maxItems: MAX_ITEMS,
    rows: ROWS,
    normalizeCoverage,
    buildWorklist,
    buildIssueDraft,
    buildIssueDraftBundle,
    buildWorklistSummary
  });
});
