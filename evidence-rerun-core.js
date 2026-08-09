/* Methodz Meeting Manager portable, metadata-only Field Evidence Rerun Plan core. */
(function exposeMethodzEvidenceRerunCore(root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MethodzEvidenceRerunCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createMethodzEvidenceRerunCore() {
  "use strict";

  const VERSION = "1.0.0";
  const SOURCE_VERSION = "1.0.0";
  const MAX_ROWS = 6;
  const COVERAGE_TYPES = Object.freeze([
    "methodz-field-evidence-coverage",
    "methodz-field-evidence-coverage-summary"
  ]);
  const WORKLIST_TYPES = Object.freeze([
    "methodz-field-evidence-remediation-worklist",
    "methodz-field-evidence-remediation-summary"
  ]);
  const COVERAGE_STATUSES = Object.freeze(["coverage-complete", "coverage-incomplete", "no-evidence"]);
  const WORKLIST_STATUSES = Object.freeze(["no-evidence", "no-remediation-needed", "remediation-needed"]);
  const STATES = Object.freeze(["ready", "fail", "blocked", "incomplete", "missing"]);
  const ACTION_TYPES = Object.freeze([
    "code-remediation",
    "environment-remediation",
    "evidence-completion",
    "evidence-collection"
  ]);
  const ROWS = Object.freeze([
    Object.freeze({ key: "desktopChromium", label: "Desktop Chromium" }),
    Object.freeze({ key: "desktopNonChromium", label: "Desktop non-Chromium" }),
    Object.freeze({ key: "androidChrome", label: "Android Chrome" }),
    Object.freeze({ key: "iosSafari", label: "iOS Safari" }),
    Object.freeze({ key: "tablet", label: "Tablet" }),
    Object.freeze({ key: "twoDevice", label: "Two-device" })
  ]);
  const EXPECTED_ACTION = Object.freeze({
    fail: "code-remediation",
    blocked: "environment-remediation",
    incomplete: "evidence-completion",
    missing: "evidence-collection"
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

  function boundedInteger(value, minimum, maximum) {
    const numeric = Number(value);
    if (!Number.isSafeInteger(numeric) || numeric < minimum || numeric > maximum) return null;
    return numeric;
  }

  function isoTimestamp(value) {
    if (!value) return "";
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date.toISOString() : "";
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

  function coverageBoundariesValid(source) {
    const boundaries = source?.boundaries;
    return Boolean(boundaries && typeof boundaries === "object" &&
      boundaries.metadataOnly === true &&
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
      boundaries.synchronization === false);
  }

  function worklistBoundariesValid(source) {
    const boundaries = source?.boundaries;
    return Boolean(boundaries && typeof boundaries === "object" &&
      boundaries.metadataOnly === true &&
      boundaries.importedEvidencePersisted === false &&
      boundaries.meetingRecordsRead === false &&
      boundaries.meetingRecordsWritten === false &&
      boundaries.browserStorageRead === false &&
      boundaries.browserStorageWritten === false &&
      boundaries.providerCalls === false &&
      boundaries.githubApiCalls === false &&
      boundaries.issuesCreated === false &&
      boundaries.synchronization === false &&
      boundaries.transferMutation === false);
  }

  function normalizeCoverage(source) {
    if (!source || typeof source !== "object" || Array.isArray(source)) {
      return Object.freeze({ ok: false, errors: Object.freeze(["coverage:not-object"]), coverage: null });
    }
    const errors = [];
    const reportType = COVERAGE_TYPES.includes(source.reportType) ? source.reportType : "";
    const reportVersion = text(source.reportVersion, 32);
    const normalizedCommit = commitSha(source.commitSha);
    const status = choice(source.status, COVERAGE_STATUSES);
    if (!reportType) errors.push("coverage:type");
    if (reportVersion !== SOURCE_VERSION) errors.push("coverage:version");
    if (!normalizedCommit) errors.push("coverage:commit-sha");
    if (!status) errors.push("coverage:status");
    if (!coverageBoundariesValid(source)) errors.push("coverage:boundaries");

    const sourceRows = Array.isArray(source.rows) ? source.rows : [];
    if (sourceRows.length !== ROWS.length) errors.push("coverage:row-count");
    const rows = [];
    const seen = new Set();
    ROWS.forEach((definition) => {
      const candidate = sourceRows.find((row) => row && row.key === definition.key);
      if (!candidate) {
        errors.push(`coverage-row:${definition.key}:missing`);
        return;
      }
      if (seen.has(definition.key)) {
        errors.push(`coverage-row:${definition.key}:duplicate`);
        return;
      }
      seen.add(definition.key);
      const state = choice(candidate.state, STATES);
      const evidenceCount = boundedInteger(candidate.evidenceCount, 0, 1000000);
      if (!state) errors.push(`coverage-row:${definition.key}:state`);
      if (evidenceCount === null) errors.push(`coverage-row:${definition.key}:evidence-count`);
      rows.push(Object.freeze({
        key: definition.key,
        label: definition.label,
        state: state || "missing",
        evidenceCount: evidenceCount === null ? 0 : evidenceCount,
        latestGeneratedAt: isoTimestamp(candidate.latestGeneratedAt),
        blockingIssues: issueNumbers(candidate.blockingIssues)
      }));
    });

    if (errors.length) return Object.freeze({ ok: false, errors: Object.freeze(errors.slice(0, 32)), coverage: null });
    return Object.freeze({
      ok: true,
      errors: Object.freeze([]),
      coverage: Object.freeze({ reportType, reportVersion, commitSha: normalizedCommit, status, rows: Object.freeze(rows) })
    });
  }

  function normalizeWorklist(source) {
    if (!source || typeof source !== "object" || Array.isArray(source)) {
      return Object.freeze({ ok: false, errors: Object.freeze(["worklist:not-object"]), worklist: null });
    }
    const errors = [];
    const reportType = WORKLIST_TYPES.includes(source.reportType) ? source.reportType : "";
    const reportVersion = text(source.reportVersion, 32);
    const normalizedCommit = commitSha(source.commitSha);
    const status = choice(source.status, WORKLIST_STATUSES);
    const itemCount = boundedInteger(source.itemCount, 0, MAX_ROWS);
    if (!reportType) errors.push("worklist:type");
    if (reportVersion !== SOURCE_VERSION) errors.push("worklist:version");
    if (!normalizedCommit) errors.push("worklist:commit-sha");
    if (!status) errors.push("worklist:status");
    if (itemCount === null) errors.push("worklist:item-count");
    if (!worklistBoundariesValid(source)) errors.push("worklist:boundaries");

    const sourceItems = Array.isArray(source.items) ? source.items : [];
    if (itemCount !== null && sourceItems.length !== itemCount) errors.push("worklist:item-count-mismatch");
    if (sourceItems.length > MAX_ROWS) errors.push("worklist:too-many-items");
    const seen = new Set();
    const items = [];
    sourceItems.slice(0, MAX_ROWS).forEach((candidate) => {
      const row = ROWS.find((definition) => definition.key === candidate?.rowKey);
      const state = choice(candidate?.state, STATES);
      const actionType = choice(candidate?.actionType, ACTION_TYPES);
      const priority = boundedInteger(candidate?.priority, 1, 4);
      if (!row) errors.push("worklist:item-row");
      if (row && seen.has(row.key)) errors.push(`worklist:${row.key}:duplicate`);
      if (row) seen.add(row.key);
      if (!state || state === "ready") errors.push(`worklist:${row?.key || "unknown"}:state`);
      if (!actionType) errors.push(`worklist:${row?.key || "unknown"}:action-type`);
      if (state && EXPECTED_ACTION[state] !== actionType) errors.push(`worklist:${row?.key || "unknown"}:action-mismatch`);
      if (priority === null) errors.push(`worklist:${row?.key || "unknown"}:priority`);
      items.push(Object.freeze({
        rowKey: row?.key || "",
        rowLabel: row?.label || "",
        state: state || "missing",
        actionType: actionType || "evidence-collection",
        priority: priority === null ? 4 : priority,
        blockingIssues: issueNumbers(candidate?.blockingIssues)
      }));
    });

    if (errors.length) return Object.freeze({ ok: false, errors: Object.freeze(errors.slice(0, 32)), worklist: null });
    return Object.freeze({
      ok: true,
      errors: Object.freeze([]),
      worklist: Object.freeze({ reportType, reportVersion, commitSha: normalizedCommit, status, itemCount, items: Object.freeze(items) })
    });
  }

  function validatePair(coverageSource, worklistSource) {
    const coverageResult = normalizeCoverage(coverageSource);
    const worklistResult = normalizeWorklist(worklistSource);
    const errors = [];
    if (!coverageResult.ok) errors.push(...coverageResult.errors);
    if (!worklistResult.ok) errors.push(...worklistResult.errors);
    if (coverageResult.ok && worklistResult.ok) {
      const coverage = coverageResult.coverage;
      const worklist = worklistResult.worklist;
      if (coverage.commitSha !== worklist.commitSha) errors.push("pair:commit-mismatch");
      const unresolved = coverage.rows.filter((row) => row.state !== "ready");
      if (unresolved.length !== worklist.items.length) errors.push("pair:unresolved-count-mismatch");
      worklist.items.forEach((item) => {
        const row = coverage.rows.find((candidate) => candidate.key === item.rowKey);
        if (!row) errors.push(`pair:${item.rowKey}:missing-coverage-row`);
        else if (row.state !== item.state) errors.push(`pair:${item.rowKey}:state-mismatch`);
      });
    }
    if (errors.length) return Object.freeze({ ok: false, errors: Object.freeze(errors.slice(0, 32)), coverage: null, worklist: null });
    return Object.freeze({ ok: true, errors: Object.freeze([]), coverage: coverageResult.coverage, worklist: worklistResult.worklist });
  }

  function planBoundaries() {
    return Object.freeze({
      metadataOnly: true,
      sourceEvidencePersisted: false,
      meetingRecordsRead: false,
      meetingRecordsWritten: false,
      browserStorageRead: false,
      browserStorageWritten: false,
      providerCalls: false,
      githubApiCalls: false,
      issuesCreated: false,
      synchronization: false,
      transferMutation: false,
      backgroundAutomation: false,
      provesProductionReadiness: false,
      provesDeviceIdentity: false,
      provesAuthorization: false,
      provesDelivery: false,
      provesLegalApproval: false
    });
  }

  function newCommitItem(row) {
    const mapping = {
      ready: ["revalidate-on-new-commit", "Prior evidence belongs to the source commit and cannot establish coverage for changed code."],
      fail: ["fix-and-rerun-on-new-commit", "Resolve the code-remediation cause first, then capture replacement evidence on the resulting commit."],
      blocked: ["resolve-blocker-and-rerun-on-new-commit", "A code change is already required elsewhere, so resolve the blocker and collect this row on the resulting commit."],
      incomplete: ["complete-rehearsal-on-new-commit", "A code change is already required elsewhere, so complete this row against the resulting commit rather than the obsolete source commit."],
      missing: ["collect-evidence-on-new-commit", "A code change is already required elsewhere, so collect this row against the resulting commit rather than the obsolete source commit."]
    };
    return Object.freeze({
      rowKey: row.key,
      rowLabel: row.label,
      sourceState: row.state,
      action: mapping[row.state][0],
      commitPolicy: "new-commit-required",
      reason: mapping[row.state][1],
      blockingIssues: row.blockingIssues
    });
  }

  function sameCommitItem(item) {
    const mapping = {
      blocked: ["resolve-blocker-and-rerun", "same-commit-if-no-code-change", "Resolve the environment blocker and rerun this row against the same commit only if no code changed."],
      incomplete: ["complete-rehearsal", "same-commit-required", "Complete the documented rehearsal checks and capture replacement evidence for this exact commit."],
      missing: ["collect-evidence", "same-commit-required", "Run the documented rehearsal and capture evidence for this exact commit."]
    };
    const entry = mapping[item.state];
    return Object.freeze({
      rowKey: item.rowKey,
      rowLabel: item.rowLabel,
      sourceState: item.state,
      action: entry[0],
      commitPolicy: entry[1],
      reason: entry[2],
      blockingIssues: item.blockingIssues
    });
  }

  function buildPlan(coverageSource, worklistSource) {
    const pair = validatePair(coverageSource, worklistSource);
    if (!pair.ok) return Object.freeze({ ok: false, errors: pair.errors, plan: null });
    const coverage = pair.coverage;
    const worklist = pair.worklist;
    const hasCodeRemediation = worklist.items.some((item) => item.actionType === "code-remediation");

    let status = "no-rerun-needed";
    let mode = "none";
    let rows = [];
    if (worklist.items.length > 0 && hasCodeRemediation) {
      status = "new-commit-cycle-required";
      mode = "new-commit-cycle";
      rows = coverage.rows.map(newCommitItem);
    } else if (worklist.items.length > 0) {
      status = "same-commit-rerun-needed";
      mode = "same-commit-cycle";
      rows = worklist.items.map(sameCommitItem);
    }

    const counts = { newCommitRequired: 0, sameCommitRequired: 0, sameCommitConditional: 0 };
    rows.forEach((row) => {
      if (row.commitPolicy === "new-commit-required") counts.newCommitRequired += 1;
      else if (row.commitPolicy === "same-commit-required") counts.sameCommitRequired += 1;
      else if (row.commitPolicy === "same-commit-if-no-code-change") counts.sameCommitConditional += 1;
    });

    return Object.freeze({
      ok: true,
      errors: Object.freeze([]),
      plan: Object.freeze({
        reportType: "methodz-field-evidence-rerun-plan",
        reportVersion: VERSION,
        sourceCommitSha: coverage.commitSha,
        status,
        mode,
        rowCount: rows.length,
        targetCommit: mode === "new-commit-cycle" ? "new-commit-after-remediation" : coverage.commitSha,
        counts: Object.freeze(counts),
        rows: Object.freeze(rows),
        boundaries: planBoundaries()
      })
    });
  }

  function buildPlanSummary(plan, options = {}) {
    if (!plan || plan.reportType !== "methodz-field-evidence-rerun-plan") return null;
    return Object.freeze({
      reportType: "methodz-field-evidence-rerun-summary",
      reportVersion: VERSION,
      generatedAt: isoTimestamp(options.now || Date.now()) || new Date().toISOString(),
      sourceCommitSha: commitSha(plan.sourceCommitSha),
      status: plan.status,
      mode: plan.mode,
      rowCount: plan.rowCount,
      targetCommit: plan.targetCommit,
      counts: plan.counts,
      rows: plan.rows,
      boundaries: planBoundaries()
    });
  }

  function buildChecklist(plan) {
    if (!plan || plan.reportType !== "methodz-field-evidence-rerun-plan") return "";
    const lines = [
      "# Field Evidence Rerun Checklist",
      "",
      `Source commit: \`${plan.sourceCommitSha}\``,
      `Plan status: **${plan.status}**`,
      `Commit mode: \`${plan.mode}\``,
      `Target commit: \`${plan.targetCommit}\``,
      ""
    ];
    if (!plan.rows.length) {
      lines.push("No rerun is required by the current exact-commit coverage and remediation worklist.", "");
    } else {
      lines.push("## Rehearsal rows", "");
      plan.rows.forEach((row) => {
        lines.push(`- [ ] **${row.rowLabel}** · ${row.action} · \`${row.commitPolicy}\``);
        lines.push(`  - Source state: ${row.sourceState}`);
        lines.push(`  - Reason: ${row.reason}`);
        if (row.blockingIssues.length) lines.push(`  - Blocking issue references: ${row.blockingIssues.map((number) => `#${number}`).join(", ")}`);
      });
      lines.push("");
    }
    lines.push(
      "## Evidence rule",
      "",
      "A code change creates a new evidence boundary. Prior physical-device reports may explain history, but they do not establish coverage for the changed commit. Environment-only or evidence-only work may stay on the same commit only when code did not change.",
      "",
      "This checklist is metadata-only operator guidance. It does not run tests, mutate meetings, contact providers or GitHub, synchronize data, or prove production readiness."
    );
    return `${lines.join("\n")}\n`;
  }

  return Object.freeze({
    version: VERSION,
    sourceVersion: SOURCE_VERSION,
    maxRows: MAX_ROWS,
    rows: ROWS,
    normalizeCoverage,
    normalizeWorklist,
    validatePair,
    buildPlan,
    buildPlanSummary,
    buildChecklist
  });
});
