import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const core = require("../meeting-closeout-core.js");

assert.equal(core.version, "1.0.0");

const completeRecord = {
  id: "SECRET-RECORD-ID",
  title: "SECRET-MEETING-TITLE",
  status: "Completed",
  date: "2026-08-04",
  attendees: [{ name: "SECRET-ATTENDEE", signature: "SECRET-SIGNATURE" }],
  agenda: [
    { group: "Operations", item: "SECRET-AGENDA-ITEM", completed: true },
    { group: "Safety", item: "SECRET-SECOND-ITEM", completed: true }
  ],
  notes: "SECRET-NOTES",
  decisions: "SECRET-DECISIONS",
  tasks: [{
    task: "SECRET-TASK",
    assignedTo: "SECRET-ASSIGNEE",
    due: "2026-08-08",
    status: "Pending",
    priority: "High"
  }],
  summary: "SECRET-SUMMARY",
  credentials: { token: "SECRET-TOKEN" },
  privateKey: "SECRET-PRIVATE-KEY",
  syncQueue: [{ payload: "SECRET-QUEUE" }]
};
const original = structuredClone(completeRecord);
const complete = core.buildMeetingCloseoutReview(completeRecord);
assert.equal(complete.ready, true);
assert.equal(complete.state, "ready");
assert.equal(complete.percent, 100);
assert.equal(complete.completed, 7);
assert.equal(complete.nextFocus, "");
assert.deepEqual(complete.counts.attendees, { total: 1, named: 1 });
assert.deepEqual(complete.counts.agenda, { total: 2, reviewed: 2, unreviewed: 0 });
assert.equal(complete.counts.tasks.ready, 1);
assert.deepEqual(completeRecord, original, "closeout derivation must not mutate the source record");

const serialized = JSON.stringify(complete);
for (const forbidden of [
  "SECRET-RECORD-ID",
  "SECRET-MEETING-TITLE",
  "SECRET-ATTENDEE",
  "SECRET-SIGNATURE",
  "SECRET-AGENDA-ITEM",
  "SECRET-NOTES",
  "SECRET-DECISIONS",
  "SECRET-TASK",
  "SECRET-ASSIGNEE",
  "SECRET-SUMMARY",
  "SECRET-TOKEN",
  "SECRET-PRIVATE-KEY",
  "SECRET-QUEUE"
]) {
  assert.equal(serialized.includes(forbidden), false, `${forbidden} leaked into closeout metadata`);
}

const incomplete = core.buildMeetingCloseoutReview({
  status: "In Progress",
  attendees: [{ organizationRole: "Observer" }],
  agenda: [{ item: "Review one", completed: true }, { item: "Review two", completed: false }],
  notes: "",
  decisions: "",
  tasks: [
    { task: "Call supplier", assignedTo: "", due: "bad-date", status: "Pending" },
    { task: "", assignedTo: "Morgan", due: "", status: "" }
  ],
  summary: ""
});
assert.equal(incomplete.ready, false);
assert.equal(incomplete.percent, 0);
assert.equal(incomplete.nextFocus, "status");
assert.deepEqual(incomplete.checkpoints.map((checkpoint) => checkpoint.key), [
  "status", "attendance", "agenda", "notes", "decisions", "tasks", "summary"
]);
assert.equal(incomplete.counts.agenda.unreviewed, 1);
assert.equal(incomplete.counts.tasks.total, 2);
assert.equal(incomplete.counts.tasks.ready, 0);
assert.equal(incomplete.counts.tasks.missingTask, 1);
assert.equal(incomplete.counts.tasks.missingAssignedTo, 1);
assert.equal(incomplete.counts.tasks.missingDueDate, 1);
assert.equal(incomplete.counts.tasks.invalidDueDate, 1);
assert.equal(incomplete.counts.tasks.missingStatus, 1);

const focused = core.buildMeetingCloseoutReview({
  status: "Completed",
  attendees: [{ name: "Morgan" }],
  agenda: [{ item: "Review", completed: true }],
  notes: "Captured",
  decisions: "None",
  tasks: [{ task: "Follow up", assignedTo: "Morgan", due: "2026-08-09", status: "Pending" }],
  summary: ""
});
assert.equal(focused.nextFocus, "summary");
assert.equal(focused.percent, 86);

const bounded = core.buildMeetingCloseoutReview({
  status: "Completed",
  attendees: [{ name: "One" }, { name: "Two" }],
  agenda: [{ item: "One", completed: true }, { item: "Two", completed: true }],
  notes: "Captured",
  decisions: "Captured",
  tasks: [
    { task: "One", assignedTo: "A", due: "2026-08-09", status: "Pending" },
    { task: "Two", assignedTo: "B", due: "2026-08-10", status: "Pending" }
  ],
  summary: "Captured"
}, { maximumAttendees: 1, maximumAgendaItems: 1, maximumTasks: 1 });
assert.deepEqual(bounded.truncation, { attendees: true, agenda: true, tasks: true });
assert.equal(bounded.ready, false, "truncated row collections must fail closed");
assert.equal(bounded.checkpoints.find((checkpoint) => checkpoint.key === "attendance").complete, false);
assert.equal(bounded.checkpoints.find((checkpoint) => checkpoint.key === "agenda").complete, false);
assert.equal(bounded.checkpoints.find((checkpoint) => checkpoint.key === "tasks").complete, false);

assert.throws(() => core.buildMeetingCloseoutReview(null), /meeting record object/);
console.log("Meeting closeout core: all assertions passed.");
