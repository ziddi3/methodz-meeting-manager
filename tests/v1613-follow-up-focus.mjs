import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Review = require("../meeting-review-core.js");

const today = "2026-07-30";
const records = [{
  id: "meeting-1",
  meetingNumber: "001",
  title: "Operations Review",
  date: today,
  updatedAt: "2026-07-30T12:00:00.000Z",
  tasks: [
    { task: "Critical overdue", assignedTo: "Alex", priority: "High", due: "2026-06-01", status: "Pending" },
    { task: "Recent overdue", assignedTo: "Blair", priority: "Normal", due: "2026-07-28", status: "Pending" },
    { task: "Invalid due", assignedTo: "Casey", priority: "Normal", due: "2026-99-99", status: "Pending" },
    { task: "Needs assignment", assignedTo: "", priority: "High", due: "2026-08-20", status: "Pending" },
    { task: "Due today", assignedTo: "Alex", priority: "Low", due: "2026-07-30", status: "In Progress" },
    { task: "Active future", assignedTo: "Casey", priority: "Normal", due: "2026-08-20", status: "In Progress" },
    { task: "Completed", assignedTo: "Alex", priority: "High", due: "2026-07-01", status: "Completed" }
  ]
}];

const review = Review.buildFollowUpReview(records, { today, dueSoonDays: 7 });
const before = JSON.stringify(review);
const focus = Review.buildFollowUpFocus(review, { today, maximumItems: 5, maximumAssignees: 3 });

assert.equal(Review.version, "1.1.0");
assert.equal(focus.reportType, "methodz-follow-up-focus");
assert.equal(focus.reportVersion, "1.0.0");
assert.equal(focus.today, today);
assert.equal(focus.counts.actionable, 6);
assert.equal(focus.counts.urgent, 2);
assert.equal(focus.counts.needsSetup, 2);
assert.equal(focus.counts.dueSoon, 1);
assert.equal(focus.counts.active, 1);
assert.equal(focus.counts.unassigned, 1);
assert.equal(focus.totalItems, 6);
assert.equal(focus.focusItems.length, 5);
assert.equal(focus.truncated, true);
assert.equal(focus.focusItems[0].task, "Critical overdue");
assert.equal(focus.focusItems[0].focus.band, "urgent");
assert.ok(focus.focusItems[0].focus.reasons.includes("59 days overdue"));
assert.ok(focus.focusItems[0].focus.reasons.includes("High priority"));
assert.equal(focus.focusItems.some((item) => item.task === "Completed"), false);
assert.equal(focus.nextAction.task, "Critical overdue");
assert.equal(focus.assigneeLoads[0].assignedTo, "Unassigned");
assert.equal(focus.assigneeLoads[0].missingAssignment, true);
assert.equal(focus.assigneeLoads.length, 3);
assert.equal(focus.assigneeLoadsTruncated, true);
assert.equal(JSON.stringify(review), before, "focus derivation must not mutate the review report");

const bounded = Review.buildFollowUpFocus(review, { today, maximumItems: 0, maximumAssignees: 1000 });
assert.equal(bounded.maximumItems, 1);
assert.equal(bounded.focusItems.length, 1);
assert.ok(bounded.assigneeLoads.length <= 50);

const empty = Review.buildFollowUpFocus({}, { today });
assert.equal(empty.counts.actionable, 0);
assert.equal(empty.nextAction, null);
assert.deepEqual(empty.focusItems, []);

console.log("follow-up focus core tests passed");
