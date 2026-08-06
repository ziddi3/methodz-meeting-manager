import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const core = require("../workspace-home-core.js");

assert.equal(core.version, "1.0.0");
assert.equal(core.statusLane({ status: "Archived" }), "archived");
assert.equal(core.statusLane({ status: "Completed" }), "completed");
assert.equal(core.statusLane({ status: "Planned" }), "active");
assert.equal(core.dateOnly("2026-02-29"), null);
assert.equal(core.dateOnly("2028-02-29").raw, "2028-02-29");

const records = [
  {
    id: "sensitive-active-id",
    title: "Private acquisition meeting",
    status: "Planned",
    date: "2026-08-10",
    attendees: [{ name: "Sensitive Person" }],
    tasks: [
      { task: "Sensitive task A", assignedTo: "", due: "2026-08-05", status: "Open" },
      { task: "Sensitive task B", assignedTo: "Alex", due: "", status: "Open" },
      { task: "Done", assignedTo: "Alex", due: "2026-08-01", status: "Completed" }
    ]
  },
  { status: "In Progress", date: "", tasks: [{ task: "Future", assignedTo: "Dana", due: "2026-08-20", status: "Open" }] },
  { status: "Completed", date: "2026-08-01", summary: "Sensitive summary", tasks: [{ task: "Follow up", assignedTo: "", due: "2026-08-06", status: "Open" }] },
  { status: "Archived", date: "2026-07-01", tasks: [{ task: "Archived task", assignedTo: "", due: "2026-07-01", status: "Open" }] }
];

const snapshot = core.buildWorkspaceSnapshot(records, { today: "2026-08-06", generatedAt: "2026-08-06T12:00:00Z" });
assert.deepEqual(snapshot.counts, {
  savedRecords: 4,
  scannedRecords: 4,
  activeMeetings: 2,
  completedMeetings: 1,
  archivedMeetings: 1,
  upcoming7Days: 1,
  upcoming30Days: 1,
  activeUnscheduled: 1,
  incompleteTasks: 4,
  overdueTasks: 1,
  unassignedTasks: 2,
  tasksNeedingSchedule: 1
});
assert.equal(snapshot.complete, true);
assert.equal(JSON.stringify(snapshot).includes("Private acquisition"), false);
assert.equal(JSON.stringify(snapshot).includes("Sensitive Person"), false);
assert.equal(JSON.stringify(snapshot).includes("Sensitive task"), false);
assert.equal(JSON.stringify(snapshot).includes("sensitive-active-id"), false);

const original = JSON.stringify(records);
core.buildWorkspaceSnapshot(records, { today: "2026-08-06" });
assert.equal(JSON.stringify(records), original, "snapshot derivation must not mutate source records");

const bounded = core.buildWorkspaceSnapshot([
  { status: "Planned", tasks: [{ task: "A" }, { task: "B" }] },
  { status: "Completed", tasks: [] }
], { today: "2026-08-06", maximumRecords: 1, maximumTasksPerRecord: 1 });
assert.equal(bounded.counts.savedRecords, 2);
assert.equal(bounded.counts.scannedRecords, 1);
assert.equal(bounded.truncation.records, true);
assert.equal(bounded.truncation.taskLists, 1);
assert.equal(bounded.complete, false);
assert.equal(bounded.counts.incompleteTasks, 1);

console.log("Workspace Home core tests passed.");
