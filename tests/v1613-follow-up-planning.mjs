import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Review = require("../meeting-review-core.js");
const Planning = require("../follow-up-planning-core.js");

const today = "2026-07-31";
const records = [{
  id: "meeting-1",
  meetingNumber: "001",
  title: "Operations Planning",
  date: today,
  updatedAt: "2026-07-31T12:00:00.000Z",
  tasks: [
    { task: "Critical overdue", assignedTo: "Alex", priority: "High", due: "2026-07-01", status: "Pending" },
    { task: "Recent overdue", assignedTo: "Blair", priority: "Normal", due: "2026-07-30", status: "In Progress" },
    { task: "Due today", assignedTo: "Alex", priority: "Low", due: "2026-07-31", status: "Pending" },
    { task: "Tomorrow", assignedTo: "Casey", priority: "High", due: "2026-08-01", status: "Pending" },
    { task: "Window edge", assignedTo: "Casey", priority: "Normal", due: "2026-08-07", status: "Pending" },
    { task: "Missing due", assignedTo: "", priority: "High", due: "", status: "Pending" },
    { task: "Invalid due", assignedTo: "Dana", priority: "Normal", due: "2026-99-99", status: "Pending" },
    { task: "Later task", assignedTo: "Alex", priority: "Normal", due: "2026-09-01", status: "Pending" },
    { task: "Completed", assignedTo: "Alex", priority: "High", due: "2026-07-10", status: "Completed" }
  ]
}];

const review = Review.buildFollowUpReview(records, { today, dueSoonDays: 7 });
const before = JSON.stringify(review);
const brief = Planning.buildFollowUpPlanningBrief(review, {
  today,
  horizonDays: 7,
  maximumItems: 6,
  maximumAssignees: 3
});

assert.equal(Planning.version, "1.0.0");
assert.equal(brief.reportType, "methodz-follow-up-planning-brief");
assert.equal(brief.reportVersion, "1.0.0");
assert.equal(brief.today, today);
assert.equal(brief.horizonDays, 7);
assert.equal(brief.horizonEnd, "2026-08-07");
assert.equal(brief.counts.actionable, 8);
assert.equal(brief.counts.overdue, 2);
assert.equal(brief.counts.dueToday, 1);
assert.equal(brief.counts.withinWindow, 2);
assert.equal(brief.counts.needsScheduling, 2);
assert.equal(brief.counts.later, 1);
assert.equal(brief.counts.unassigned, 1);
assert.equal(brief.totalItems, 8);
assert.equal(brief.items.length, 6);
assert.equal(brief.truncated, true);
assert.equal(brief.items[0].task, "Critical overdue");
assert.equal(brief.items[0].planning.lane, "overdue");
assert.ok(brief.items[0].planning.reasons.includes("30 days overdue"));
assert.ok(brief.items[0].planning.reasons.includes("High priority"));
assert.equal(brief.items.some((item) => item.task === "Completed"), false);
assert.equal(brief.lanes.find((lane) => lane.id === "needs-scheduling").count, 2);
assert.equal(brief.lanes.find((lane) => lane.id === "later").count, 1);
assert.equal(brief.assigneeLoads[0].assignedTo, "Unassigned");
assert.equal(brief.assigneeLoads[0].missingAssignment, true);
assert.equal(brief.assigneeLoads.length, 3);
assert.equal(brief.assigneeLoadsTruncated, true);
assert.equal(brief.boundaries.containsTaskAndMeetingData, true);
assert.equal(brief.boundaries.containsSignatures, false);
assert.equal(brief.boundaries.automaticRecordMutation, false);
assert.equal(brief.boundaries.automaticAssignment, false);
assert.equal(brief.boundaries.automaticDelivery, false);
assert.equal(brief.boundaries.automaticSynchronization, false);
assert.equal(JSON.stringify(review), before, "planning derivation must not mutate the review report");

const fourteenDays = Planning.buildFollowUpPlanningBrief(review, { today, horizonDays: 14 });
assert.equal(fourteenDays.horizonEnd, "2026-08-14");
assert.equal(fourteenDays.counts.withinWindow, 2);

const bounded = Planning.buildFollowUpPlanningBrief(review, {
  today,
  horizonDays: 0,
  maximumItems: 0,
  maximumAssignees: 1000
});
assert.equal(bounded.horizonDays, 1);
assert.equal(bounded.maximumItems, 1);
assert.equal(bounded.items.length, 1);
assert.ok(bounded.assigneeLoads.length <= 100);

const empty = Planning.buildFollowUpPlanningBrief({}, { today });
assert.equal(empty.counts.actionable, 0);
assert.deepEqual(empty.items, []);
assert.deepEqual(empty.assigneeLoads, []);
assert.equal(empty.lanes.every((lane) => lane.count === 0), true);

console.log("follow-up planning core tests passed");
