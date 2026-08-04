/* Portable, read-only meeting closeout review for Methodz Meeting Manager. */
(function exposeMethodzMeetingCloseoutCore(root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MethodzMeetingCloseoutCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createMethodzMeetingCloseoutCore() {
  "use strict";

  const VERSION = "1.0.0";
  const CHECKPOINTS = Object.freeze([
    ["status", "Meeting status"],
    ["attendance", "Attendance captured"],
    ["agenda", "Agenda reviewed"],
    ["notes", "Discussion notes captured"],
    ["decisions", "Decisions recorded"],
    ["tasks", "Follow-up tasks ready"],
    ["summary", "Meeting summary captured"]
  ]);

  const text = (value) => String(value ?? "").trim();

  function boundedInteger(value, fallback, minimum, maximum) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.min(maximum, Math.max(minimum, Math.trunc(numeric)));
  }

  function validDateOnly(value) {
    const raw = text(value);
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
    if (!match) return false;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
  }

  function sourceRows(record, key, maximum) {
    const rows = Array.isArray(record?.[key]) ? record[key] : [];
    return {
      rows: rows.slice(0, maximum),
      totalRows: rows.length,
      truncated: rows.length > maximum
    };
  }

  function meaningfulAttendee(attendee) {
    return [attendee?.name, attendee?.organizationRole, attendee?.attendanceType, attendee?.signature].some((value) => text(value));
  }

  function meaningfulAgenda(item) {
    return [item?.item, item?.group].some((value) => text(value));
  }

  function meaningfulTask(task) {
    return [task?.task, task?.assignedTo, task?.due, task?.status, task?.priority].some((value) => text(value));
  }

  function taskReadiness(tasks) {
    const details = {
      total: tasks.length,
      ready: 0,
      missingTask: 0,
      missingAssignedTo: 0,
      missingDueDate: 0,
      invalidDueDate: 0,
      missingStatus: 0
    };

    tasks.forEach((task) => {
      const hasTask = Boolean(text(task?.task));
      const hasAssignedTo = Boolean(text(task?.assignedTo));
      const dueRaw = text(task?.due);
      const hasDueDate = Boolean(dueRaw);
      const dueValid = hasDueDate && validDateOnly(dueRaw);
      const hasStatus = Boolean(text(task?.status));

      if (!hasTask) details.missingTask += 1;
      if (!hasAssignedTo) details.missingAssignedTo += 1;
      if (!hasDueDate) details.missingDueDate += 1;
      else if (!dueValid) details.invalidDueDate += 1;
      if (!hasStatus) details.missingStatus += 1;
      if (hasTask && hasAssignedTo && dueValid && hasStatus) details.ready += 1;
    });

    return details;
  }

  function checkpointDetail(key, context) {
    if (key === "status") return context.statusComplete ? "Status is Completed or Archived." : "Set the meeting status to Completed when capture is finished.";
    if (key === "attendance") return context.namedAttendees > 0 ? `${context.namedAttendees} named attendee${context.namedAttendees === 1 ? "" : "s"}.` : "No named attendee is recorded.";
    if (key === "agenda") {
      if (context.agendaTotal === 0) return "No agenda item is available for review.";
      if (context.agendaUnreviewed === 0) return `${context.agendaTotal} agenda item${context.agendaTotal === 1 ? "" : "s"} reviewed.`;
      return `${context.agendaUnreviewed} of ${context.agendaTotal} agenda items remain unchecked.`;
    }
    if (key === "notes") return context.notesComplete ? "Discussion notes are present." : "Discussion notes are empty.";
    if (key === "decisions") return context.decisionsComplete ? "Decision capture is present." : "Decision capture is empty. Record decisions or explicitly state that none were made.";
    if (key === "tasks") {
      if (context.tasks.total === 0) return "No follow-up task is recorded. Add tasks or explicitly confirm that none are required in the summary.";
      if (context.tasks.ready === context.tasks.total) return `${context.tasks.ready} follow-up task${context.tasks.ready === 1 ? " is" : "s are"} fully prepared.`;
      return `${context.tasks.total - context.tasks.ready} of ${context.tasks.total} follow-up tasks need setup.`;
    }
    if (key === "summary") return context.summaryComplete ? "Meeting summary is present." : "Meeting summary is empty.";
    return "Review required.";
  }

  function buildMeetingCloseoutReview(record, options = {}) {
    if (!record || typeof record !== "object" || Array.isArray(record)) {
      throw new TypeError("A meeting record object is required.");
    }

    const maximumAttendees = boundedInteger(options.maximumAttendees, 250, 1, 1000);
    const maximumAgendaItems = boundedInteger(options.maximumAgendaItems, 500, 1, 2000);
    const maximumTasks = boundedInteger(options.maximumTasks, 250, 1, 1000);

    const attendeeSource = sourceRows(record, "attendees", maximumAttendees);
    const agendaSource = sourceRows(record, "agenda", maximumAgendaItems);
    const taskSource = sourceRows(record, "tasks", maximumTasks);

    const attendees = attendeeSource.rows.filter(meaningfulAttendee);
    const agenda = agendaSource.rows.filter(meaningfulAgenda);
    const tasks = taskSource.rows.filter(meaningfulTask);
    const namedAttendees = attendees.filter((attendee) => Boolean(text(attendee?.name))).length;
    const reviewedAgenda = agenda.filter((item) => item?.completed === true).length;
    const taskDetails = taskReadiness(tasks);
    const status = text(record.status).toLowerCase();

    const context = {
      statusComplete: ["completed", "archived"].includes(status),
      namedAttendees,
      agendaTotal: agenda.length,
      agendaUnreviewed: agenda.length - reviewedAgenda,
      notesComplete: Boolean(text(record.notes)),
      decisionsComplete: Boolean(text(record.decisions)),
      tasks: taskDetails,
      summaryComplete: Boolean(text(record.summary))
    };

    const state = {
      status: context.statusComplete,
      attendance: !attendeeSource.truncated && namedAttendees > 0,
      agenda: !agendaSource.truncated && agenda.length > 0 && reviewedAgenda === agenda.length,
      notes: context.notesComplete,
      decisions: context.decisionsComplete,
      tasks: !taskSource.truncated && tasks.length > 0 && taskDetails.ready === tasks.length,
      summary: context.summaryComplete
    };

    const checkpoints = CHECKPOINTS.map(([key, label]) => Object.freeze({
      key,
      label,
      complete: state[key],
      detail: checkpointDetail(key, context)
    }));
    const completed = checkpoints.filter((checkpoint) => checkpoint.complete).length;
    const nextCheckpoint = checkpoints.find((checkpoint) => !checkpoint.complete) || null;

    return Object.freeze({
      reportType: "methodz-meeting-closeout-review",
      reportVersion: VERSION,
      generatedAt: new Date().toISOString(),
      ready: completed === checkpoints.length,
      state: completed === checkpoints.length ? "ready" : "needs-review",
      completed,
      total: checkpoints.length,
      percent: Math.round((completed / checkpoints.length) * 100),
      nextFocus: nextCheckpoint?.key || "",
      checkpoints: Object.freeze(checkpoints),
      counts: Object.freeze({
        attendees: Object.freeze({ total: attendees.length, named: namedAttendees }),
        agenda: Object.freeze({ total: agenda.length, reviewed: reviewedAgenda, unreviewed: agenda.length - reviewedAgenda }),
        tasks: Object.freeze({ ...taskDetails })
      }),
      limits: Object.freeze({ maximumAttendees, maximumAgendaItems, maximumTasks }),
      truncation: Object.freeze({
        attendees: attendeeSource.truncated,
        agenda: agendaSource.truncated,
        tasks: taskSource.truncated
      })
    });
  }

  return Object.freeze({ version: VERSION, buildMeetingCloseoutReview });
});
