import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const core = require("../field-rehearsal-return-core.js");

const COMMIT = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const OTHER = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const RECEIPT = "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc";

function evidence(platformFamily, browserFamily, options = {}) {
  return {
    reportType: "methodz-field-rehearsal-evidence",
    reportVersion: "1.0.0",
    commitSha: options.commitSha || COMMIT,
    environment: { platformFamily, browserFamily },
    summary: {
      readiness: options.readiness || "ready",
      metadataComplete: options.metadataComplete !== false
    },
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
      containsTransferContents: false
    }
  };
}

function launch(rowKey, targetCommitSha = COMMIT) {
  return {
    reportType: "methodz-field-rehearsal-launch",
    reportVersion: "1.0.0",
    rowKey,
    targetCommitSha
  };
}

{
  const cases = [
    ["desktop", "chrome", "desktopChromium"],
    ["desktop", "edge", "desktopChromium"],
    ["desktop", "firefox", "desktopNonChromium"],
    ["android", "chrome", "androidChrome"],
    ["ios", "safari", "iosSafari"],
    ["tablet", "other", "tablet"],
    ["two-device", "chrome", "twoDevice"]
  ];
  cases.forEach(([platform, browser, expected]) => {
    const result = core.buildFromEvidence(evidence(platform, browser), null, RECEIPT);
    assert.equal(result.ok, true, `${platform}/${browser} should map`);
    assert.equal(result.returnTarget.rowKey, expected);
    assert.equal(result.returnTarget.evidenceSha256, RECEIPT);
  });
}

{
  const result = core.buildFromEvidence(evidence("desktop", "other"), null, RECEIPT);
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes("evidence:coverage-row"));
}

{
  const result = core.buildFromEvidence(evidence("android", "chrome", { metadataComplete: false }), null, RECEIPT);
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes("evidence:metadata-incomplete"));
}

{
  const result = core.buildFromEvidence(evidence("android", "chrome"), null, "not-a-receipt");
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes("evidence:receipt"));
}

{
  const sourceEvidence = evidence("android", "chrome");
  const sourceLaunch = launch("androidChrome");
  const evidenceBefore = JSON.stringify(sourceEvidence);
  const launchBefore = JSON.stringify(sourceLaunch);
  const result = core.buildFromEvidence(sourceEvidence, sourceLaunch, RECEIPT);
  assert.equal(result.ok, true);
  assert.equal(result.returnTarget.rowKey, "androidChrome");
  assert.equal(result.returnTarget.commitSha, COMMIT);
  assert.equal(result.returnTarget.evidenceSha256, RECEIPT);
  assert.equal(JSON.stringify(sourceEvidence), evidenceBefore, "evidence input must remain immutable");
  assert.equal(JSON.stringify(sourceLaunch), launchBefore, "launch input must remain immutable");
}

{
  const result = core.buildFromEvidence(evidence("ios", "safari"), launch("androidChrome"), RECEIPT);
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes("launch:row-drift"));
}

{
  const result = core.buildFromEvidence(evidence("android", "chrome", { commitSha: OTHER }), launch("androidChrome", COMMIT), RECEIPT);
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes("launch:commit-drift"));
}

{
  const result = core.buildFromEvidence(evidence("ios", "safari", { readiness: "blocked" }), launch("iosSafari"), RECEIPT);
  assert.equal(result.ok, true);
  const fragment = core.encodeFragment(result.returnTarget);
  assert.ok(fragment.startsWith("#methodz-evidence-return="));
  assert.ok(fragment.includes("v:1.1.0"));
  assert.ok(fragment.includes(`receipt:${RECEIPT}`));
  const parsed = core.parseFragment(fragment);
  assert.equal(parsed.recognized, true);
  assert.equal(parsed.ok, true);
  assert.deepEqual(parsed.returnTarget, result.returnTarget);
}

{
  const target = core.buildFromEvidence(evidence("android", "chrome"), launch("androidChrome"), RECEIPT).returnTarget;
  const matchingReport = {
    commitSha: COMMIT,
    readiness: "ready",
    environment: { platformFamily: "android", browserFamily: "chrome" }
  };
  assert.equal(core.matchesReportMetadata(target, matchingReport).ok, true);
  assert.ok(core.matchesReportMetadata(target, { ...matchingReport, commitSha: OTHER }).errors.includes("receipt:commit-drift"));
  assert.ok(core.matchesReportMetadata(target, { ...matchingReport, readiness: "blocked" }).errors.includes("receipt:readiness-drift"));
  assert.ok(core.matchesReportMetadata(target, { ...matchingReport, environment: { platformFamily: "ios", browserFamily: "safari" } }).errors.includes("receipt:row-drift"));
}

{
  const extra = `#methodz-evidence-return=v:1.1.0;row:androidChrome;commit:${COMMIT};readiness:ready;receipt:${RECEIPT};note:secret`;
  const parsed = core.parseFragment(extra);
  assert.equal(parsed.ok, false);
  assert.ok(parsed.errors.includes("fragment:key"));
}

{
  const duplicate = `#methodz-evidence-return=v:1.1.0;row:androidChrome;row:iosSafari;commit:${COMMIT};readiness:ready;receipt:${RECEIPT}`;
  const parsed = core.parseFragment(duplicate);
  assert.equal(parsed.ok, false);
  assert.ok(parsed.errors.includes("fragment:key"));
}

{
  const missingReceipt = `#methodz-evidence-return=v:1.1.0;row:androidChrome;commit:${COMMIT};readiness:ready`;
  const parsed = core.parseFragment(missingReceipt);
  assert.equal(parsed.ok, false);
  assert.ok(parsed.errors.includes("fragment:fields"));
}

{
  const unrelated = core.parseFragment("#other-fragment");
  assert.equal(unrelated.recognized, false);
  assert.equal(unrelated.ok, false);
}

console.log("Field Rehearsal return core: all assertions passed.");
