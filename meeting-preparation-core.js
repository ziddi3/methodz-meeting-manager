/* Methodz Meeting Manager portable, read-only meeting preparation core. */
(function exposeMethodzMeetingPreparationCore(root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MethodzMeetingPreparationCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createMethodzMeetingPreparationCore() {
  "use strict";

  const VERSION = "1.0.0";
  const DAY_MS = 86400000;
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
    return { raw, milliseconds };
  }

  function todayDateOnly(value) {
    const explicit = dateOnly(value);
    if (explicit) return explicit;
    const now = value instanceof Date && Number.isFinite(value.getTime()) ? value : new Date();
    return dateOnly(`${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`);
  }

  function isCompletedTask(task) {
    return text(task?.status).toLowerCase() === "completed";
  }

  function isActiveMeeting(record) {
    const status = text(record?.status).toLowerCase();
    return !["archived", "completed", "cancelled", "canceled"].includes(status);
  }

  function meaningfulAgenda(record) {
    return (Array.isArray(record?.agenda) ? record.agenda : []).filter((item) => text(item?.item) || text(item?.group));
  }

  function meaningfulAttendees(record) {
    return (Array.isArray(record?.attendees) ? record.attendees : []).filter((item) => text(item?.name) || text(item?.organizationRole));
  }

  function requirementState(record) {
    const state = {
      title: Boolean(text(record?.title)),
      date: Boolean(dateOnly(record?.date)),
      location: Boolean(text(record?.location)),
      facilitator: Boolean(text(record?.facilitator || record?.chair)),
      organizations: Array.isArray(record?.organizations) && record.organizations.some((item) => text(item)),
      attendees: meaningfulAttendees(record).some((item) => text(item?.name)),
      agenda: meaningfulAgenda(record).length > 0
    };
    const missing = REQUIREMENTS.filter(([key]) => !state[key]).map(([, label]) => label);
    return {
      state,
      missing,
      completed: REQUIREMENTS.length - missing.length,
      total: REQUIREMENTS.length,
      percent: Math.round(((REQUIREMENTS.length - missing.length) / REQUIREMENTS.length) * 100)
    };
  }

  function normalizeTask(task, sourceRecord) {
    return {
      task: text(task?.task),
      assignedTo: text(task?.assignedTo),
      priority: text(task?.priority) || "Normal",
      due: text(task?.due),
      status: text(task?.status) || "Pending",
      sourceRecordId: text(sourceRecord?.id),
      sourceMeetingNumber: text(sourceRecord?.meetingNumber),
      sourceMeetingTitle: text(sourceRecord?.title) || "Untitled Meeting",
      sourceMeetingDate: text(sourceRecord?.date)
    };
  }

  function collectCarryovers(records, targetRecord, targetDate, maximumCarryovers) {
    const items = [];
    records.forEach((sourceRecord, sourceIndex) => {
      if (!sourceRecord || typeof sourceRecord !== "object") return;
      if (text(sourceRecord.id) === text(targetRecord.id)) return;
      const sourceDate = dateOnly(sourceRecord.date);
      if (sourceDate && sourceDate.milliseconds > targetDate.milliseconds) return;

      (Array.isArray(sourceRecord.tasks) ? sourceRecord.tasks : []).forEach((task, taskIndex) => {
        if (!task || typeof task !== "object" || isCompletedTask(task)) return;
        if (![task.task, task.assignedTo, task.due, task.status].some((value) => text(value))) return;
        const due = dateOnly(task.due);
        if (due && due.milliseconds > targetDate.milliseconds) return;
        items.push({
          ...normalizeTask(task, sourceRecord),
          taskIndex,
          sourceIndex,
          dueState: !text(task.due) ? "missing" : due ? "scheduled" : "invalid"
        });
      });
    });

    const priorityRank = { critical: 0, urgent: 0, high: 1, normal: 2, medium: 2, low: 3 };
    items.sort((left, right) => {
      const dueDifference = (dateOnly(left.due)?.milliseconds ?? Number.MIN_SAFE_INTEGER) - (dateOnly(right.due)?.milliseconds ?? Number.MIN_SAFE_INTEGER);
      if (dueDifference) return dueDifference;
      const priorityDifference = (priorityRank[text(left.priority).toLowerCase()] ?? 2) - (priorityRank[text(right.priority).toLowerCase()] ?? 2);
      if (priorityDifference) return priorityDifference;
      return left.sourceMeetingDate.localeCompare(right.sourceMeetingDate)
        || left.sourceMeetingTitle.localeCompare(right.sourceMeetingTitle)
        || left.taskIndex - right.taskIndex;
    });

    return {
      total: items.length,
      truncated: items.length > maximumCarryovers,
      items: items.slice(0, maximumCarryovers)
    };
  }

  function buildMeetingPreparationBrief(records, options = {}) {
    const source = Array.isArray(records) ? records : [];
    const today = todayDateOnly(options.today);
    const horizonDays = boundedInteger(options.horizonDays, 14, 1, 365);
    const maximumMeetings = boundedInteger(options.maximumMeetings, 40, 1, 500);
    const maximumCarryovers = boundedInteger(options.maximumCarryovers, 25, 1, 250);
    const horizonEnd = today.milliseconds + horizonDays * DAY_MS;
    const active = source.filter(isActiveMeeting);
    const dateCounts = new Map();

    active.forEach((record) => {
      const parsed = dateOnly(record?.date);
      if (!parsed) return;
      dateCounts.set(parsed.raw, (dateCounts.get(parsed.raw) || 0) + 1);
    });

    const candidates = active.filter((record) => {
      const parsed = dateOnly(record?.date);
      if (!parsed) return true;
      return parsed.milliseconds >= today.milliseconds && parsed.milliseconds <= horizonEnd;
    }).map((record, sourceIndex) => {
      const meetingDate = dateOnly(record?.date);
      const readiness = requirementState(record);
      const carryovers = meetingDate
        ? collectCarryovers(source, record, meetingDate, maximumCarryovers)
        : { total: 0, truncated: false, items: [] };
      return {
        recordId: text(record?.id),
        meetingNumber: text(record?.meetingNumber),
        title: text(record?.title) || "Untitled Meeting",
        status: text(record?.status) || "Scheduled",
        date: meetingDate?.raw || text(record?.date),
        location: text(record?.location),
        facilitator: text(record?.facilitator || record?.chair),
        organizations: (Array.isArray(record?.organizations) ? record.organizations : []).map(text).filter(Boolean),
        attendeeCount: meaningfulAttendees(record).length,
        agendaCount: meaningfulAgenda(record).length,
        readiness,
        lane: meetingDate ? "upcoming" : "needs-scheduling",
        sameDayMeetingCount: meetingDate ? dateCounts.get(meetingDate.raw) || 1 : 0,
        scheduleCollision: meetingDate ? (dateCounts.get(meetingDate.raw) || 0) > 1 : false,
        daysUntilMeeting: meetingDate ? Math.round((meetingDate.milliseconds - today.milliseconds) / DAY_MS) : null,
        carryovers,
        sourceIndex
      };
    });

    candidates.sort((left, right) => {
      if (left.lane !== right.lane) return left.lane === "needs-scheduling" ? -1 : 1;
      const dateDifference = (dateOnly(left.date)?.milliseconds ?? Number.MIN_SAFE_INTEGER) - (dateOnly(right.date)?.milliseconds ?? Number.MIN_SAFE_INTEGER);
      if (dateDifference) return dateDifference;
      if (left.readiness.percent !== right.readiness.percent) return left.readiness.percent - right.readiness.percent;
      return left.title.localeCompare(right.title) || left.recordId.localeCompare(right.recordId);
    });

    const selected = candidates.slice(0, maximumMeetings).map(({ sourceIndex, ...meeting }) => meeting);
    const count = (predicate) => candidates.filter(predicate).length;
    return {
      reportType: "methodz-meeting-preparation-brief",
      reportVersion: VERSION,
      generatedAt: new Date().toISOString(),
      today: today.raw,
      horizonDays,
      horizonEnd: dateOnly(new Date(horizonEnd).toISOString().slice(0, 10)).raw,
      counts: {
        savedRecords: source.length,
        activeMeetings: active.length,
        inBrief: candidates.length,
        upcoming: count((meeting) => meeting.lane === "upcoming"),
        needsScheduling: count((meeting) => meeting.lane === "needs-scheduling"),
        needsPreparation: count((meeting) => meeting.readiness.percent < 100),
        scheduleCollisions: count((meeting) => meeting.scheduleCollision),
        carryoverTasks: candidates.reduce((total, meeting) => total + meeting.carryovers.total, 0)
      },
      maximumMeetings,
      truncated: candidates.length > maximumMeetings,
      meetings: selected
    };
  }

  return Object.freeze({ version: VERSION, dateOnly, requirementState, buildMeetingPreparationBrief });
});
