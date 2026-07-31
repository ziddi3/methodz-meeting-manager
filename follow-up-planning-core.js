/* Methodz Meeting Manager portable read-only follow-up planning brief core. */
(function exposeMethodzFollowUpPlanningCore(root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MethodzFollowUpPlanningCoreV1613 = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createMethodzFollowUpPlanningCoreV1613() {
  "use strict";

  const VERSION = "1.0.0";
  const DAY_MS = 86400000;
  const LANE_DEFINITIONS = Object.freeze([
    { id: "overdue", label: "Overdue", rank: 0 },
    { id: "today", label: "Due Today", rank: 1 },
    { id: "within-window", label: "Within Planning Window", rank: 2 },
    { id: "needs-scheduling", label: "Needs Scheduling", rank: 3 },
    { id: "later", label: "Later", rank: 4 }
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

  function priorityRank(value) {
    const normalized = text(value).toLowerCase();
    if (["urgent", "critical"].includes(normalized)) return 0;
    if (normalized === "high") return 1;
    if (["normal", "medium"].includes(normalized)) return 2;
    if (normalized === "low") return 3;
    return 2;
  }

  function planningDetails(item, today, horizonDays) {
    const dueText = text(item?.due);
    const due = dateOnly(dueText);
    const invalidDueDate = Boolean(dueText) && !due;
    const daysUntilDue = due ? Math.round((due.milliseconds - today.milliseconds) / DAY_MS) : null;
    const lane = invalidDueDate || !dueText
      ? "needs-scheduling"
      : daysUntilDue < 0
        ? "overdue"
        : daysUntilDue === 0
          ? "today"
          : daysUntilDue <= horizonDays
            ? "within-window"
            : "later";
    const reasons = [];
    if (lane === "overdue") {
      const overdueDays = Math.abs(daysUntilDue);
      reasons.push(`${overdueDays} day${overdueDays === 1 ? "" : "s"} overdue`);
    } else if (lane === "today") {
      reasons.push("Due today");
    } else if (lane === "within-window") {
      reasons.push(`Due in ${daysUntilDue} day${daysUntilDue === 1 ? "" : "s"}`);
    } else if (lane === "needs-scheduling") {
      reasons.push(invalidDueDate ? "Due date is invalid" : "Due date is missing");
    } else {
      reasons.push("Due after the planning window");
    }
    if (!text(item?.assignedTo)) reasons.push("Assigned To is missing");
    const priority = text(item?.priority);
    if (["urgent", "critical", "high"].includes(priority.toLowerCase())) reasons.push(`${priority} priority`);
    if (text(item?.status).toLowerCase() === "in progress") reasons.push("In progress");
    return {
      lane,
      dueDateValid: Boolean(due),
      invalidDueDate,
      daysUntilDue,
      overdueDays: daysUntilDue !== null && daysUntilDue < 0 ? Math.abs(daysUntilDue) : 0,
      reasons
    };
  }

  function comparePlanningItems(left, right) {
    const laneRank = Object.fromEntries(LANE_DEFINITIONS.map((lane) => [lane.id, lane.rank]));
    const laneDifference = (laneRank[left.planning.lane] ?? 99) - (laneRank[right.planning.lane] ?? 99);
    if (laneDifference) return laneDifference;
    const priorityDifference = priorityRank(left.priority) - priorityRank(right.priority);
    if (priorityDifference) return priorityDifference;
    const dueDifference = (dateOnly(left.due)?.milliseconds ?? Number.MAX_SAFE_INTEGER) - (dateOnly(right.due)?.milliseconds ?? Number.MAX_SAFE_INTEGER);
    if (dueDifference) return dueDifference;
    return text(right.recordUpdatedAt).localeCompare(text(left.recordUpdatedAt))
      || text(left.meetingTitle).localeCompare(text(right.meetingTitle))
      || Number(left.taskIndex || 0) - Number(right.taskIndex || 0);
  }

  function buildAssigneeLoads(items, maximumAssignees) {
    const loads = new Map();
    items.forEach((item) => {
      const label = text(item.assignedTo) || "Unassigned";
      const current = loads.get(label) || {
        assignedTo: label,
        missingAssignment: !text(item.assignedTo),
        tasks: 0,
        overdue: 0,
        dueToday: 0,
        withinWindow: 0,
        needsScheduling: 0,
        inProgress: 0,
        highPriority: 0
      };
      current.tasks += 1;
      if (item.planning.lane === "overdue") current.overdue += 1;
      if (item.planning.lane === "today") current.dueToday += 1;
      if (item.planning.lane === "within-window") current.withinWindow += 1;
      if (item.planning.lane === "needs-scheduling") current.needsScheduling += 1;
      if (text(item.status).toLowerCase() === "in progress") current.inProgress += 1;
      if (priorityRank(item.priority) <= 1) current.highPriority += 1;
      loads.set(label, current);
    });
    const sorted = [...loads.values()].sort((left, right) =>
      Number(right.missingAssignment) - Number(left.missingAssignment)
      || right.overdue - left.overdue
      || right.dueToday - left.dueToday
      || right.withinWindow - left.withinWindow
      || right.highPriority - left.highPriority
      || right.tasks - left.tasks
      || left.assignedTo.localeCompare(right.assignedTo)
    );
    return {
      total: sorted.length,
      truncated: sorted.length > maximumAssignees,
      items: sorted.slice(0, maximumAssignees)
    };
  }

  function buildFollowUpPlanningBrief(review, options = {}) {
    const source = review && typeof review === "object" ? review : {};
    const today = todayDateOnly(options.today);
    const horizonDays = boundedInteger(options.horizonDays, 7, 1, 90);
    const maximumItems = boundedInteger(options.maximumItems, 40, 1, 500);
    const maximumAssignees = boundedInteger(options.maximumAssignees, 12, 1, 100);
    const sourceItems = Array.isArray(source.items) ? source.items : [];
    const actionable = sourceItems
      .filter((item) => item?.flags?.incomplete === true)
      .map((item) => ({
        ...item,
        flags: { ...(item.flags || {}) },
        attention: Array.isArray(item.attention) ? [...item.attention] : [],
        planning: planningDetails(item, today, horizonDays)
      }))
      .sort(comparePlanningItems);

    const visibleItems = actionable.slice(0, maximumItems);
    const lanes = LANE_DEFINITIONS.map((definition) => {
      const allLaneItems = actionable.filter((item) => item.planning.lane === definition.id);
      const visibleLaneItems = visibleItems.filter((item) => item.planning.lane === definition.id);
      return {
        id: definition.id,
        label: definition.label,
        count: allLaneItems.length,
        visibleCount: visibleLaneItems.length,
        truncated: allLaneItems.length > visibleLaneItems.length,
        items: visibleLaneItems
      };
    });
    const countLane = (lane) => actionable.filter((item) => item.planning.lane === lane).length;
    const assignees = buildAssigneeLoads(actionable, maximumAssignees);

    return {
      reportType: "methodz-follow-up-planning-brief",
      reportVersion: VERSION,
      generatedAt: new Date().toISOString(),
      today: today.raw,
      horizonDays,
      horizonEnd: dateOnly(new Date(today.milliseconds + horizonDays * DAY_MS).toISOString().slice(0, 10)).raw,
      counts: {
        actionable: actionable.length,
        overdue: countLane("overdue"),
        dueToday: countLane("today"),
        withinWindow: countLane("within-window"),
        needsScheduling: countLane("needs-scheduling"),
        later: countLane("later"),
        unassigned: actionable.filter((item) => !text(item.assignedTo)).length,
        assignees: assignees.items.filter((item) => !item.missingAssignment).length
      },
      totalItems: actionable.length,
      maximumItems,
      truncated: actionable.length > maximumItems,
      items: visibleItems,
      lanes,
      assigneeLoads: assignees.items,
      assigneeLoadsTotal: assignees.total,
      assigneeLoadsTruncated: assignees.truncated,
      boundaries: {
        containsTaskAndMeetingData: true,
        containsSignatures: false,
        containsConsentDetails: false,
        containsNotesOrDecisions: false,
        containsCredentialsOrPrivateKeys: false,
        automaticRecordMutation: false,
        automaticAssignment: false,
        automaticDelivery: false,
        automaticSynchronization: false
      }
    };
  }

  return Object.freeze({
    version: VERSION,
    laneDefinitions: LANE_DEFINITIONS,
    dateOnly,
    planningDetails,
    buildFollowUpPlanningBrief
  });
});
