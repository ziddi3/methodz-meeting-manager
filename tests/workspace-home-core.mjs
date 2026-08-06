import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const core = require("../workspace-home-core.js");

assert.equal(core.version, "1.0.0");
assert.equal(core.dateOnly("2026-08-06")?.raw, "2026-08-06");
assert.equal(core.dateOnly("2026-02-30"), null);

const records = [
  {
    id: "active-future-secret-id",
    title: "Private Future Meeting",
    status: "Scheduled",
    date: "2026-08-10",
    attendees: [{ name: "Sensitive Person" }],
    notes: "Sensitive notes",
    decisions: "Sensitive decision prose",
    summary: "Sensitive summary",
    tasks: [
      { task: "Sensitive overdue task", assignedTo: "", due: "2026-08-05", status: "Pending" },
      { task: "Sensitive scheduling task", assignedTo: "Sensitive Assignee", due: "", status: "In Progress" },
      { task: "Sensitive completed task", assignedTo: "Sensitive Assignee", due: "2026-08-01", status: "Completed" }
    ]
  },
  {
    id: "active-unscheduled-secret-id",
    title: "Private Unscheduled Meeting",
    status: "In Progress",
    date: "",
    tasks: [
      { task: "Sensitive task", assignedTo: "", due: "not-a-date", status: "Pending" }
    ]
  },
  {
    id: "completed-secret-id",
    title: "Private Completed Meeting",
    status: "Completed",
    date: "2026-08-04",
    tasks: [
      { task: "Sensitive carryover", assignedTo: "Sensitive Assignee", due: "2026-08-01", status: "Pending" }
    ]
  },
  {
    id: "archive-secret-id",
    title: "Private Archive",
    status: "Archived",
    date: "2026-07-01",
    tasks: [
      { task: "Archived sensitive task", assignedTo: "", due: "2026-07-01", status: "Pending" }
    ]
  },
  {
    id: "cancelled-secret-id",
    title: "Private Cancelled",
    status: "Cancelled",
    date: "2026-08-20",
    tasks: [
      { task: "Cancelled sensitive task", assignedTo: "", due: "2026-08-01", status: "Pending" }
    ]
  }
];

const before = JSON.stringify(records);
const snapshot = core.buildWorkspaceSnapshot(records, {
  today: "2026-08-06",
  generatedAt: "2026-08-06T22:00:00.000Z"
});

assert.deepEqual(snapshot.counts, {
  savedRecords: 5,
  scannedRecords: 5,
  activeMeetings: 2,
  completedMeetings: 1,
  archivedMeetings: 1,
  upcomingMeetings: 1,
  unscheduledMeetings: 1,
  incompleteTasks: 4,
  overdueTasks: 2,
  unassignedTasks: 2,
  needsSchedulingTasks: 2,
  scannedTasks: 5
});
assert.deepEqual(snapshot.truncation, { records: false, taskLists: 0 });
assert.equal(JSON.stringify(records), before, "snapshot derivation must not mutate source records");

const serialized = JSON.stringify(snapshot);
for (const prohibited of [
  "active-future-secret-id",
  "Private Future Meeting",
  "Sensitive Person",
  "Sensitive notes",
  "Sensitive decision prose",
  "Sensitive summary",
  "Sensitive overdue task",
  "Sensitive Assignee"
]) {
  assert.equal(serialized.includes(prohibited), false, `snapshot leaked protected source content: ${prohibited}`);
}

const bounded = core.buildWorkspaceSnapshot([
  { status: "Scheduled", date: "2026-08-07", tasks: [{ task: "A", status: "Pending" }, { task: "B", status: "Pending" }] },
  { status: "Scheduled", date: "", tasks: [] },
  { status: "Completed", tasks: [] }
], {
  today: "2026-08-06",
  maximumRecords: 2,
  maximumTasksPerRecord: 1
});

assert.equal(bounded.counts.savedRecords, 3);
assert.equal(bounded.counts.scannedRecords, 2);
assert.equal(bounded.counts.scannedTasks, 1);
assert.equal(bounded.truncation.records, true);
assert.equal(bounded.truncation.taskLists, 1);

const empty = core.buildWorkspaceSnapshot(null, { today: "2026-08-06" });
assert.equal(empty.counts.savedRecords, 0);
assert.equal(empty.counts.activeMeetings, 0);
assert.equal(empty.counts.incompleteTasks, 0);

console.log("Workspace Home portable core tests passed.");
