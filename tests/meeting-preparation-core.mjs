import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const core = require("../meeting-preparation-core.js");

assert.equal(core.version, "1.0.0");
assert.deepEqual(core.dateOnly("2026-02-29"), null);
assert.equal(core.dateOnly("2028-02-29").raw, "2028-02-29");

const records = [
  {
    id: "historical-source",
    meetingNumber: "001",
    title: "Earlier Operations Review",
    status: "Completed",
    date: "2026-07-20",
    notes: "SECRET-NOTE-MUST-NOT-LEAK",
    decisions: "SECRET-DECISION-MUST-NOT-LEAK",
    summary: "SECRET-SUMMARY-MUST-NOT-LEAK",
    attendees: [{ name: "Prior Attendee", signature: "SECRET-SIGNATURE-MUST-NOT-LEAK", consent: true }],
    privateKey: "SECRET-PRIVATE-KEY-MUST-NOT-LEAK",
    credentials: { token: "SECRET-TOKEN-MUST-NOT-LEAK" },
    tasks: [
      { task: "Confirm supplier response", assignedTo: "Alex", priority: "High", due: "2026-08-01", status: "Pending" },
      { task: "Choose installation date", assignedTo: "", priority: "Normal", due: "", status: "Pending" },
      { task: "Repair invalid schedule", assignedTo: "Sam", priority: "Critical", due: "not-a-date", status: "In Progress" },
      { task: "Prepare later invoice", assignedTo: "Taylor", priority: "Low", due: "2026-08-10", status: "Pending" },
      { task: "Already closed", assignedTo: "Alex", priority: "High", due: "2026-07-25", status: "Completed" }
    ]
  },
  {
    id: "meeting-a",
    meetingNumber: "002",
    title: "Partner Planning",
    status: "Scheduled",
    date: "2026-08-05",
    location: "",
    facilitator: "",
    organizations: ["Method HVAC Inc."],
    attendees: [],
    agenda: [{ group: "Operations", item: "Review pipeline", completed: false }],
    tasks: [{ task: "Target meeting task", assignedTo: "Zid", due: "2026-08-05", status: "Pending" }]
  },
  {
    id: "meeting-b",
    meetingNumber: "003",
    title: "Customer Installation Review",
    status: "Scheduled",
    date: "2026-08-05",
    location: "Office",
    facilitator: "Morgan",
    organizations: ["Canadian Soft Water Corporation"],
    attendees: [{ name: "Morgan", organizationRole: "Facilitator", signature: "NOT-EXPORTED" }],
    agenda: [{ group: "Installations", item: "Confirm schedule", completed: false }],
    tasks: []
  },
  {
    id: "meeting-undated",
    meetingNumber: "004",
    title: "Needs Scheduling",
    status: "In Progress",
    date: "invalid-date",
    location: "Remote",
    facilitator: "Jordan",
    organizations: [],
    attendees: [],
    agenda: []
  },
  {
    id: "meeting-outside-horizon",
    meetingNumber: "005",
    title: "Later Meeting",
    status: "Scheduled",
    date: "2026-08-20",
    location: "Office",
    facilitator: "Jordan",
    organizations: ["Method HVAC Inc."],
    attendees: [{ name: "Jordan" }],
    agenda: [{ item: "Later work" }]
  },
  {
    id: "archived-meeting",
    meetingNumber: "006",
    title: "Archived Meeting",
    status: "Archived",
    date: "2026-08-04"
  }
];

const original = structuredClone(records);
const report = core.buildMeetingPreparationBrief(records, {
  today: "2026-08-01",
  horizonDays: 14,
  maximumMeetings: 40,
  maximumCarryovers: 20
});

assert.equal(report.reportType, "methodz-meeting-preparation-brief");
assert.equal(report.reportVersion, "1.0.0");
assert.equal(report.today, "2026-08-01");
assert.equal(report.horizonEnd, "2026-08-15");
assert.equal(report.counts.savedRecords, 6);
assert.equal(report.counts.activeMeetings, 4);
assert.equal(report.counts.inBrief, 3);
assert.equal(report.counts.upcoming, 2);
assert.equal(report.counts.needsScheduling, 1);
assert.equal(report.counts.needsPreparation, 2);
assert.equal(report.counts.scheduleCollisions, 2);
assert.equal(report.counts.carryoverTasks, 6);
assert.equal(report.truncated, false);

assert.deepEqual(report.meetings.map((meeting) => meeting.recordId), ["meeting-undated", "meeting-a", "meeting-b"]);

const undated = report.meetings[0];
assert.equal(undated.lane, "needs-scheduling");
assert.equal(undated.daysUntilMeeting, null);
assert.equal(undated.carryovers.total, 0);
assert.ok(undated.readiness.missing.includes("Meeting date"));

const meetingA = report.meetings[1];
assert.equal(meetingA.readiness.completed, 4);
assert.equal(meetingA.readiness.total, 7);
assert.equal(meetingA.readiness.percent, 57);
assert.deepEqual(meetingA.readiness.missing, ["Location or video link", "Meeting facilitator", "Attendee setup"]);
assert.equal(meetingA.scheduleCollision, true);
assert.equal(meetingA.sameDayMeetingCount, 2);
assert.equal(meetingA.daysUntilMeeting, 4);
assert.equal(meetingA.carryovers.total, 3);
assert.equal(meetingA.carryovers.items.some((item) => item.task === "Target meeting task"), false);
assert.equal(meetingA.carryovers.items.some((item) => item.task === "Prepare later invoice"), false);
assert.equal(meetingA.carryovers.items.some((item) => item.task === "Already closed"), false);
assert.deepEqual(new Set(meetingA.carryovers.items.map((item) => item.dueState)), new Set(["scheduled", "missing", "invalid"]));

const meetingB = report.meetings[2];
assert.equal(meetingB.readiness.percent, 100);
assert.equal(meetingB.scheduleCollision, true);
assert.equal(meetingB.carryovers.total, 3);

assert.deepEqual(records, original, "the preparation core must not mutate source records");

const serialized = JSON.stringify(report);
for (const forbidden of [
  "SECRET-NOTE-MUST-NOT-LEAK",
  "SECRET-DECISION-MUST-NOT-LEAK",
  "SECRET-SUMMARY-MUST-NOT-LEAK",
  "SECRET-SIGNATURE-MUST-NOT-LEAK",
  "SECRET-PRIVATE-KEY-MUST-NOT-LEAK",
  "SECRET-TOKEN-MUST-NOT-LEAK"
]) {
  assert.equal(serialized.includes(forbidden), false, `${forbidden} leaked into the report`);
}

const bounded = core.buildMeetingPreparationBrief(records, {
  today: "2026-08-01",
  horizonDays: 14,
  maximumMeetings: 1,
  maximumCarryovers: 2
});
assert.equal(bounded.truncated, true);
assert.equal(bounded.meetings.length, 1);

const boundedCarryovers = core.buildMeetingPreparationBrief(records, {
  today: "2026-08-01",
  horizonDays: 14,
  maximumMeetings: 40,
  maximumCarryovers: 2
}).meetings.find((meeting) => meeting.recordId === "meeting-a").carryovers;
assert.equal(boundedCarryovers.total, 3);
assert.equal(boundedCarryovers.items.length, 2);
assert.equal(boundedCarryovers.truncated, true);

console.log("Meeting Preparation Brief core: all assertions passed.");
