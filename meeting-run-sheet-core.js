/* Portable, read-only meeting run-sheet derivation for Methodz Meeting Manager. */
(function exposeMethodzMeetingRunSheetCore(root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MethodzMeetingRunSheetCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createMethodzMeetingRunSheetCore() {
  "use strict";

  const VERSION = "1.0.0";
  const REQUIREMENTS = Object.freeze([
    ["title", "Meeting title"],
    ["date", "Meeting date"],
    ["location", "Location or video link"],
    ["facilitator", "Meeting facilitator"],
    ["organizations", "Organizations present"],
    ["attendees", "Attendee setup"],
    ["agenda", "Agenda setup"]
  ]);

  const text = (value) => String(value ?? "").trim();

  function boundedInteger(value, fallback, minimum, maximum) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.min(maximum, Math.max(minimum, Math.trunc(numeric)));
  }

  function dateOnly(value) {
    const raw = text(value);
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const milliseconds = Date.UTC(year, month - 1, day);
    const parsed = new Date(milliseconds);
    if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) return null;
    return raw;
  }

  function meaningfulAttendees(record) {
    return (Array.isArray(record?.attendees) ? record.attendees : []).filter((attendee) => text(attendee?.name) || text(attendee?.organizationRole));
  }

  function meaningfulAgenda(record) {
    return (Array.isArray(record?.agenda) ? record.agenda : []).filter((item) => text(item?.item) || text(item?.group));
  }

  function readiness(record) {
    const state = {
      title: Boolean(text(record?.title)),
      date: Boolean(dateOnly(record?.date)),
      location: Boolean(text(record?.location)),
      facilitator: Boolean(text(record?.facilitator || record?.chair)),
      organizations: Array.isArray(record?.organizations) && record.organizations.some((item) => text(item)),
      attendees: meaningfulAttendees(record).some((attendee) => text(attendee?.name)),
      agenda: meaningfulAgenda(record).length > 0
    };
    const missing = REQUIREMENTS.filter(([key]) => !state[key]).map(([, label]) => label);
    return Object.freeze({
      state: Object.freeze({ ...state }),
      missing: Object.freeze(missing),
      completed: REQUIREMENTS.length - missing.length,
      total: REQUIREMENTS.length,
      percent: Math.round(((REQUIREMENTS.length - missing.length) / REQUIREMENTS.length) * 100)
    });
  }

  function normalizeCarryovers(carryoversValue, maximumCarryovers) {
    const source = Array.isArray(carryoversValue?.items) ? carryoversValue.items : [];
    const items = source.slice(0, maximumCarryovers).map((item) => Object.freeze({
      task: text(item?.task) || "Untitled follow-up",
      assignedTo: text(item?.assignedTo),
      due: text(item?.due),
      status: text(item?.status) || "Pending",
      priority: text(item?.priority) || "Normal",
      sourceMeetingTitle: text(item?.sourceMeetingTitle) || "Earlier meeting",
      sourceMeetingDate: text(item?.sourceMeetingDate),
      dueState: ["scheduled", "missing", "invalid"].includes(text(item?.dueState)) ? text(item?.dueState) : "missing"
    }));
    const reportedTotal = Number(carryoversValue?.total);
    const total = Number.isFinite(reportedTotal) && reportedTotal >= source.length ? Math.trunc(reportedTotal) : source.length;
    return Object.freeze({
      total,
      truncated: Boolean(carryoversValue?.truncated) || total > items.length,
      items: Object.freeze(items)
    });
  }

  function buildMeetingRunSheet(record, options = {}) {
    if (!record || typeof record !== "object" || Array.isArray(record)) {
      throw new TypeError("A saved meeting record object is required.");
    }

    const maximumOrganizations = boundedInteger(options.maximumOrganizations, 20, 1, 100);
    const maximumAttendees = boundedInteger(options.maximumAttendees, 40, 1, 250);
    const maximumAgendaItems = boundedInteger(options.maximumAgendaItems, 40, 1, 250);
    const maximumCarryovers = boundedInteger(options.maximumCarryovers, 20, 1, 250);

    const organizationSource = (Array.isArray(record.organizations) ? record.organizations : []).map(text).filter(Boolean);
    const attendeeSource = meaningfulAttendees(record);
    const agendaSource = meaningfulAgenda(record);
    const readinessReport = readiness(record);

    const organizations = organizationSource.slice(0, maximumOrganizations);
    const attendees = attendeeSource.slice(0, maximumAttendees).map((attendee) => Object.freeze({
      name: text(attendee?.name) || "Name not entered",
      organizationRole: text(attendee?.organizationRole)
    }));
    const agenda = agendaSource.slice(0, maximumAgendaItems).map((item, index) => Object.freeze({
      sequence: index + 1,
      group: text(item?.group),
      item: text(item?.item) || text(item?.group) || "Untitled agenda item",
      prepared: Boolean(item?.completed)
    }));

    return Object.freeze({
      reportType: "methodz-meeting-run-sheet",
      reportVersion: VERSION,
      generatedAt: new Date().toISOString(),
      meeting: Object.freeze({
        meetingNumber: text(record.meetingNumber),
        title: text(record.title) || "Untitled Meeting",
        status: text(record.status) || "Scheduled",
        date: dateOnly(record.date) || text(record.date),
        location: text(record.location),
        facilitator: text(record.facilitator || record.chair)
      }),
      readiness: readinessReport,
      organizations: Object.freeze(organizations),
      attendees: Object.freeze(attendees),
      agenda: Object.freeze(agenda),
      carryovers: normalizeCarryovers(options.carryovers, maximumCarryovers),
      limits: Object.freeze({ maximumOrganizations, maximumAttendees, maximumAgendaItems, maximumCarryovers }),
      truncation: Object.freeze({
        organizations: organizationSource.length > organizations.length,
        attendees: attendeeSource.length > attendees.length,
        agenda: agendaSource.length > agenda.length
      })
    });
  }

  return Object.freeze({ version: VERSION, buildMeetingRunSheet });
});
