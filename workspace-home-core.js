/* Methodz Meeting Manager portable, read-only Workspace Home aggregate core. */
(function exposeMethodzWorkspaceHomeCore(root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MethodzWorkspaceHomeCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createMethodzWorkspaceHomeCore() {
  "use strict";

  const VERSION = "1.0.0";
  const DAY_MS = 86400000;

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

  function statusLane(record) {
    const status = text(record?.status).toLowerCase();
    if (status === "archived") return "archived";
    if (status === "completed") return "completed";
    if (["cancelled", "canceled"].includes(status)) return "inactive";
    return "active";
  }

  function meaningfulTask(task) {
    if (!task || typeof task !== "object") return false;
    return Boolean(text(task.task) || text(task.assignedTo) || text(task.due));
  }

  function isCompletedTask(task) {
    return text(task?.status).toLowerCase() === "completed";
  }

  function buildWorkspaceSnapshot(records, options = {}) {
    const source = Array.isArray(records) ? records : [];
    const today = todayDateOnly(options.today);
    const maximumRecords = boundedInteger(options.maximumRecords, 1000, 1, 5000);
    const maximumTasksPerRecord = boundedInteger(options.maximumTasksPerRecord, 250, 1, 1000);
    const selectedRecords = source.slice(0, maximumRecords);

    const counts = {
      savedRecords: source.length,
      processedRecords: selectedRecords.length,
      activeMeetings: 0,
      completedMeetings: 0,
      archivedMeetings: 0,
      upcomingMeetings: 0,
      unscheduledMeetings: 0,
      incompleteTasks: 0,
      overdueTasks: 0,
      unassignedTasks: 0,
      needsSchedulingTasks: 0
    };

    let taskListsTruncated = 0;

    selectedRecords.forEach((record) => {
      if (!record || typeof record !== "object") return;
      const lane = statusLane(record);
      if (lane === "archived") counts.archivedMeetings += 1;
      if (lane === "completed") counts.completedMeetings += 1;
      if (lane !== "active") return;

      counts.activeMeetings += 1;
      const meetingDate = dateOnly(record.date);
      if (!meetingDate) counts.unscheduledMeetings += 1;
      else if (meetingDate.milliseconds >= today.milliseconds) counts.upcomingMeetings += 1;

      const tasks = Array.isArray(record.tasks) ? record.tasks : [];
      if (tasks.length > maximumTasksPerRecord) taskListsTruncated += 1;
      tasks.slice(0, maximumTasksPerRecord).forEach((task) => {
        if (!meaningfulTask(task) || isCompletedTask(task)) return;
        counts.incompleteTasks += 1;
        if (!text(task.assignedTo)) counts.unassignedTasks += 1;
        const due = dateOnly(task.due);
        if (!due) counts.needsSchedulingTasks += 1;
        else if (due.milliseconds < today.milliseconds) counts.overdueTasks += 1;
      });
    });

    return Object.freeze({
      reportType: "methodz-workspace-launch-snapshot",
      reportVersion: VERSION,
      generatedAt: new Date().toISOString(),
      today: today.raw,
      bounds: Object.freeze({ maximumRecords, maximumTasksPerRecord }),
      counts: Object.freeze(counts),
      truncated: Object.freeze({
        records: source.length > maximumRecords,
        taskLists: taskListsTruncated > 0,
        taskListsTruncated
      })
    });
  }

  return Object.freeze({ version: VERSION, dateOnly, buildWorkspaceSnapshot });
});
