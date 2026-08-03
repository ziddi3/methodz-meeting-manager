import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const core = require("../meeting-run-sheet-core.js");

assert.equal(core.version, "1.0.0");

const record = {
  id: "meeting-1",
  meetingNumber: "044",
  title: "Installation Readiness",
  status: "Scheduled",
  date: "2026-08-08",
  location: "Shop boardroom",
  facilitator: "Morgan",
  organizations: ["Canadian Soft Water Corporation", "Method HVAC Inc."],
  attendees: [
    { name: "Morgan", organizationRole: "Facilitator", consent: true, signature: "SECRET-SIGNATURE" },
    { name: "Alex", organizationRole: "Install Lead", privateKey: "SECRET-PRIVATE-KEY" }
  ],
  agenda: [
    { group: "Installations", item: "Confirm equipment and route", completed: false, notes: "SECRET-AGENDA-NOTE" },
    { group: "Safety", item: "Review site constraints", completed: true }
  ],
  notes: "SECRET-MEETING-NOTES",
  decisions: "SECRET-DECISIONS",
  summary: "SECRET-SUMMARY",
  attachments: [{ name: "SECRET-ATTACHMENT" }],
  credentials: { token: "SECRET-TOKEN" },
  syncQueue: [{ payload: "SECRET-QUEUE" }]
};
const original = structuredClone(record);
const carryovers = {
  total: 3,
  truncated: true,
  items: [
    { task: "Confirm supplier", assignedTo: "Alex", due: "2026-08-07", status: "Pending", priority: "High", sourceMeetingTitle: "Earlier Review", sourceMeetingDate: "2026-08-01", dueState: "scheduled", secret: "SECRET-CARRYOVER" },
    { task: "Choose alternate date", assignedTo: "", due: "", status: "Pending", sourceMeetingTitle: "Earlier Review", dueState: "missing" }
  ]
};

const sheet = core.buildMeetingRunSheet(record, { carryovers, maximumCarryovers: 1 });
assert.equal(sheet.reportType, "methodz-meeting-run-sheet");
assert.equal(sheet.reportVersion, "1.0.0");
assert.equal(sheet.meeting.title, "Installation Readiness");
assert.equal(sheet.readiness.percent, 100);
assert.deepEqual(sheet.organizations, ["Canadian Soft Water Corporation", "Method HVAC Inc."]);
assert.deepEqual(sheet.attendees, [
  { name: "Morgan", organizationRole: "Facilitator" },
  { name: "Alex", organizationRole: "Install Lead" }
]);
assert.equal(sheet.agenda.length, 2);
assert.equal(sheet.agenda[0].item, "Confirm equipment and route");
assert.equal(sheet.carryovers.total, 3);
assert.equal(sheet.carryovers.items.length, 1);
assert.equal(sheet.carryovers.truncated, true);
assert.deepEqual(record, original, "run-sheet derivation must not mutate the source record");

const serialized = JSON.stringify(sheet);
for (const forbidden of [
  "SECRET-SIGNATURE",
  "SECRET-PRIVATE-KEY",
  "SECRET-AGENDA-NOTE",
  "SECRET-MEETING-NOTES",
  "SECRET-DECISIONS",
  "SECRET-SUMMARY",
  "SECRET-ATTACHMENT",
  "SECRET-TOKEN",
  "SECRET-QUEUE",
  "SECRET-CARRYOVER",
  "meeting-1"
]) {
  assert.equal(serialized.includes(forbidden), false, `${forbidden} leaked into the run sheet`);
}

const incomplete = core.buildMeetingRunSheet({ title: "", date: "bad", attendees: [{ organizationRole: "Observer" }], agenda: [] });
assert.equal(incomplete.readiness.percent, 0);
assert.deepEqual(incomplete.readiness.missing, [
  "Meeting title",
  "Meeting date",
  "Location or video link",
  "Meeting facilitator",
  "Organizations present",
  "Attendee setup",
  "Agenda setup"
]);

const bounded = core.buildMeetingRunSheet({
  title: "Bounded",
  date: "2026-08-09",
  location: "Office",
  facilitator: "Sam",
  organizations: ["A", "B"],
  attendees: [{ name: "One" }, { name: "Two" }],
  agenda: [{ item: "One" }, { item: "Two" }]
}, { maximumOrganizations: 1, maximumAttendees: 1, maximumAgendaItems: 1 });
assert.equal(bounded.organizations.length, 1);
assert.equal(bounded.attendees.length, 1);
assert.equal(bounded.agenda.length, 1);
assert.deepEqual(bounded.truncation, { organizations: true, attendees: true, agenda: true });
assert.throws(() => core.buildMeetingRunSheet(null), /saved meeting record object/);

console.log("Meeting run-sheet core: all assertions passed.");
