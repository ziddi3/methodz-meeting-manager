/* Methodz Meeting Manager portable, aggregate-only Workspace Home core. */
(function exposeMethodzWorkspaceHomeCore(root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MethodzWorkspaceHomeCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createMethodzWorkspaceHomeCore() {
  "use strict";

  const VERSION = "1.0.0";
  const DAY_MS = 24 * 60 * 60 * 1000;
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

  function todayDate(value) {
    const explicit = dateOnly(value);
    if (explicit) return explicit;
    return dateOnly(new Date().toISOString().slice(0, 10));
  }

  function statusLane(record) {
    const status = text(record?.status).toLowerCase();
    if (status === "archived") return "archived";
    if (status === "completed") return "completed";
    return "active";
  }

  function meaningfulTask(task) {
    if (!task || typeof task !== "object") return false;
    return [task.task, task.assignedTo, task.due, task.status].some((value) => Boolean(text(value)));
  }

  function taskSignals(task, today) {
    const status = text(task?.status).toLowerCase();
    const assigned = Boolean(text(task?.assignedTo));
    const due = dateOnly(task?.due);
    const completed = status === "completed";
    return Object.freeze({
      completed,
      overdue: !completed && Boolean(due) && due.milliseconds < today.milliseconds,
      unassigned: !completed && !assigned,
      needsScheduling: !completed && !due
    });
  }

  function buildWorkspaceSnapshot(records, options = {}) {
    const source = Array.isArray(records) ? records : [];
    const maximumRecords = boundedInteger(options.maximumRecords, 1000, 1, 5000);
    const maximumTasksPerRecord = boundedInteger(options.maximumTasksPerRecord, 250, 1, 2000);
    const today = todayDate(options.today);
    const generatedAt = text(options.generatedAt) || new Date().toISOString();
    const selected = source.slice(0, maximumRecords);

    const counts = {
      savedRecords: source.length,
      scannedRecords: selected.length,
      activeMeetings: 0,
      completedMeetings: 0,
      archivedMeetings: 0,
      upcoming7Days: 0,
      upcoming30Days: 0,
      activeUnscheduled: 0,
      incompleteTasks: 0,
      overdueTasks: 0,
      unassignedTasks: 0,
      tasksNeedingSchedule: 0
    };
    let truncatedTaskLists = 0;

    selected.forEach((record) => {
      const lane = statusLane(record);
      if (lane === "active") counts.activeMeetings += 1;
      else if (lane === "completed") counts.completedMeetings += 1;
      else counts.archivedMeetings += 1;

      if (lane === "active") {
        const meetingDate = dateOnly(record?.date);
        if (!meetingDate) {
          counts.activeUnscheduled += 1;
        } else {
          const daysUntil = Math.floor((meetingDate.milliseconds - today.milliseconds) / DAY_MS);
          if (daysUntil >= 0 && daysUntil <= 7) counts.upcoming7Days += 1;
          if (daysUntil >= 0 && daysUntil <= 30) counts.upcoming30Days += 1;
        }
      }

      if (lane === "archived") return;
      const allTasks = (Array.isArray(record?.tasks) ? record.tasks : []).filter(meaningfulTask);
      if (allTasks.length > maximumTasksPerRecord) truncatedTaskLists += 1;
      allTasks.slice(0, maximumTasksPerRecord).forEach((task) => {
        const signals = taskSignals(task, today);
        if (signals.completed) return;
        counts.incompleteTasks += 1;
        if (signals.overdue) counts.overdueTasks += 1;
        if (signals.unassigned) counts.unassignedTasks += 1;
        if (signals.needsScheduling) counts.tasksNeedingSchedule += 1;
      });
    });

    const truncation = Object.freeze({
      records: source.length > maximumRecords,
      taskLists: truncatedTaskLists
    });

    return Object.freeze({
      reportType: "methodz-workspace-home-snapshot",
      reportVersion: VERSION,
      generatedAt,
      today: today.raw,
      complete: !truncation.records && truncation.taskLists === 0,
      counts: Object.freeze(counts),
      limits: Object.freeze({ maximumRecords, maximumTasksPerRecord }),
      truncation
    });
  }

  return Object.freeze({
    version: VERSION,
    dateOnly,
    statusLane,
    meaningfulTask,
    taskSignals,
    buildWorkspaceSnapshot
  });
});
