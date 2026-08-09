import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const core = require("../evidence-rerun-core.js");

const SHA = "42d23802e9f2b165a2b9620b959882c0dcd9cd20";
const rowDefs = [
  ["desktopChromium", "Desktop Chromium"],
  ["desktopNonChromium", "Desktop non-Chromium"],
  ["androidChrome", "Android Chrome"],
  ["iosSafari", "iOS Safari"],
  ["tablet", "Tablet"],
  ["twoDevice", "Two-device"]
];

function coverageBoundaries() {
  return {
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
    synchronization: false
  };
}

function worklistBoundaries() {
  return {
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
    transferMutation: false
  };
}

function makeCoverage(states) {
  return {
    reportType: "methodz-field-evidence-coverage",
    reportVersion: "1.0.0",
    commitSha: SHA,
    status: Object.values(states).every((state) => state === "ready") ? "coverage-complete" : "coverage-incomplete",
    rows: rowDefs.map(([key, label]) => ({
      key,
      label,
      state: states[key] || "ready",
      evidenceCount: states[key] === "missing" ? 0 : 1,
      latestGeneratedAt: states[key] === "missing" ? "" : "2026-08-09T20:00:00.000Z",
      blockingIssues: states[key] === "blocked" ? [91] : []
    })),
    boundaries: coverageBoundaries()
  };
}

function makeWorklist(coverage) {
  const actionMap = {
    fail: ["code-remediation", 1],
    blocked: ["environment-remediation", 2],
    incomplete: ["evidence-completion", 3],
    missing: ["evidence-collection", 4]
  };
  const items = coverage.rows.filter((row) => row.state !== "ready").map((row) => ({
    rowKey: row.key,
    rowLabel: row.label,
    state: row.state,
    actionType: actionMap[row.state][0],
    priority: actionMap[row.state][1],
    blockingIssues: row.blockingIssues
  }));
  return {
    reportType: "methodz-field-evidence-remediation-worklist",
    reportVersion: "1.0.0",
    commitSha: SHA,
    status: items.length ? "remediation-needed" : "no-remediation-needed",
    itemCount: items.length,
    items,
    boundaries: worklistBoundaries()
  };
}

{
  const coverage = makeCoverage({ androidChrome: "fail", iosSafari: "blocked" });
  const worklist = makeWorklist(coverage);
  const beforeCoverage = JSON.stringify(coverage);
  const beforeWorklist = JSON.stringify(worklist);
  const result = core.buildPlan(coverage, worklist);
  assert.equal(result.ok, true);
  assert.equal(result.plan.status, "new-commit-cycle-required");
  assert.equal(result.plan.mode, "new-commit-cycle");
  assert.equal(result.plan.rowCount, 6);
  assert.equal(result.plan.counts.newCommitRequired, 6);
  assert.equal(result.plan.targetCommit, "new-commit-after-remediation");
  assert.equal(result.plan.rows.find((row) => row.rowKey === "desktopChromium").action, "revalidate-on-new-commit");
  assert.equal(result.plan.rows.find((row) => row.rowKey === "androidChrome").action, "fix-and-rerun-on-new-commit");
  assert.equal(JSON.stringify(coverage), beforeCoverage);
  assert.equal(JSON.stringify(worklist), beforeWorklist);
}

{
  const coverage = makeCoverage({ iosSafari: "blocked", tablet: "incomplete", twoDevice: "missing" });
  const worklist = makeWorklist(coverage);
  const result = core.buildPlan(coverage, worklist);
  assert.equal(result.ok, true);
  assert.equal(result.plan.status, "same-commit-rerun-needed");
  assert.equal(result.plan.mode, "same-commit-cycle");
  assert.equal(result.plan.rowCount, 3);
  assert.equal(result.plan.targetCommit, SHA);
  assert.equal(result.plan.counts.newCommitRequired, 0);
  assert.equal(result.plan.counts.sameCommitConditional, 1);
  assert.equal(result.plan.counts.sameCommitRequired, 2);
  assert.deepEqual(result.plan.rows.map((row) => row.rowKey), ["iosSafari", "tablet", "twoDevice"]);
}

{
  const coverage = makeCoverage({});
  const worklist = makeWorklist(coverage);
  const result = core.buildPlan(coverage, worklist);
  assert.equal(result.ok, true);
  assert.equal(result.plan.status, "no-rerun-needed");
  assert.equal(result.plan.rowCount, 0);
  assert.match(core.buildChecklist(result.plan), /No rerun is required/);
}

{
  const coverage = makeCoverage({ androidChrome: "fail" });
  const worklist = makeWorklist(coverage);
  worklist.commitSha = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  const result = core.buildPlan(coverage, worklist);
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes("pair:commit-mismatch"));
}

{
  const coverage = makeCoverage({ iosSafari: "blocked" });
  coverage.boundaries.browserStorageRead = true;
  const result = core.buildPlan(coverage, makeWorklist(makeCoverage({ iosSafari: "blocked" })));
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes("coverage:boundaries"));
}

{
  const coverage = makeCoverage({ tablet: "incomplete" });
  const worklist = makeWorklist(coverage);
  worklist.items[0].actionType = "code-remediation";
  const result = core.buildPlan(coverage, worklist);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.endsWith(":action-mismatch")));
}

{
  const coverage = makeCoverage({ androidChrome: "fail" });
  const worklist = makeWorklist(coverage);
  const plan = core.buildPlan(coverage, worklist).plan;
  const summary = core.buildPlanSummary(plan, { now: "2026-08-09T22:50:00Z" });
  assert.equal(summary.reportType, "methodz-field-evidence-rerun-summary");
  assert.equal(summary.generatedAt, "2026-08-09T22:50:00.000Z");
  assert.equal(summary.boundaries.browserStorageRead, false);
  assert.match(core.buildChecklist(plan), /A code change creates a new evidence boundary/);
}

console.log("Field Evidence Rerun core tests passed.");
