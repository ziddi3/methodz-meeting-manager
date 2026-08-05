import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const core = require("../decision-register-core.js");
const launchCore = require("../meeting-preparation-launch-core.js");

const source = [
  {
    id: "meeting-a",
    meetingNumber: "001",
    title: "Operations Review",
    status: "Completed",
    date: "2026-08-01",
    decisions: "Free-form context remains in the source record.",
    decisionsList: [
      { decision: "Approve the service window", approvedBy: "Operations", date: "2026-08-01", status: "Approved", notes: "Effective immediately" },
      { decision: "Review the supplier option", approvedBy: "", date: "not-a-date", status: "Proposed", notes: "Needs evidence" }
    ],
    attendees: [{ name: "Private Attendee", signature: "Private Signature" }],
    tasks: [{ task: "Private Task", assignedTo: "Private Person" }],
    notes: "Private discussion notes",
    summary: "Private summary",
    credential: "secret"
  },
  {
    id: "meeting-b",
    meetingNumber: "002",
    title: "Legacy Notes Meeting",
    status: "Completed",
    date: "2026-07-25",
    decisions: "A free-form decision that must not be parsed automatically.",
    decisionsList: []
  },
  {
    id: "meeting-c",
    meetingNumber: "003",
    title: "Status Review",
    date: "2026-07-20",
    decisionsList: [
      { decision: "Pause the rollout", approvedBy: "Leadership", date: "2026-07-20", status: "Deferred", notes: "" },
      { decision: "Retire the old policy", approvedBy: "Leadership", date: "2026-07-19", status: "Reversed", notes: "Superseded" }
    ]
  }
];
const before = JSON.stringify(source);
const report = core.buildDecisionRegister(source, {
  maximumRecords: 20,
  maximumDecisionsPerRecord: 20,
  maximumEntries: 20,
  maximumUnstructuredRecords: 20
});

assert.equal(core.version, "1.0.0");
assert.equal(report.reportType, "methodz-decision-register");
assert.equal(report.counts.savedRecords, 3);
assert.equal(report.counts.structuredDecisions, 4);
assert.equal(report.counts.needsReview, 1);
assert.equal(report.counts.approved, 1);
assert.equal(report.counts.deferred, 1);
assert.equal(report.counts.reversed, 1);
assert.equal(report.counts.freeFormOnlyRecords, 1);
assert.equal(report.counts.invalidDate, 1);
assert.equal(report.counts.missingApprovedBy, 1);
assert.equal(report.entries[0].lane, "needs-review");
assert.deepEqual(report.entries[0].issues.sort(), ["invalid-date", "missing-approved-by"]);
assert.equal(report.unstructured[0].meetingTitle, "Legacy Notes Meeting");
assert.equal(JSON.stringify(source), before, "source records must remain unchanged");

const serialized = JSON.stringify(report);
assert.ok(!serialized.includes("Private Attendee"));
assert.ok(!serialized.includes("Private Signature"));
assert.ok(!serialized.includes("Private Task"));
assert.ok(!serialized.includes("Private Person"));
assert.ok(!serialized.includes("Private discussion notes"));
assert.ok(!serialized.includes("Private summary"));
assert.ok(!serialized.includes("secret"));
assert.ok(!serialized.includes("A free-form decision that must not be parsed automatically."));
assert.ok(serialized.includes("Approve the service window"));

const bounded = core.buildDecisionRegister([
  { id: "x", title: "Bounded", decisionsList: Array.from({ length: 5 }, (_, index) => ({ decision: `Decision ${index}`, approvedBy: "A", date: "2026-08-01", status: "Approved" })) },
  { id: "y", title: "Omitted", decisionsList: [{ decision: "Hidden by record bound", approvedBy: "A", date: "2026-08-01", status: "Approved" }] }
], {
  maximumRecords: 1,
  maximumDecisionsPerRecord: 2,
  maximumEntries: 1
});
assert.equal(bounded.truncation.records, true);
assert.equal(bounded.truncation.recordsOverDecisionLimit, true);
assert.equal(bounded.truncation.entries, true);
assert.equal(bounded.entries.length, 1);
assert.equal(bounded.recordsOverDecisionLimit[0].totalStructuredDecisions, 5);

const missing = core.classifyDecision({ decision: "", approvedBy: "", date: "", status: "" });
assert.equal(missing.lane, "needs-review");
assert.deepEqual([...missing.issues].sort(), ["missing-approved-by", "missing-date", "missing-decision", "missing-status"]);

const unknown = core.classifyDecision({ decision: "Keep reviewing", approvedBy: "Team", date: "2026-08-01", status: "Conditional" });
assert.equal(unknown.lane, "needs-review");
assert.deepEqual([...unknown.issues], ["unsupported-status"]);

const preparationHash = launchCore.createPreparationLaunchHash("meeting-a", "location");
assert.equal(preparationHash, "#prepare-record=meeting-a&focus=location", "existing preparation hashes must remain stable");
const decisionHash = launchCore.createPreparationLaunchHash("meeting-a", "decisions", "decision-register");
assert.equal(decisionHash, "#prepare-record=meeting-a&focus=decisions&from=decision-register");
const decisionLaunch = launchCore.parsePreparationLaunchHash(decisionHash);
assert.equal(decisionLaunch.valid, true);
assert.equal(decisionLaunch.recordId, "meeting-a");
assert.equal(decisionLaunch.target.panelId, "decisionsMadePanelV1610");
assert.equal(decisionLaunch.source.returnHref, "decisions.html");
assert.equal(launchCore.parsePreparationLaunchHash("#prepare-record=meeting-a&focus=decisions&from=unsupported").reason, "unsupported-source");
assert.equal(launchCore.parsePreparationLaunchHash("#unrelated").isPreparationLaunch, false);

console.log("Decision Register portable tests passed.");
