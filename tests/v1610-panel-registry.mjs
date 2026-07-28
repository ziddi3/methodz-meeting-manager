import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Registry = require("../panel-registry-core.js");

function element(order) {
  return {
    dataset: {},
    order,
    compareDocumentPosition(other) {
      return this.order < other.order ? 4 : this.order > other.order ? 2 : 0;
    }
  };
}

function documentFrom(map) {
  return {
    querySelector(selector) {
      return map.get(selector) || null;
    }
  };
}

const options = {
  validGroups: ["capture", "diagnostics"],
  validVisibility: ["visible", "collapsed", "hidden"],
  validPrintBehavior: ["include", "exclude", "summary"]
};

Registry.resetForTests();
const first = Registry.register({
  id: "meeting-information",
  label: "Meeting Information",
  group: "capture",
  selector: "#meeting-information",
  insertionAnchor: "#main",
  meetingDayPriority: 10,
  meetingDayLabel: "Info",
  defaultVisibility: "visible",
  printBehavior: "include",
  required: true,
  order: 10
}, options);
assert.equal(first.ok, true);
assert.equal(Registry.register({ ...first.panel }, options).ok, false, "duplicate panel IDs must fail registration");

Registry.resetForTests();
const invalidGroup = Registry.register({
  id: "bad-panel",
  label: "Bad Panel",
  group: "unknown",
  selector: "#bad",
  insertionAnchor: "#main"
}, options);
assert.equal(invalidGroup.ok, false, "invalid groups must fail registration");

Registry.resetForTests();
Registry.registerMany([
  {
    id: "meeting-information",
    label: "Meeting Information",
    group: "capture",
    selector: "#meeting-information",
    insertionAnchor: "#main",
    meetingDayPriority: 10,
    meetingDayLabel: "Info",
    required: true,
    order: 10
  },
  {
    id: "discussion-notes",
    label: "Discussion Notes",
    group: "capture",
    selector: "#discussion-notes",
    insertionAnchor: "#main",
    meetingDayPriority: 20,
    meetingDayLabel: "Notes",
    required: true,
    order: 20
  },
  {
    id: "diagnostics",
    label: "Diagnostics",
    group: "diagnostics",
    selector: "#diagnostics",
    insertionAnchor: "#main",
    required: false,
    defaultVisibility: "collapsed",
    printBehavior: "exclude",
    order: 30
  }
], options);

const main = element(0);
const information = element(1);
const notes = element(2);
const diagnostics = element(3);
const documentRef = documentFrom(new Map([
  ["#main", main],
  ["#meeting-information", information],
  ["#discussion-notes", notes],
  ["#diagnostics", diagnostics]
]));
Registry.bindDocument(documentRef);
const valid = Registry.validateDocument(documentRef, {
  startedAtMs: 0,
  requiredCapturePanelIds: ["meeting-information", "discussion-notes"]
});
assert.equal(valid.valid, true);
assert.equal(valid.counts.registered, 3);
assert.equal(valid.counts.resolved, 3);
assert.equal(valid.counts.meetingDayPanels, 2);
assert.equal(valid.order.matches, true);
assert.equal(information.dataset.methodzPanelId, "meeting-information");
assert.deepEqual(Registry.getMeetingDayPanels(documentRef).map((entry) => entry.id), ["meeting-information", "discussion-notes"]);
assert.equal(JSON.stringify(valid).includes("meeting text"), false);
assert.equal(valid.boundaries.containsMeetingContent, false);
assert.equal(valid.boundaries.containsRecordIds, false);

const reversedInformation = element(2);
const reversedNotes = element(1);
const reversedDocument = documentFrom(new Map([
  ["#main", element(0)],
  ["#meeting-information", reversedInformation],
  ["#discussion-notes", reversedNotes],
  ["#diagnostics", element(3)]
]));
const reversedOrder = Registry.validateDocument(reversedDocument, {
  requiredCapturePanelIds: ["meeting-information", "discussion-notes"]
});
assert.equal(reversedOrder.valid, false, "Meeting-Day priority drift must fail closed");
assert.equal(reversedOrder.order.matches, false);
assert.deepEqual(reversedOrder.order.expected, ["meeting-information", "discussion-notes"]);
assert.deepEqual(reversedOrder.order.actual, ["discussion-notes", "meeting-information"]);
assert.ok(reversedOrder.errors.some((issue) => issue.code === "PANEL_ORDER_MISMATCH"));

const missingAnchor = Registry.validateDocument(documentFrom(new Map([
  ["#meeting-information", information],
  ["#discussion-notes", notes]
])), {
  requiredCapturePanelIds: ["meeting-information", "discussion-notes"]
});
assert.equal(missingAnchor.valid, false, "missing insertion anchors must fail visibly");
assert.ok(missingAnchor.errors.some((issue) => issue.code === "MISSING_ANCHOR"));

const missingCaptureRegistration = Registry.validateDocument(documentRef, {
  requiredCapturePanelIds: ["meeting-information", "discussion-notes", "follow-up-tasks"]
});
assert.equal(missingCaptureRegistration.valid, false, "omitted required capture registrations must fail validation");
assert.ok(missingCaptureRegistration.errors.some((issue) => issue.code === "CAPTURE_REGISTRATION_OMITTED"));

console.log("v1.6.10 panel registry core tests passed");
