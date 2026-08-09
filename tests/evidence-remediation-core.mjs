import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const core = require("../evidence-remediation-core.js");

assert.equal(core.version, "1.0.0");
assert.equal(core.sourceReportVersion, "1.0.0");
assert.equal(core.maxItems, 6);
assert.equal(core.rows.length, 6);

const COMMIT = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

function boundaries() {
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
    synchronization: false,
    provesProductionReadiness: false,
    provesDeviceIdentity: false,
    provesAuthorization: false,
    provesDelivery: false,
    provesLegalApproval: false
  };
}

function coverage(states = {}) {
  const rows = [
    ["desktopChromium", "Desktop Chromium", "desktop", "chrome"],
    ["desktopNonChromium", "Desktop non-Chromium", "desktop", "firefox"],
    ["androidChrome", "Android Chrome", "android", "chrome"],
    ["iosSafari", "iOS Safari", "ios", "safari"],
    ["tablet", "Tablet", "tablet", "chrome"],
    ["twoDevice", "Two-device", "two-device", "chrome"]
  ].map(([key, label, platformFamily, browserFamily], index) => ({
    key,
    label,
    state: states[key] || "ready",
    evidenceCount: states[key] === "missing" ? 0 : 1,
    latestGeneratedAt: states[key] === "missing" ? "" : `2026-08-09T12:0${index}:00.000Z`,
    platformFamily: states[key] === "missing" ? "" : platformFamily,
    browserFamily: states[key] === "missing" ? "" : browserFamily,
    blockingIssues: states[key] === "blocked" ? [61, 99, 61] : []
  }));
  const unresolved = rows.filter((row) => row.state !== "ready").length;
  return {
    reportType: "methodz-field-evidence-coverage",
    reportVersion: "1.0.0",
    commitSha: COMMIT,
    status: unresolved ? "coverage-incomplete" : "coverage-complete",
    rows,
    boundaries: boundaries(),
    secret: "FORBIDDEN_UNKNOWN_PROPERTY"
  };
}

const ready = core.buildWorklist(coverage());
assert.equal(ready.ok, true);
assert.equal(ready.worklist.status, "no-remediation-needed");
assert.equal(ready.worklist.itemCount, 0);

const mixed = core.buildWorklist(coverage({
  desktopChromium: "fail",
  androidChrome: "blocked",
  iosSafari: "incomplete",
  tablet: "missing"
}));
assert.equal(mixed.ok, true);
assert.equal(mixed.worklist.status, "remediation-needed");
assert.equal(mixed.worklist.itemCount, 4);
assert.deepEqual(mixed.worklist.items.map((item) => item.state), ["fail", "blocked", "incomplete", "missing"]);
assert.deepEqual(mixed.worklist.items.map((item) => item.actionType), [
  "code-remediation",
  "environment-remediation",
  "evidence-completion",
  "evidence-collection"
]);
assert.deepEqual(mixed.worklist.items[1].blockingIssues, [61, 99]);
assert.equal(mixed.worklist.counts.codeRemediation, 1);
assert.equal(mixed.worklist.counts.environmentRemediation, 1);
assert.equal(mixed.worklist.counts.evidenceCompletion, 1);
assert.equal(mixed.worklist.counts.evidenceCollection, 1);

const serialized = JSON.stringify(mixed.worklist);
assert.equal(serialized.includes("FORBIDDEN_UNKNOWN_PROPERTY"), false);
assert.equal(mixed.worklist.boundaries.githubApiCalls, false);
assert.equal(mixed.worklist.boundaries.issuesCreated, false);
assert.equal(mixed.worklist.boundaries.browserStorageRead, false);
assert.equal(mixed.worklist.boundaries.browserStorageWritten, false);
assert.equal(mixed.worklist.boundaries.provesSoftwareDefect, false);

const failDraft = core.buildIssueDraft(mixed.worklist, 0);
assert.match(failDraft.title, /Desktop Chromium: fail/);
assert.match(failDraft.body, new RegExp(COMMIT));
assert.match(failDraft.body, /code-remediation/);
assert.match(failDraft.body, /does not prove that a software defect exists/i);

const bundle = core.buildIssueDraftBundle(mixed.worklist);
assert.match(bundle, /Desktop Chromium: fail/);
assert.match(bundle, /Android Chrome: blocked/);
assert.match(bundle, /iOS Safari: incomplete/);
assert.match(bundle, /Tablet: missing/);

const summary = core.buildWorklistSummary(mixed.worklist, { now: "2026-08-09T22:00:00.000Z" });
assert.equal(summary.reportType, "methodz-field-evidence-remediation-summary");
assert.equal(summary.generatedAt, "2026-08-09T22:00:00.000Z");
assert.equal(summary.commitSha, COMMIT);
assert.equal(summary.itemCount, 4);
assert.equal(summary.boundaries.providerCalls, false);

const unsafe = coverage({ desktopChromium: "fail" });
unsafe.boundaries.meetingContentIncluded = true;
const rejectedUnsafe = core.buildWorklist(unsafe);
assert.equal(rejectedUnsafe.ok, false);
assert.ok(rejectedUnsafe.errors.includes("coverage:boundaries"));

const wrongCommit = coverage({ desktopChromium: "fail" });
wrongCommit.commitSha = "not-a-sha";
assert.equal(core.buildWorklist(wrongCommit).ok, false);

const duplicateRows = coverage({ desktopChromium: "fail" });
duplicateRows.rows.push({ ...duplicateRows.rows[0] });
const duplicateResult = core.buildWorklist(duplicateRows);
assert.equal(duplicateResult.ok, false);
assert.ok(duplicateResult.errors.includes("coverage:row-count"));

console.log("Field Evidence Remediation portable core tests passed.");
