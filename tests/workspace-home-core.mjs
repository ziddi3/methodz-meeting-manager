import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const core = require("../workspace-home-core.js");

assert.equal(core.version, "1.0.0");
assert.equal(core.dateOnly("2026-02-29"), null);
assert.equal(core.dateOnly("2028-02-29")?.raw, "2028-02-29");

const sensitiveValues = [
  "Secret Board Meeting",
  "attendee-sentinel",
  "private-note-sentinel",
  "decision-sentinel",
  "summary-sentinel",
  "task-text-sentinel",
  "assigned-to-sentinel",
  "record-id-sentinel",
  "signature-sentinel",
  "credential-sentinel",
  "private-key-sentinel",
  "provider-secret-sentinel",
  "queue-payload-sentinel",
  "governance-sentinel"
];

const records = [
  {
    id: "record-id-sentinel",
    title: "Secret Board Meeting",
    date: "2026-08-07",
    status: "Scheduled",
    attendees: [{ name: "attendee-sentinel" }],
    notes: "private-note-sentinel",
    decisions: [{ decision: "decision-sentinel" }],
    summary: "summary-sentinel",
    signature: "signature-sentinel",
    credential: "credential-sentinel",
    privateKey: "private-key-sentinel",
    providerSecret: "provider-secret-sentinel",
    queuePayload: "queue-payload-sentinel",
    governance: "governance-sentinel",
    tasks: [
      { task: "task-text-sentinel", assignedTo: "", due: "2026-08-05", status: "Pending" },
      { task: "Second task", assignedTo: "assigned-to-sentinel", due: "not-a-date", status: "In Progress" },
      { task: "Finished task", assignedTo: "Someone", due: "2026-08-01", status: "Completed" },
      { task: "", assignedTo: "", due: "", status: "Pending", priority: "Normal" }
    ]
  },
  {
    id: "active-unscheduled",
    title: "Unscheduled",
    date: "",
    status: "Draft",
    tasks: []
  },
  {
    id: "completed",
    title: "Completed source",
    date: "2026-08-01",
    status: "Completed",
    tasks: [{ task: "Ignored finished-meeting task", due: "2026-07-01", status: "Pending" }]
  },
  {
    id: "archived",
    title: "Archived source",
    date: "2026-07-01",
    status: "Archived",
    tasks: []
  },
  {
    id: "cancelled",
    title: "Cancelled source",
    date: "2026-08-09",
    status: "Cancelled",
    tasks: []
  }
];

const before = JSON.stringify(records);
const snapshot = core.buildWorkspaceSnapshot(records, { today: "2026-08-06" });

assert.equal(snapshot.reportType, "methodz-workspace-launch-snapshot");
assert.equal(snapshot.today, "2026-08-06");
assert.deepEqual(snapshot.counts, {
  savedRecords: 5,
  processedRecords: 5,
  activeMeetings: 2,
  completedMeetings: 1,
  archivedMeetings: 1,
  upcomingMeetings: 1,
  unscheduledMeetings: 1,
  incompleteTasks: 2,
  overdueTasks: 1,
  unassignedTasks: 1,
  needsSchedulingTasks: 1
});
assert.deepEqual(snapshot.truncated, { records: false, taskLists: false, taskListsTruncated: 0 });
assert.equal(JSON.stringify(records), before, "source records must not be mutated");

const serialized = JSON.stringify(snapshot);
sensitiveValues.forEach((value) => assert.equal(serialized.includes(value), false, `snapshot leaked ${value}`));
assert.equal(/recordId|meetingTitle|attendee|signature|decisionText|summaryText|taskText|assignedTo|credential|privateKey|providerSecret|queuePayload|governance/i.test(serialized), false);

const bounded = core.buildWorkspaceSnapshot([
  {
    status: "Scheduled",
    date: "2026-08-08",
    tasks: [
      { task: "one", due: "2026-08-05", status: "Pending" },
      { task: "two", due: "", status: "Pending" }
    ]
  },
  { status: "Completed", tasks: [] },
  { status: "Archived", tasks: [] }
], {
  today: "2026-08-06",
  maximumRecords: 1,
  maximumTasksPerRecord: 1
});

assert.equal(bounded.counts.savedRecords, 3);
assert.equal(bounded.counts.processedRecords, 1);
assert.equal(bounded.counts.activeMeetings, 1);
assert.equal(bounded.counts.incompleteTasks, 1);
assert.equal(bounded.counts.overdueTasks, 1);
assert.equal(bounded.truncated.records, true);
assert.equal(bounded.truncated.taskLists, true);
assert.equal(bounded.truncated.taskListsTruncated, 1);
assert.deepEqual(bounded.bounds, { maximumRecords: 1, maximumTasksPerRecord: 1 });

const empty = core.buildWorkspaceSnapshot(null, { today: "2026-08-06" });
assert.equal(empty.counts.savedRecords, 0);
assert.equal(empty.counts.activeMeetings, 0);

console.log("Workspace Home portable tests passed.");
