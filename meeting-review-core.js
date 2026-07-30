/* Methodz Meeting Manager v1.6.11 portable live-pulse and follow-up review core, hardened with read-only focus briefing. */
(function exposeMethodzMeetingReviewCore(root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MethodzMeetingReviewCoreV1611 = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createMethodzMeetingReviewCoreV1611() {
  "use strict";

  const VERSION = "1.1.0";
  const FOCUS_REPORT_VERSION = "1.0.0";
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

  function priorityRank(value) {
    const normalized = text(value).toLowerCase();
    if (["urgent", "critical"].includes(normalized)) return 0;
    if (normalized === "high") return 1;
    if (["normal", "medium"].includes(normalized)) return 2;
    if (normalized === "low") return 3;
    return 2;
  }

  function focusDetails(item, today) {
    const due = dateOnly(item?.due);
    const deltaDays = due ? Math.round((due.milliseconds - today.milliseconds) / DAY_MS) : null;
    const flags = item?.flags && typeof item.flags === "object" ? item.flags : {};
    const band = flags.overdue ? "urgent"
      : (flags.invalidDueDate || flags.unassigned || flags.unscheduled) ? "needs-setup"
        : flags.dueSoon ? "due-soon"
          : flags.inProgress ? "active" : "planned";
    const reasons = [];
    if (flags.overdue && deltaDays !== null) reasons.push(`${Math.abs(deltaDays)} day${Math.abs(deltaDays) === 1 ? "" : "s"} overdue`);
    if (flags.invalidDueDate) reasons.push("Due date is invalid");
    if (flags.unassigned) reasons.push("Assigned To is missing");
    if (flags.unscheduled) reasons.push("Due date is missing");
    if (flags.dueSoon && deltaDays === 0) reasons.push("Due today");
    else if (flags.dueSoon && deltaDays !== null) reasons.push(`Due in ${deltaDays} day${deltaDays === 1 ? "" : "s"}`);
    if (flags.inProgress) reasons.push("In progress");
    if (["urgent", "critical", "high"].includes(text(item?.priority).toLowerCase())) reasons.push(`${text(item.priority)} priority`);
    if (!reasons.length) reasons.push(flags.pending ? "Pending follow-up" : "Planned follow-up");
    return {
      band,
      reasons,
      daysUntilDue: deltaDays,
      overdueDays: deltaDays !== null && deltaDays < 0 ? Math.abs(deltaDays) : 0
    };
  }

  function buildFollowUpFocus(review, options = {}) {
    const source = review && typeof review === "object" ? review : {};
    const today = todayDateOnly(options.today);
    const maximumItems = boundedInteger(options.maximumItems, 7, 1, 50);
    const maximumAssignees = boundedInteger(options.maximumAssignees, 8, 1, 50);
    const sourceItems = Array.isArray(source.items) ? source.items : [];
    const actionable = sourceItems.filter((item) => item?.flags?.incomplete === true).map((item) => ({
      ...item,
      flags: { ...(item.flags || {}) },
      attention: Array.isArray(item.attention) ? [...item.attention] : [],
      focus: focusDetails(item, today)
    }));
    const bandRank = { urgent: 0, "needs-setup": 1, "due-soon": 2, active: 3, planned: 4 };
    actionable.sort((left, right) => {
      const bandDifference = (bandRank[left.focus.band] ?? 99) - (bandRank[right.focus.band] ?? 99);
      if (bandDifference) return bandDifference;
      const priorityDifference = priorityRank(left.priority) - priorityRank(right.priority);
      if (priorityDifference) return priorityDifference;
      const dueDifference = (dateOnly(left.due)?.milliseconds ?? Number.MAX_SAFE_INTEGER) - (dateOnly(right.due)?.milliseconds ?? Number.MAX_SAFE_INTEGER);
      if (dueDifference) return dueDifference;
      return right.recordUpdatedAt.localeCompare(left.recordUpdatedAt) || left.meetingTitle.localeCompare(right.meetingTitle) || left.taskIndex - right.taskIndex;
    });

    const assigneeMap = new Map();
    actionable.forEach((item) => {
      const label = item.assignedTo || "Unassigned";
      const current = assigneeMap.get(label) || { assignedTo: label, tasks: 0, overdue: 0, dueSoon: 0, inProgress: 0, highPriority: 0, missingAssignment: !item.assignedTo };
      current.tasks += 1;
      if (item.flags.overdue) current.overdue += 1;
      if (item.flags.dueSoon) current.dueSoon += 1;
      if (item.flags.inProgress) current.inProgress += 1;
      if (priorityRank(item.priority) <= 1) current.highPriority += 1;
      assigneeMap.set(label, current);
    });
    const assignees = [...assigneeMap.values()].sort((left, right) =>
      Number(right.missingAssignment) - Number(left.missingAssignment)
      || right.overdue - left.overdue
      || right.highPriority - left.highPriority
      || right.tasks - left.tasks
      || left.assignedTo.localeCompare(right.assignedTo)
    );
    const count = (predicate) => actionable.filter(predicate).length;
    const focusItems = actionable.slice(0, maximumItems);
    return {
      reportType: "methodz-follow-up-focus", reportVersion: FOCUS_REPORT_VERSION,
      generatedAt: new Date().toISOString(), today: today.raw,
      counts: {
        actionable: actionable.length,
        urgent: count((item) => item.focus.band === "urgent"),
        needsSetup: count((item) => item.focus.band === "needs-setup"),
        dueSoon: count((item) => item.focus.band === "due-soon"),
        active: count((item) => item.focus.band === "active"),
        planned: count((item) => item.focus.band === "planned"),
        unassigned: count((item) => item.flags.unassigned),
        assignees: assignees.filter((item) => !item.missingAssignment).length
      },
      totalItems: actionable.length,
      maximumItems,
      truncated: actionable.length > maximumItems,
      focusItems,
      nextAction: focusItems[0] || null,
      assigneeLoads: assignees.slice(0, maximumAssignees),
      assigneeLoadsTruncated: assignees.length > maximumAssignees
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

  return Object.freeze({ version: VERSION, focusReportVersion: FOCUS_REPORT_VERSION, dateOnly, classifyTask, buildFollowUpReview, buildFollowUpFocus, createMeetingPulse, matchesFilter });
});
