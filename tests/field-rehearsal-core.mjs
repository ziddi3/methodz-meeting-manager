import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const core = require("../field-rehearsal-core.js");

assert.equal(core.version, "1.0.0");
assert.equal(core.appShellVersion, "1.6.12");
assert.equal(core.recordSchemaVersion, "1.6.0");
assert.equal(core.classifyViewport(390), "phone");
assert.equal(core.classifyViewport(834), "tablet");
assert.equal(core.classifyViewport(1440), "desktop");

const allPass = Object.fromEntries(core.resultKeys.map((key) => [key, "pass"]));
const ready = core.buildEvidence({
  commitSha: "24b349917c88b7d73b0cc94ae5b4242d46b41d47",
  environment: {
    platformFamily: "android",
    operatingSystemVersion: "16.0",
    browserFamily: "chrome",
    browserVersion: "140.0",
    viewportWidth: 390,
    viewportHeight: 844,
    serviceWorkerMode: "https",
    serviceWorkerControlled: true,
    online: true
  },
  results: allPass,
  aggregates: { registeredPanels: 12, resolvedPanels: 12, coreWorkflowDurationMs: 8123 },
  blockingIssues: "61, 61, 62"
}, { now: "2026-08-07T22:40:00.000Z" });

assert.equal(ready.summary.readiness, "ready");
assert.equal(ready.summary.metadataComplete, true);
assert.equal(ready.summary.pass, 8);
assert.equal(ready.environment.viewportClass, "phone");
assert.deepEqual(ready.blockingIssues, [61, 62]);
assert.equal(ready.generatedAt, "2026-08-07T22:40:00.000Z");

const baseMetadata = {
  commitSha: "24b349917c88b7",
  environment: {
    platformFamily: "desktop",
    operatingSystemVersion: "26.1",
    browserFamily: "chrome",
    browserVersion: "140.0",
    viewportClass: "desktop",
    serviceWorkerMode: "https"
  }
};

const failed = core.buildEvidence({ ...baseMetadata, results: { ...allPass, offlineReload: "fail" } });
assert.equal(failed.summary.readiness, "fail");

const blocked = core.buildEvidence({ ...baseMetadata, results: { ...allPass, offlineReload: "blocked" } });
assert.equal(blocked.summary.readiness, "blocked");

const incomplete = core.buildEvidence({ ...baseMetadata, results: { ...allPass, offlineReload: "not-applicable" } });
assert.equal(incomplete.summary.readiness, "incomplete");
assert.equal(incomplete.summary.notApplicable, 1);

const missingMetadata = core.buildEvidence({ results: allPass });
assert.equal(missingMetadata.summary.readiness, "incomplete");
assert.equal(missingMetadata.summary.metadataComplete, false);

const bounded = core.buildEvidence({
  results: {},
  aggregates: { registeredPanels: 999999999, coreWorkflowDurationMs: -9 },
  blockingIssues: [0, -2, 7, 2147483648, 8],
  secretMeetingTitle: "FORBIDDEN_MEETING_TITLE",
  recordId: "FORBIDDEN_RECORD_ID",
  credentials: "FORBIDDEN_CREDENTIAL"
});
assert.equal(bounded.aggregates.registeredPanels, 1000000);
assert.equal(bounded.aggregates.coreWorkflowDurationMs, 0);
assert.deepEqual(bounded.blockingIssues, [7, 8]);

const serialized = JSON.stringify(bounded);
for (const forbidden of ["FORBIDDEN_MEETING_TITLE", "FORBIDDEN_RECORD_ID", "FORBIDDEN_CREDENTIAL"]) {
  assert.equal(serialized.includes(forbidden), false);
}
assert.equal(bounded.boundaries.containsMeetingContent, false);
assert.equal(bounded.boundaries.containsProviderSecrets, false);
assert.equal(bounded.boundaries.containsTransferContents, false);

console.log("Field Rehearsal portable core tests passed.");
