import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const core = require("../field-rehearsal-launch-core.js");

const SOURCE = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const TARGET = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

function plan(rowKey, commitPolicy) {
  return {
    reportType: "methodz-field-evidence-rerun-plan",
    reportVersion: "1.0.0",
    sourceCommitSha: SOURCE,
    rows: [{ rowKey, commitPolicy }]
  };
}

{
  const sourcePlan = plan("androidChrome", "same-commit-required");
  const before = JSON.stringify(sourcePlan);
  const result = core.buildFromPlan(sourcePlan, "androidChrome", TARGET);
  assert.equal(result.ok, true);
  assert.equal(result.launch.targetCommitSha, SOURCE);
  assert.equal(result.launch.expectedEnvironment.platformFamily, "android");
  assert.equal(result.launch.expectedEnvironment.browserFamily, "chrome");
  assert.equal(JSON.stringify(sourcePlan), before, "source plan must remain immutable");
}

{
  const result = core.buildFromPlan(plan("iosSafari", "new-commit-required"), "iosSafari", SOURCE);
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes("launch:new-commit-must-differ"));
}

{
  const result = core.buildFromPlan(plan("iosSafari", "new-commit-required"), "iosSafari", TARGET);
  assert.equal(result.ok, true);
  assert.equal(result.launch.targetCommitSha, TARGET);
  assert.equal(result.launch.expectedEnvironment.browserFamily, "safari");
  const fragment = core.encodeFragment(result.launch);
  assert.ok(fragment.startsWith("#methodz-rehearsal="));
  const parsed = core.parseFragment(fragment);
  assert.equal(parsed.recognized, true);
  assert.equal(parsed.ok, true);
  assert.deepEqual(parsed.launch, result.launch);
}

{
  const desktop = core.normalizeLaunch({
    rowKey: "desktopNonChromium",
    sourceCommitSha: SOURCE,
    targetCommitSha: SOURCE,
    commitPolicy: "same-commit-if-no-code-change"
  });
  assert.equal(desktop.ok, true);
  assert.equal(desktop.launch.expectedEnvironment.browserFamily, "");
  assert.equal(desktop.launch.expectedEnvironment.browserRequirement, "Non-Chromium browser");
}

{
  const tampered = `#methodz-rehearsal=v:1.0.0;row:androidChrome;source:${SOURCE};target:${TARGET};policy:same-commit-required`;
  const parsed = core.parseFragment(tampered);
  assert.equal(parsed.recognized, true);
  assert.equal(parsed.ok, false);
  assert.ok(parsed.errors.includes("launch:same-commit-must-match"));
}

{
  const extra = `#methodz-rehearsal=v:1.0.0;row:androidChrome;source:${SOURCE};target:${SOURCE};policy:same-commit-required;note:secret`;
  const parsed = core.parseFragment(extra);
  assert.equal(parsed.ok, false);
  assert.ok(parsed.errors.includes("fragment:key"));
}

{
  const unrelated = core.parseFragment("#other-fragment");
  assert.equal(unrelated.recognized, false);
  assert.equal(unrelated.ok, false);
}

console.log("Field Rehearsal launch core: all assertions passed.");
