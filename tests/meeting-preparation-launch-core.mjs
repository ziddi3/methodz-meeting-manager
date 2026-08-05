import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const core = require("../meeting-preparation-launch-core.js");

assert.equal(core.version, "1.1.0");
assert.equal(core.launchKey, "prepare-record");
assert.deepEqual(Object.keys(core.focusTargets), ["title", "date", "location", "facilitator", "organizations", "attendees", "agenda", "decisions"]);

const hash = core.createPreparationLaunchHash("meeting / one?", "location");
assert.equal(hash, "#prepare-record=meeting%20%2F%20one%3F&focus=location");

const parsed = core.parsePreparationLaunchHash(hash);
assert.equal(parsed.valid, true);
assert.equal(parsed.isPreparationLaunch, true);
assert.equal(parsed.recordId, "meeting / one?");
assert.equal(parsed.focus, "location");
assert.equal(parsed.sourceKey, "preparation");
assert.deepEqual(parsed.target, {
  panelId: "meetingInformationPanelV1610",
  selector: "#meetingLocation",
  label: "Location or video link"
});
assert.deepEqual(parsed.source, {
  key: "preparation",
  label: "Preparation",
  returnHref: "preparation.html",
  returnLabel: "Back to Preparation Brief"
});

const defaultFocus = core.parsePreparationLaunchHash("#prepare-record=meeting-1");
assert.equal(defaultFocus.valid, true);
assert.equal(defaultFocus.focus, "title");
assert.equal(defaultFocus.sourceKey, "preparation");

assert.deepEqual(core.parsePreparationLaunchHash("#follow-up"), {
  valid: false,
  isPreparationLaunch: false,
  reason: "not-preparation-launch",
  recordId: "",
  focus: "",
  target: null,
  sourceKey: "",
  source: null
});
assert.equal(core.parsePreparationLaunchHash("#prepare-record=&focus=title").reason, "missing-record-id");
assert.equal(core.parsePreparationLaunchHash("#prepare-record=meeting-1&focus=notes").reason, "unsupported-focus");
assert.equal(core.parsePreparationLaunchHash("#prepare-record=meeting-1&focus=decisions&from=unsupported").reason, "unsupported-source");
assert.equal(core.parsePreparationLaunchHash(`#prepare-record=${"x".repeat(257)}&focus=title`).reason, "record-id-too-long");
assert.throws(() => core.createPreparationLaunchHash("", "title"), /Invalid preparation record reference/);
assert.throws(() => core.createPreparationLaunchHash("meeting-1", "notes"), /Unsupported preparation focus target/);
assert.throws(() => core.createPreparationLaunchHash("meeting-1", "title", "unsupported"), /Unsupported launch source/);

console.log("Meeting preparation launch core: all assertions passed.");
