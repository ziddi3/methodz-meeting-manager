import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const core = require("../evidence-coverage-core.js");

assert.equal(core.version, "1.0.0");
assert.equal(core.sourceReportType, "methodz-field-rehearsal-evidence");
assert.equal(core.sourceReportVersion, "1.0.0");
assert.equal(core.maxReports, 50);
assert.equal(core.coverageRows.length, 6);

const COMMIT_A = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const COMMIT_B = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

function sourceReport({
  generatedAt = "2026-08-08T12:00:00.000Z",
  commitSha = COMMIT_A,
  platformFamily = "desktop",
  browserFamily = "chrome",
  readiness = "ready",
  blockingIssues = []
} = {}) {
  const viewportClass = platformFamily === "android" || platformFamily === "ios" ? "phone" : platformFamily === "tablet" ? "tablet" : "desktop";
  return {
    reportType: "methodz-field-rehearsal-evidence",
    reportVersion: "1.0.0",
    appShellVersion: "1.6.12",
    recordSchemaVersion: "1.6.0",
    generatedAt,
    commitSha,
    environment: {
      platformFamily,
      operatingSystemVersion: "1.0",
      browserFamily,
      browserVersion: "1.0",
      viewportClass,
      serviceWorkerMode: "https",
      serviceWorkerControlled: true,
      online: true,
      viewportWidth: viewportClass === "phone" ? 390 : viewportClass === "tablet" ? 820 : 1440,
      viewportHeight: viewportClass === "phone" ? 844 : viewportClass === "tablet" ? 1180 : 900
    },
    results: {},
    summary: {
      readiness,
      metadataComplete: true,
      requiredChecks: 8,
      pass: readiness === "ready" ? 8 : 7,
      fail: readiness === "fail" ? 1 : 0,
      blocked: readiness === "blocked" ? 1 : 0,
      notApplicable: 0,
      notRun: readiness === "incomplete" ? 1 : 0
    },
    aggregates: {},
    blockingIssues,
    boundaries: {
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
    }
  };
}

const valid = core.validateAndNormalizeReport(sourceReport());
assert.equal(valid.ok, true);
assert.equal(valid.report.commitSha, COMMIT_A);
assert.equal(valid.report.readiness, "ready");
assert.equal(valid.report.environment.browserFamily, "chrome");

const readyMatrixSource = [
  sourceReport({ platformFamily: "desktop", browserFamily: "chrome", generatedAt: "2026-08-08T12:00:01.000Z" }),
  sourceReport({ platformFamily: "desktop", browserFamily: "firefox", generatedAt: "2026-08-08T12:00:02.000Z" }),
  sourceReport({ platformFamily: "android", browserFamily: "chrome", generatedAt: "2026-08-08T12:00:03.000Z" }),
  sourceReport({ platformFamily: "ios", browserFamily: "safari", generatedAt: "2026-08-08T12:00:04.000Z" }),
  sourceReport({ platformFamily: "tablet", browserFamily: "chrome", generatedAt: "2026-08-08T12:00:05.000Z" }),
  sourceReport({ platformFamily: "two-device", browserFamily: "chrome", generatedAt: "2026-08-08T12:00:06.000Z" })
].map((report) => core.validateAndNormalizeReport(report).report);

const readyCoverage = core.buildCoverage(readyMatrixSource, COMMIT_A);
assert.equal(readyCoverage.status, "coverage-complete");
assert.equal(readyCoverage.counts.ready, 6);
assert.equal(readyCoverage.counts.missing, 0);
assert.equal(readyCoverage.rows.length, 6);

const mixed = [
  ...readyMatrixSource.slice(0, 3),
  core.validateAndNormalizeReport(sourceReport({ commitSha: COMMIT_B, platformFamily: "ios", browserFamily: "safari" })).report
];
const commits = core.listCommits(mixed);
assert.equal(commits.length, 2);
const commitACoverage = core.buildCoverage(mixed, COMMIT_A);
assert.equal(commitACoverage.sourceReportCount, 3);
assert.equal(commitACoverage.counts.ready, 3);
assert.equal(commitACoverage.counts.missing, 3);
const commitBCoverage = core.buildCoverage(mixed, COMMIT_B);
assert.equal(commitBCoverage.sourceReportCount, 1);
assert.equal(commitBCoverage.counts.ready, 1);
assert.equal(commitBCoverage.counts.missing, 5);

const repeatedRow = [
  core.validateAndNormalizeReport(sourceReport({ generatedAt: "2026-08-08T10:00:00.000Z", readiness: "fail", blockingIssues: [59] })).report,
  core.validateAndNormalizeReport(sourceReport({ generatedAt: "2026-08-08T11:00:00.000Z", readiness: "ready" })).report
];
const repeatedCoverage = core.buildCoverage(repeatedRow, COMMIT_A);
const desktopChromium = repeatedCoverage.rows.find((row) => row.key === "desktopChromium");
assert.equal(desktopChromium.state, "ready");
assert.equal(desktopChromium.evidenceCount, 2);
assert.equal(desktopChromium.latestGeneratedAt, "2026-08-08T11:00:00.000Z");
assert.deepEqual(repeatedCoverage.referencedIssues, [59]);

const blocked = core.validateAndNormalizeReport(sourceReport({ platformFamily: "android", browserFamily: "chrome", readiness: "blocked", blockingIssues: [59, 101] })).report;
const blockedCoverage = core.buildCoverage([blocked], COMMIT_A);
assert.equal(blockedCoverage.status, "coverage-incomplete");
assert.equal(blockedCoverage.counts.blocked, 1);
assert.deepEqual(blockedCoverage.referencedIssues, [59, 101]);

const unsafe = sourceReport();
unsafe.boundaries.containsMeetingContent = true;
const rejectedUnsafe = core.validateAndNormalizeReport(unsafe);
assert.equal(rejectedUnsafe.ok, false);
assert.ok(rejectedUnsafe.errors.includes("boundary:containsMeetingContent"));

const incompleteMetadata = sourceReport({ readiness: "incomplete" });
incompleteMetadata.summary.metadataComplete = false;
const rejectedMetadata = core.validateAndNormalizeReport(incompleteMetadata);
assert.equal(rejectedMetadata.ok, false);
assert.ok(rejectedMetadata.errors.includes("summary:metadata-incomplete"));

const unknownSecrets = sourceReport();
unknownSecrets.meetingTitle = "FORBIDDEN_MEETING_TITLE";
unknownSecrets.recordId = "FORBIDDEN_RECORD_ID";
unknownSecrets.credentials = "FORBIDDEN_CREDENTIAL";
const normalizedUnknown = core.validateAndNormalizeReport(unknownSecrets);
assert.equal(normalizedUnknown.ok, true);
const serializedUnknown = JSON.stringify(normalizedUnknown.report);
for (const forbidden of ["FORBIDDEN_MEETING_TITLE", "FORBIDDEN_RECORD_ID", "FORBIDDEN_CREDENTIAL"]) {
  assert.equal(serializedUnknown.includes(forbidden), false);
}

const summary = core.buildCoverageSummary(readyCoverage, { now: "2026-08-08T23:30:00.000Z" });
assert.equal(summary.reportType, "methodz-field-evidence-coverage-summary");
assert.equal(summary.generatedAt, "2026-08-08T23:30:00.000Z");
assert.equal(summary.status, "coverage-complete");
assert.equal(summary.boundaries.metadataOnly, true);
assert.equal(summary.boundaries.importedReportsPersisted, false);
assert.equal(summary.boundaries.browserStorageRead, false);
assert.equal(summary.boundaries.browserStorageWritten, false);
assert.equal(summary.boundaries.providerCalls, false);
assert.equal(summary.boundaries.provesProductionReadiness, false);
assert.equal(summary.boundaries.provesDeviceIdentity, false);

const many = [];
for (let index = 0; index < 60; index += 1) {
  many.push(core.validateAndNormalizeReport(sourceReport({
    generatedAt: `2026-08-08T12:${String(index % 60).padStart(2, "0")}:00.000Z`,
    commitSha: index < 50 ? COMMIT_A : COMMIT_B
  })).report);
}
assert.equal(core.listCommits(many).length, 1);
assert.equal(core.listCommits(many)[0].reportCount, 50);

console.log("Field Evidence Coverage portable core tests passed.");
