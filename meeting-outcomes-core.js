/* Methodz Meeting Manager portable, read-only Meeting Outcomes core. */
(function exposeMethodzMeetingOutcomesCore(root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MethodzMeetingOutcomesCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createMethodzMeetingOutcomesCore() {
  "use strict";

  const VERSION = "1.0.0";
  const KNOWN_DECISION_LANES = Object.freeze({
    approved: "approved",
    proposed: "proposed",
    deferred: "deferred",
    reversed: "reversed"
  });
  const OUTCOME_LABELS = Object.freeze({
    ready: "Ready",
    "needs-summary": "Needs Summary",
    "needs-decision-review": "Needs Decision Review",
    "needs-follow-up-review": "Needs Follow-Up Review",
    "needs-multiple-reviews": "Needs Multiple Reviews"
  });

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

  function isEligibleMeeting(record) {
    const status = text(record?.status).toLowerCase();
    return status === "completed" || status === "archived";
  }

  function meaningfulDecision(decision) {
    if (!decision || typeof decision !== "object") return false;
    return [decision.decision, decision.approvedBy, decision.date, decision.status, decision.notes].some((value) => Boolean(text(value)));
  }

  function classifyDecision(decision) {
    const status = text(decision?.status);
    const normalizedStatus = status.toLowerCase();
    const decisionDate = text(decision?.date);
    const issues = [];
    if (!text(decision?.decision)) issues.push("missing-decision");
    if (!text(decision?.approvedBy)) issues.push("missing-approved-by");
    if (!decisionDate) issues.push("missing-date");
    else if (!dateOnly(decisionDate)) issues.push("invalid-date");
    if (!status) issues.push("missing-status");
    else if (!KNOWN_DECISION_LANES[normalizedStatus]) issues.push("unsupported-status");

    const blockingIssues = issues.filter((issue) => issue !== "unsupported-status");
    const lane = blockingIssues.length
      ? "needs-review"
      : KNOWN_DECISION_LANES[normalizedStatus] || "other";
    return Object.freeze({ lane, issues: Object.freeze(issues) });
  }

  function meaningfulTask(task) {
    if (!task || typeof task !== "object") return false;
    return [task.task, task.assignedTo, task.due, task.status].some((value) => Boolean(text(value)));
  }

  function taskState(task) {
    const due = text(task?.due);
    const status = text(task?.status);
    const setupIssues = [];
    if (!text(task?.task)) setupIssues.push("missing-task");
    if (!text(task?.assignedTo)) setupIssues.push("missing-assigned-to");
    if (!due) setupIssues.push("missing-due");
    else if (!dateOnly(due)) setupIssues.push("invalid-due");
    if (!status) setupIssues.push("missing-status");
    return Object.freeze({
      completed: status.toLowerCase() === "completed",
      setupIssues: Object.freeze(setupIssues)
    });
  }

  function outcomeState(flags) {
    const reviewCount = [flags.summary, flags.decisions, flags.followUp].filter(Boolean).length;
    if (reviewCount === 0) return "ready";
    if (reviewCount > 1) return "needs-multiple-reviews";
    if (flags.summary) return "needs-summary";
    if (flags.decisions) return "needs-decision-review";
    return "needs-follow-up-review";
  }

  function firstReviewTarget(state) {
    if (state.reviewFlags.summary) return "summary";
    if (state.reviewFlags.decisions) return "decisions";
    if (state.reviewFlags.followUp) return "tasks";
    return "summary";
  }

  function normalizeMeeting(record, options) {
    const maximumDecisionsPerRecord = options.maximumDecisionsPerRecord;
    const maximumTasksPerRecord = options.maximumTasksPerRecord;
    const allDecisions = (Array.isArray(record?.decisionsList) ? record.decisionsList : []).filter(meaningfulDecision);
    const allTasks = (Array.isArray(record?.tasks) ? record.tasks : []).filter(meaningfulTask);
    const decisionsTruncated = allDecisions.length > maximumDecisionsPerRecord;
    const tasksTruncated = allTasks.length > maximumTasksPerRecord;
    const decisions = allDecisions.slice(0, maximumDecisionsPerRecord).map(classifyDecision);
    const tasks = allTasks.slice(0, maximumTasksPerRecord).map(taskState);
    const laneCounts = {
      approved: decisions.filter((item) => item.lane === "approved").length,
      proposed: decisions.filter((item) => item.lane === "proposed").length,
      deferred: decisions.filter((item) => item.lane === "deferred").length,
      reversed: decisions.filter((item) => item.lane === "reversed").length,
      other: decisions.filter((item) => item.lane === "other").length,
      needsReview: decisions.filter((item) => item.lane === "needs-review").length
    };
    const completedTasks = tasks.filter((item) => item.completed).length;
    const setupIssueTasks = tasks.filter((item) => item.setupIssues.length > 0).length;
    const incompleteTasks = tasks.length - completedTasks;
    const summaryPresent = Boolean(text(record?.summary));
    const freeFormDecisionPresent = Boolean(text(record?.decisions));
    const decisionReviewRequired = decisionsTruncated
      || allDecisions.length === 0
      || laneCounts.needsReview > 0
      || (allDecisions.length === 0 && freeFormDecisionPresent);
    const followUpReviewRequired = tasksTruncated
      || allTasks.length === 0
      || incompleteTasks > 0
      || setupIssueTasks > 0;
    const reviewFlags = Object.freeze({
      summary: !summaryPresent,
      decisions: decisionReviewRequired,
      followUp: followUpReviewRequired
    });
    const state = outcomeState(reviewFlags);

    return {
      recordId: String(record?.id ?? ""),
      meetingNumber: text(record?.meetingNumber),
      title: text(record?.title) || "Untitled Meeting",
      status: text(record?.status) || "Completed",
      date: dateOnly(record?.date)?.raw || text(record?.date),
      summaryPresent,
      structuredDecisionCount: allDecisions.length,
      freeFormDecisionPresent,
      decisionLanes: laneCounts,
      taskCounts: {
        total: allTasks.length,
        completed: completedTasks,
        incomplete: Math.max(0, allTasks.length - completedTasks),
        setupIssues: setupIssueTasks
      },
      reviewFlags,
      outcomeState: state,
      outcomeLabel: OUTCOME_LABELS[state],
      firstReviewTarget: firstReviewTarget({ reviewFlags }),
      truncation: {
        decisions: decisionsTruncated,
        tasks: tasksTruncated
      }
    };
  }

  function compareMeetings(left, right) {
    const leftDate = dateOnly(left.date)?.milliseconds ?? Number.MIN_SAFE_INTEGER;
    const rightDate = dateOnly(right.date)?.milliseconds ?? Number.MIN_SAFE_INTEGER;
    if (leftDate !== rightDate) return rightDate - leftDate;
    return left.title.localeCompare(right.title)
      || left.meetingNumber.localeCompare(right.meetingNumber)
      || left.recordId.localeCompare(right.recordId);
  }

  function buildMeetingOutcomes(records, options = {}) {
    const source = Array.isArray(records) ? records : [];
    const maximumRecords = boundedInteger(options.maximumRecords, 500, 1, 5000);
    const maximumDecisionsPerRecord = boundedInteger(options.maximumDecisionsPerRecord, 100, 1, 1000);
    const maximumTasksPerRecord = boundedInteger(options.maximumTasksPerRecord, 250, 1, 2000);
    const generatedAt = text(options.generatedAt) || new Date().toISOString();
    const eligible = source.filter(isEligibleMeeting);
    const meetings = eligible
      .slice(0, maximumRecords)
      .map((record) => normalizeMeeting(record, { maximumDecisionsPerRecord, maximumTasksPerRecord }))
      .sort(compareMeetings);
    const countState = (state) => meetings.filter((meeting) => meeting.outcomeState === state).length;

    return Object.freeze({
      reportType: "methodz-meeting-outcomes-review",
      reportVersion: VERSION,
      generatedAt,
      counts: Object.freeze({
        savedRecords: source.length,
        eligibleMeetings: eligible.length,
        inReview: meetings.length,
        ready: countState("ready"),
        needsSummary: countState("needs-summary"),
        needsDecisionReview: countState("needs-decision-review"),
        needsFollowUpReview: countState("needs-follow-up-review"),
        needsMultipleReviews: countState("needs-multiple-reviews"),
        openTasks: meetings.reduce((total, meeting) => total + meeting.taskCounts.incomplete, 0)
      }),
      limits: Object.freeze({ maximumRecords, maximumDecisionsPerRecord, maximumTasksPerRecord }),
      truncation: Object.freeze({
        records: eligible.length > maximumRecords,
        decisionLists: meetings.filter((meeting) => meeting.truncation.decisions).length,
        taskLists: meetings.filter((meeting) => meeting.truncation.tasks).length
      }),
      meetings: Object.freeze(meetings)
    });
  }

  return Object.freeze({
    version: VERSION,
    outcomeLabels: OUTCOME_LABELS,
    dateOnly,
    isEligibleMeeting,
    meaningfulDecision,
    classifyDecision,
    meaningfulTask,
    taskState,
    buildMeetingOutcomes
  });
});
