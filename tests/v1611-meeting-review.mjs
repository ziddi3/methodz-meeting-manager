import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Review = require("../meeting-review-core.js");

const today = "2026-07-28";
const tasks = [
  { task: "Overdue task", assignedTo: "A", priority: "High", due: "2026-07-27", status: "Pending" },
  { task: "Due soon", assignedTo: "B", priority: "Normal", due: "2026-08-02", status: "In Progress" },
  { task: "Unassigned", assignedTo: "", priority: "Normal", due: "2026-08-20", status: "Pending" },
  { task: "Bad date", assignedTo: "C", priority: "Normal", due: "2026-99-99", status: "Pending" },
  { task: "Done", assignedTo: "D", priority: "Low", due: "2026-07-01", status: "Completed" }
];

const review = Review.buildFollowUpReview([
  { id: "meeting-1", meetingNumber: "001", title: "Operations", date: today, updatedAt: "2026-07-28T12:00:00Z", tasks }
], { today, dueSoonDays: 7 });
assert.equal(review.counts.records, 1);
assert.equal(review.counts.tasks, 5);
assert.equal(review.counts.overdue, 1);
assert.equal(review.counts.dueSoon, 1);
assert.equal(review.counts.unassigned, 1);
assert.equal(review.counts.invalidDueDate, 1);
assert.equal(review.counts.completed, 1);
assert.equal(review.counts.attention, 4);
assert.deepEqual(review.items.map((item) => item.primary), ["overdue", "due-soon", "invalid-date", "unassigned", "completed"]);
assert.equal(Review.matchesFilter(review.items[0], "attention"), true);
assert.equal(Review.matchesFilter(review.items[4], "attention"), false);
assert.equal(Review.matchesFilter(review.items[1], "in-progress"), true);

const pulse = Review.createMeetingPulse({
  title: "Operations", date: today, organizations: ["Method HVAC Inc."],
  attendees: [{ name: "Disposable Attendee" }],
  agenda: [{ item: "Opening", completed: true }],
  notes: "Notes captured", decisions: "Decision captured",
  tasks: [{ task: "Follow up", assignedTo: "A", due: "2026-08-02", status: "Pending" }],
  summary: "Summary captured"
});
assert.equal(pulse.complete, true);
assert.equal(pulse.completionPercent, 100);
assert.equal(pulse.nextIncomplete, null);

const incompletePulse = Review.createMeetingPulse({ title: "Operations", date: today, agenda: [] });
assert.equal(incompletePulse.complete, false);
assert.equal(incompletePulse.nextIncomplete.id, "organizationsPresentPanelV1610");
assert.equal(incompletePulse.counts.totalSections, 8);

const original = [{ id: "meeting-1", tasks: [{ task: "Untouched" }] }];
const snapshot = JSON.stringify(original);
Review.buildFollowUpReview(original, { today });
assert.equal(JSON.stringify(original), snapshot, "review derivation must not mutate records");

console.log("v1.6.11 meeting review core tests passed");
