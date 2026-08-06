/* Methodz Meeting Manager portable, aggregate-only Workspace Home core. */
(function exposeMethodzWorkspaceHomeCore(root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MethodzWorkspaceHomeCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createMethodzWorkspaceHomeCore() {
  "use strict";

  const VERSION = "1.0.0";
  const TERMINAL_ACTIVE_STATUSES = new Set(["archived", "completed", "cancelled", "canceled"]);
  const TASK_EXCLUDED_STATUSES = new Set(["archived", "cancelled", "canceled"]);
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
    return Object.freeze({ raw, milliseconds });
  }

  function todayDateOnly(value) {
    const explicit = dateOnly(value);
    if (explicit) return explicit;
    const now = value instanceof Date && Number.isFinite(value.getTime()) ? value : new Date();
    const raw = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
    return dateOnly(raw);
  }

  function normalizedStatus(record) {
    return text(record?.status).toLowerCase();
  }

  function isActiveMeeting(record) {
    return !TERMINAL_ACTIVE_STATUSES.has(normalizedStatus(record));
  }

  function isCompletedMeeting(record) {
    return normalizedStatus(record) === "completed";
  }

  function isArchivedMeeting(record) {
    return normalizedStatus(record) === "archived";
  }

  function taskSourceEligible(record) {
    return !TASK_EXCLUDED_STATUSES.has(normalizedStatus(record));
  }

  function meaningfulTask(task) {
    if (!task || typeof task !== "object") return false;
    return [task.task, task.assignedTo, task.due, task.status, task.priority].some((value) => Boolean(text(value)));
  }

  function isCompletedTask(task) {
    return text(task?.status).toLowerCase() === "completed";
  }

  function buildWorkspaceSnapshot(records, options = {}) {
    const source = Array.isArray(records) ? records : [];
    const today = todayDateOnly(options.today);
    const maximumRecords = boundedInteger(options.maximumRecords, 2000, 1, 10000);
    const maximumTasksPerRecord = boundedInteger(options.maximumTasksPerRecord, 500, 1, 5000);
    const selectedRecords = source.slice(0, maximumRecords);

    const counts = {
      savedRecords: source.length,
      scannedRecords: selectedRecords.length,
      activeMeetings: 0,
      completedMeetings: 0,
      archivedMeetings: 0,
      upcomingMeetings: 0,
      unscheduledMeetings: 0,
      incompleteTasks: 0,
      overdueTasks: 0,
      unassignedTasks: 0,
      needsSchedulingTasks: 0,
      scannedTasks: 0
    };

    let truncatedTaskLists = 0;

    selectedRecords.forEach((record) => {
      if (!record || typeof record !== "object") return;
      const meetingDate = dateOnly(record.date);

      if (isActiveMeeting(record)) {
        counts.activeMeetings += 1;
        if (!meetingDate) counts.unscheduledMeetings += 1;
        else if (meetingDate.milliseconds >= today.milliseconds) counts.upcomingMeetings += 1;
      }
      if (isCompletedMeeting(record)) counts.completedMeetings += 1;
      if (isArchivedMeeting(record)) counts.archivedMeetings += 1;

      if (!taskSourceEligible(record)) return;
      const tasks = (Array.isArray(record.tasks) ? record.tasks : []).filter(meaningfulTask);
      if (tasks.length > maximumTasksPerRecord) truncatedTaskLists += 1;
      tasks.slice(0, maximumTasksPerRecord).forEach((task) => {
        counts.scannedTasks += 1;
        if (isCompletedTask(task)) return;
        counts.incompleteTasks += 1;
        if (!text(task.assignedTo)) counts.unassignedTasks += 1;
        const due = dateOnly(task.due);
        if (!due) counts.needsSchedulingTasks += 1;
        else if (due.milliseconds < today.milliseconds) counts.overdueTasks += 1;
      });
    });

    return Object.freeze({
      reportType: "methodz-workspace-home-snapshot",
      reportVersion: VERSION,
      generatedAt: text(options.generatedAt) || new Date().toISOString(),
      today: today.raw,
      counts: Object.freeze(counts),
      limits: Object.freeze({ maximumRecords, maximumTasksPerRecord }),
      truncation: Object.freeze({
        records: source.length > maximumRecords,
        taskLists: truncatedTaskLists
      })
    });
  }

  return Object.freeze({
    version: VERSION,
    dateOnly,
    isActiveMeeting,
    meaningfulTask,
    buildWorkspaceSnapshot
  });
});
