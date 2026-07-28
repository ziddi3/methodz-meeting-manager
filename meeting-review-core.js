/* Methodz Meeting Manager v1.6.11 portable live-pulse and follow-up review core. */
(function exposeMethodzMeetingReviewCore(root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MethodzMeetingReviewCoreV1611 = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createMethodzMeetingReviewCoreV1611() {
  "use strict";

  const VERSION = "1.0.0";
  const DAY_MS = 86400000;
  const SECTIONS = Object.freeze([
    { id: "meetingInformationPanelV1610", key: "meetingInformation", label: "Meeting Information" },
    { id: "organizationsPresentPanelV1610", key: "organizations", label: "Organizations" },
    { id: "attendanceSignOnPanelV1610", key: "attendance", label: "Attendance" },
    { id: "agendaChecklistPanelV1610", key: "agenda", label: "Agenda" },
    { id: "discussionNotesPanelV1610", key: "notes", label: "Notes" },
    { id: "decisionsMadePanelV1610", key: "decisions", label: "Decisions" },
    { id: "followUpTasksPanelV1610", key: "tasks", label: "Follow-Up Tasks" },
    { id: "meetingSummaryPanelV1610", key: "summary", label: "Summary" }
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

  function meaningfulTask(task) {
    const item = task && typeof task === "object" ? task : {};
    return [item.task, item.assignedTo, item.priority, item.due, item.status].some((value) => text(value));
  }

  function classifyTask(task, options = {}) {
    const item = task && typeof task === "object" ? task : {};
    const status = text(item.status) || "Pending";
    const normalizedStatus = status.toLowerCase();
    const completed = normalizedStatus === "completed";
    const assignedTo = text(item.assignedTo);
    const dueText = text(item.due);
    const due = dateOnly(dueText);
    const today = todayDateOnly(options.today);
    const dueSoonDays = boundedInteger(options.dueSoonDays, 7, 0, 365);
    const flags = {
      completed,
      incomplete: !completed,
      overdue: !completed && Boolean(due) && due.milliseconds < today.milliseconds,
      dueSoon: !completed && Boolean(due) && due.milliseconds >= today.milliseconds && due.milliseconds <= today.milliseconds + dueSoonDays * DAY_MS,
      upcoming: !completed && Boolean(due) && due.milliseconds > today.milliseconds + dueSoonDays * DAY_MS,
      unassigned: !completed && !assignedTo,
      invalidDueDate: !completed && Boolean(dueText) && !due,
      unscheduled: !completed && !dueText,
      pending: !completed && normalizedStatus === "pending",
      inProgress: !completed && normalizedStatus === "in progress"
    };
    const attention = [];
    if (flags.overdue) attention.push("overdue");
    if (flags.dueSoon) attention.push("due-soon");
    if (flags.unassigned) attention.push("unassigned");
    if (flags.invalidDueDate) attention.push("invalid-date");
    if (flags.inProgress) attention.push("in-progress");
    if (flags.pending) attention.push("pending");
    if (completed) attention.push("completed");
    if (!attention.length) attention.push(flags.upcoming ? "upcoming" : "unscheduled");

    const primary = completed ? "completed"
      : flags.overdue ? "overdue"
        : flags.dueSoon ? "due-soon"
          : flags.invalidDueDate ? "invalid-date"
            : flags.unassigned ? "unassigned"
              : flags.inProgress ? "in-progress"
                : flags.pending ? "pending"
                  : flags.upcoming ? "upcoming" : "unscheduled";

    return {
      task: text(item.task), assignedTo, priority: text(item.priority) || "Normal",
      due: due?.raw || dueText, status, flags, attention, primary
    };
  }

  function buildFollowUpReview(records, options = {}) {
    const source = Array.isArray(records) ? records : [];
    const maxItems = boundedInteger(options.maxItems, 500, 1, 5000);
    const items = [];
    source.forEach((record, sourceIndex) => {
      const meeting = record && typeof record === "object" ? record : {};
      (Array.isArray(meeting.tasks) ? meeting.tasks : []).forEach((task, taskIndex) => {
        if (!meaningfulTask(task)) return;
        items.push({
          recordId: text(meeting.id), meetingNumber: text(meeting.meetingNumber),
          meetingTitle: text(meeting.title) || "Untitled Meeting", meetingDate: text(meeting.date),
          recordStatus: text(meeting.status), recordUpdatedAt: text(meeting.updatedAt || meeting.savedAt),
          taskIndex, sourceIndex, ...classifyTask(task, options)
        });
      });
    });

    const severity = { overdue: 0, "due-soon": 1, "invalid-date": 2, unassigned: 3, "in-progress": 4, pending: 5, upcoming: 6, unscheduled: 7, completed: 8 };
    items.sort((left, right) => {
      const severityDifference = (severity[left.primary] ?? 99) - (severity[right.primary] ?? 99);
      if (severityDifference) return severityDifference;
      const dueDifference = (dateOnly(left.due)?.milliseconds ?? Number.MAX_SAFE_INTEGER) - (dateOnly(right.due)?.milliseconds ?? Number.MAX_SAFE_INTEGER);
      if (dueDifference) return dueDifference;
      return right.recordUpdatedAt.localeCompare(left.recordUpdatedAt) || left.meetingTitle.localeCompare(right.meetingTitle) || left.taskIndex - right.taskIndex;
    });

    const count = (predicate) => items.filter(predicate).length;
    const counts = {
      records: source.length,
      tasks: items.length,
      incomplete: count((item) => item.flags.incomplete),
      completed: count((item) => item.flags.completed),
      overdue: count((item) => item.flags.overdue),
      dueSoon: count((item) => item.flags.dueSoon),
      unassigned: count((item) => item.flags.unassigned),
      pending: count((item) => item.flags.pending),
      inProgress: count((item) => item.flags.inProgress),
      invalidDueDate: count((item) => item.flags.invalidDueDate),
      attention: count((item) => item.flags.overdue || item.flags.dueSoon || item.flags.unassigned || item.flags.invalidDueDate)
    };

    return {
      reportType: "methodz-follow-up-review", reportVersion: VERSION,
      generatedAt: new Date().toISOString(), dueSoonDays: boundedInteger(options.dueSoonDays, 7, 0, 365),
      counts, truncated: items.length > maxItems, totalItems: items.length, items: items.slice(0, maxItems)
    };
  }

  function createMeetingPulse(meeting) {
    const source = meeting && typeof meeting === "object" ? meeting : {};
    const agenda = Array.isArray(source.agenda) ? source.agenda : [];
    const attendees = (Array.isArray(source.attendees) ? source.attendees : []).filter((item) => text(item?.name) || text(item?.organizationRole) || text(item?.signature));
    const tasks = (Array.isArray(source.tasks) ? source.tasks : []).filter(meaningfulTask);
    const agendaCompleted = agenda.filter((item) => item?.completed === true).length;
    const readiness = {
      meetingInformation: Boolean(text(source.title) && text(source.date)),
      organizations: Array.isArray(source.organizations) && source.organizations.some((item) => text(item)),
      attendance: attendees.length > 0 && attendees.every((item) => Boolean(text(item?.name))),
      agenda: agenda.length > 0 && agendaCompleted === agenda.length,
      notes: Boolean(text(source.notes)),
      decisions: Boolean(text(source.decisions)),
      tasks: tasks.length > 0 && tasks.every((task) => text(task?.task) && text(task?.assignedTo) && (text(task?.status).toLowerCase() === "completed" || text(task?.due))),
      summary: Boolean(text(source.summary))
    };
    const sections = SECTIONS.map((section) => ({ ...section, complete: readiness[section.key] === true }));
    const completedSections = sections.filter((section) => section.complete).length;
    const nextIncomplete = sections.find((section) => !section.complete) || null;
    return {
      reportType: "methodz-live-meeting-pulse", reportVersion: VERSION, generatedAt: new Date().toISOString(),
      counts: {
        completedSections, totalSections: sections.length, agendaCompleted, agendaTotal: agenda.length,
        tasks: tasks.length, tasksCompleted: tasks.filter((task) => text(task?.status).toLowerCase() === "completed").length,
        tasksUnassigned: tasks.filter((task) => !text(task?.assignedTo)).length
      },
      completionPercent: Math.round((completedSections / sections.length) * 100), sections, nextIncomplete, complete: nextIncomplete === null
    };
  }

  function matchesFilter(item, filter) {
    const value = text(filter).toLowerCase();
    if (!value || value === "all") return true;
    if (value === "attention") return item.flags.overdue || item.flags.dueSoon || item.flags.unassigned || item.flags.invalidDueDate;
    if (value === "due-soon") return item.flags.dueSoon;
    if (value === "in-progress") return item.flags.inProgress;
    if (value === "invalid-date") return item.flags.invalidDueDate;
    return item.flags[value] === true || item.primary === value;
  }

  return Object.freeze({ version: VERSION, dateOnly, classifyTask, buildFollowUpReview, createMeetingPulse, matchesFilter });
});
