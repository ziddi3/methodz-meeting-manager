import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const core = require("../meeting-outcomes-core.js");

const records = [
  {
    id: "ready",
    meetingNumber: "001",
    title: "Ready Outcome",
    status: "Completed",
    date: "2026-08-05",
    summary: "SECRET_SUMMARY",
    decisions: "SECRET_FREEFORM",
    decisionsList: [{ decision: "SECRET_DECISION", approvedBy: "Group", date: "2026-08-05", status: "Approved", notes: "SECRET_CONDITION" }],
    tasks: [{ task: "SECRET_TASK", assignedTo: "SECRET_PERSON", due: "2026-08-06", status: "Completed" }],
    attendees: [{ name: "SECRET_ATTENDEE", signature: "SECRET_SIGNATURE" }]
  },
  {
    id: "summary",
    meetingNumber: "002",
    title: "Summary Gap",
    status: "Archived",
    date: "2026-08-04",
    summary: "",
    decisionsList: [{ decision: "Recorded", approvedBy: "Group", date: "2026-08-04", status: "Approved" }],
    tasks: [{ task: "Done", assignedTo: "Group", due: "2026-08-04", status: "Completed" }]
  },
  {
    id: "decision",
    meetingNumber: "003",
    title: "Decision Gap",
    status: "Completed",
    date: "2026-08-03",
    summary: "Present",
    decisions: "Free-form only must not be copied",
    decisionsList: [],
    tasks: [{ task: "Done", assignedTo: "Group", due: "2026-08-04", status: "Completed" }]
  },
  {
    id: "follow-up",
    meetingNumber: "004",
    title: "Follow-Up Gap",
    status: "Completed",
    date: "2026-08-02",
    summary: "Present",
    decisionsList: [{ decision: "Recorded", approvedBy: "Group", date: "2026-08-02", status: "Approved" }],
    tasks: [{ task: "Open", assignedTo: "", due: "bad-date", status: "Pending" }]
  },
  {
    id: "multiple",
    meetingNumber: "005",
    title: "Multiple Gaps",
    status: "Completed",
    date: "2026-08-01",
    summary: "",
    decisionsList: [{ decision: "", approvedBy: "", date: "2026-02-30", status: "Approved" }],
    tasks: []
  },
  {
    id: "scheduled",
    title: "Not Eligible",
    status: "Scheduled",
    date: "2026-08-06",
    summary: "Present"
  }
];

const before = JSON.stringify(records);
const report = core.buildMeetingOutcomes(records, {
  generatedAt: "2026-08-05T12:00:00.000Z",
  maximumRecords: 20,
  maximumDecisionsPerRecord: 20,
  maximumTasksPerRecord: 20
});

assert.equal(core.version, "1.0.0");
assert.equal(report.reportType, "methodz-meeting-outcomes-review");
assert.equal(report.generatedAt, "2026-08-05T12:00:00.000Z");
assert.equal(report.counts.savedRecords, 6);
assert.equal(report.counts.eligibleMeetings, 5);
assert.equal(report.counts.ready, 1);
assert.equal(report.counts.needsSummary, 1);
assert.equal(report.counts.needsDecisionReview, 1);
assert.equal(report.counts.needsFollowUpReview, 1);
assert.equal(report.counts.needsMultipleReviews, 1);
assert.equal(report.counts.openTasks, 1);
assert.equal(report.meetings[0].title, "Ready Outcome");
assert.equal(report.meetings.find((meeting) => meeting.id)?.title, undefined);
assert.equal(report.meetings.find((meeting) => meeting.title === "Decision Gap").firstReviewTarget, "decisions");
assert.equal(report.meetings.find((meeting) => meeting.title === "Follow-Up Gap").firstReviewTarget, "tasks");
assert.equal(report.meetings.find((meeting) => meeting.title === "Multiple Gaps").firstReviewTarget, "summary");
assert.equal(report.meetings.find((meeting) => meeting.title === "Follow-Up Gap").taskCounts.setupIssues, 1);
assert.equal(JSON.stringify(records), before, "source records must remain immutable");

const serialized = JSON.stringify(report);
for (const forbidden of [
  "SECRET_SUMMARY",
  "SECRET_FREEFORM",
  "SECRET_DECISION",
  "SECRET_CONDITION",
  "SECRET_TASK",
  "SECRET_PERSON",
  "SECRET_ATTENDEE",
  "SECRET_SIGNATURE"
]) {
  assert.equal(serialized.includes(forbidden), false, `report leaked ${forbidden}`);
}

const bounded = core.buildMeetingOutcomes(records, {
  generatedAt: "2026-08-05T12:00:00.000Z",
  maximumRecords: 1,
  maximumDecisionsPerRecord: 1,
  maximumTasksPerRecord: 1
});
assert.equal(bounded.truncation.records, true);
assert.equal(bounded.meetings.length, 1);

const longRecord = {
  id: "long",
  title: "Bounded Lists",
  status: "Completed",
  date: "2026-08-05",
  summary: "Present",
  decisionsList: [
    { decision: "One", approvedBy: "Group", date: "2026-08-05", status: "Approved" },
    { decision: "Two", approvedBy: "Group", date: "2026-08-05", status: "Approved" }
  ],
  tasks: [
    { task: "One", assignedTo: "Group", due: "2026-08-05", status: "Completed" },
    { task: "Two", assignedTo: "Group", due: "2026-08-05", status: "Completed" }
  ]
};
const boundedLists = core.buildMeetingOutcomes([longRecord], {
  maximumRecords: 5,
  maximumDecisionsPerRecord: 1,
  maximumTasksPerRecord: 1,
  generatedAt: "2026-08-05T12:00:00.000Z"
});
assert.equal(boundedLists.truncation.decisionLists, 1);
assert.equal(boundedLists.truncation.taskLists, 1);
assert.equal(boundedLists.meetings[0].outcomeState, "needs-multiple-reviews");

assert.equal(core.dateOnly("2026-02-29"), null);
assert.equal(core.dateOnly("2028-02-29")?.raw, "2028-02-29");
assert.equal(core.classifyDecision({ decision: "X", approvedBy: "Y", date: "2026-08-05", status: "Recorded" }).lane, "other");
assert.equal(core.taskState({ task: "X", assignedTo: "", due: "bad", status: "Pending" }).setupIssues.length, 2);

const launch = require("../meeting-preparation-launch-core.js");
const outcomeHash = launch.createPreparationLaunchHash("outcome/1", "tasks", "outcomes");
assert.equal(outcomeHash, "#prepare-record=outcome%2F1&focus=tasks&from=outcomes");
const parsedOutcome = launch.parsePreparationLaunchHash(outcomeHash);
assert.equal(parsedOutcome.valid, true);
assert.equal(parsedOutcome.sourceKey, "outcomes");
assert.equal(parsedOutcome.source.returnHref, "outcomes.html");
assert.equal(parsedOutcome.target.panelId, "followUpTasksPanelV1610");
assert.equal(launch.parsePreparationLaunchHash("#prepare-record=x&focus=summary&from=outcomes").target.selector, "#summary");

console.log("Meeting Outcomes portable tests passed.");
