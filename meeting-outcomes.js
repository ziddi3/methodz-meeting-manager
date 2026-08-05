/* Explicit, read-only browser presentation for Methodz Meeting Outcomes Review. */
(function initializeMeetingOutcomesWorkspace(global) {
  "use strict";

  const VERSION = "1.0.0";
  let currentReport = null;
  let visibleMeetings = [];

  const byId = (id) => document.getElementById(id);
  const text = (value) => String(value ?? "").trim();

  function element(tag, className, content) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content !== undefined) node.textContent = content;
    return node;
  }

  function recordsKey() {
    return global.METHODZ_MEETING_CONFIG?.storageKeys?.records || "methodzMeetingRecords";
  }

  function readRecordsFailClosed() {
    const raw = global.localStorage.getItem(recordsKey());
    if (raw === null || raw === "") return [];
    const records = JSON.parse(raw);
    if (!Array.isArray(records)) throw new TypeError("Saved meeting storage is not an array.");
    return records;
  }

  function setStatus(message, tone = "neutral") {
    const status = byId("meetingOutcomesStatus");
    status.textContent = message;
    status.dataset.tone = tone;
  }

  function setFiltersEnabled(enabled) {
    byId("outcomesStateFilter").disabled = !enabled;
    byId("outcomesSearchFilter").disabled = !enabled;
  }

  function metric(label, value) {
    const card = element("div", "outcomes-metric");
    card.append(element("strong", "", String(value)), element("span", "", label));
    return card;
  }

  function renderMetrics(report) {
    byId("meetingOutcomesMetrics").replaceChildren(
      metric("Meetings in review", report.counts.inReview),
      metric("Ready", report.counts.ready),
      metric("Need summary", report.counts.needsSummary),
      metric("Need decision review", report.counts.needsDecisionReview),
      metric("Need follow-up review", report.counts.needsFollowUpReview),
      metric("Need multiple reviews", report.counts.needsMultipleReviews),
      metric("Incomplete tasks", report.counts.openTasks)
    );
  }

  function meetingSearchText(meeting) {
    return [
      meeting.meetingNumber,
      meeting.title,
      meeting.status,
      meeting.date,
      meeting.outcomeState,
      meeting.outcomeLabel
    ].map(text).join(" ").toLowerCase();
  }

  function filteredMeetings() {
    if (!currentReport) return [];
    const state = byId("outcomesStateFilter").value;
    const query = text(byId("outcomesSearchFilter").value).toLowerCase();
    return currentReport.meetings.filter((meeting) => {
      const stateMatches = state === "all" || meeting.outcomeState === state;
      const queryMatches = !query || meetingSearchText(meeting).includes(query);
      return stateMatches && queryMatches;
    });
  }

  function sourceLink(meeting) {
    const launchCore = global.MethodzMeetingPreparationLaunchCore;
    if (!meeting.recordId || !launchCore || typeof launchCore.createPreparationLaunchHash !== "function") {
      return element("span", "helper-text", "Source meeting reference unavailable");
    }
    try {
      const link = element("a", "button-like", meeting.outcomeState === "ready" ? "Open Source Meeting" : "Review Source Meeting");
      link.href = `meeting.html${launchCore.createPreparationLaunchHash(meeting.recordId, meeting.firstReviewTarget, "outcomes")}`;
      link.setAttribute("aria-label", `Review outcomes for ${meeting.title}`);
      return link;
    } catch (_error) {
      return element("span", "helper-text", "Source meeting reference unavailable");
    }
  }

  function outcomeCard(meeting) {
    const article = element("article", "card outcomes-card");
    const header = element("div", "outcomes-card-header");
    const identity = element("div", "");
    identity.append(element("p", "eyebrow", meeting.outcomeLabel));
    identity.append(element("h3", "", `${meeting.meetingNumber ? `Meeting #${meeting.meetingNumber}: ` : ""}${meeting.title}`));
    identity.append(element("p", "helper-text", [meeting.date || "No valid date", meeting.status].join(" · ")));
    header.append(identity, element("span", `outcomes-badge is-${meeting.outcomeState}`, meeting.outcomeLabel));
    article.append(header);

    const grid = element("div", "outcomes-grid");
    const summary = element("section", "outcomes-panel");
    summary.append(element("h4", "", "Summary capture"));
    summary.append(element("p", "", meeting.summaryPresent ? "Recorded" : "Missing"));

    const decisions = element("section", "outcomes-panel");
    decisions.append(element("h4", "", "Structured decisions"));
    decisions.append(element("p", "", `${meeting.structuredDecisionCount} structured entr${meeting.structuredDecisionCount === 1 ? "y" : "ies"}`));
    decisions.append(element("p", "helper-text", `Approved ${meeting.decisionLanes.approved} · Proposed ${meeting.decisionLanes.proposed} · Deferred ${meeting.decisionLanes.deferred} · Reversed ${meeting.decisionLanes.reversed} · Other ${meeting.decisionLanes.other} · Needs review ${meeting.decisionLanes.needsReview}`));
    if (meeting.freeFormDecisionPresent && meeting.structuredDecisionCount === 0) {
      decisions.append(element("p", "helper-text", "Free-form decision capture exists; source review is required. Prose was not copied or parsed."));
    }

    const tasks = element("section", "outcomes-panel");
    tasks.append(element("h4", "", "Follow-up state"));
    tasks.append(element("p", "", `${meeting.taskCounts.completed}/${meeting.taskCounts.total} completed`));
    tasks.append(element("p", "helper-text", `${meeting.taskCounts.incomplete} incomplete · ${meeting.taskCounts.setupIssues} with setup issues`));
    grid.append(summary, decisions, tasks);
    article.append(grid);

    if (meeting.truncation.decisions || meeting.truncation.tasks) {
      article.append(element("p", "outcomes-alert", "A source collection exceeded its processing bound. Manual source review is required."));
    }
    if (meeting.outcomeState !== "ready") {
      const gaps = [];
      if (meeting.reviewFlags.summary) gaps.push("summary");
      if (meeting.reviewFlags.decisions) gaps.push("decision capture");
      if (meeting.reviewFlags.followUp) gaps.push("follow-up state");
      article.append(element("p", "outcomes-alert", `Review required: ${gaps.join(", ")}.`));
    }

    const actions = element("div", "outcomes-actions");
    actions.append(sourceLink(meeting));
    article.append(actions);
    return article;
  }

  function renderMeetings() {
    const container = byId("meetingOutcomesResults");
    container.replaceChildren();
    visibleMeetings = filteredMeetings();

    if (!visibleMeetings.length) {
      const empty = element("section", "card outcomes-empty");
      empty.append(element("h2", "", currentReport ? "No meetings match this view" : "Outcomes Review not refreshed"));
      empty.append(element("p", "helper-text", currentReport
        ? "Change the state filter or search text. No meeting record was changed."
        : "Use Refresh Outcomes to read completed and archived meeting records."));
      container.append(empty);
    } else {
      visibleMeetings.forEach((meeting) => container.append(outcomeCard(meeting)));
    }

    byId("downloadMeetingOutcomesCsv").disabled = visibleMeetings.length === 0;
    byId("meetingOutcomesFilterSummary").textContent = currentReport
      ? `Showing ${visibleMeetings.length} of ${currentReport.meetings.length} meeting outcome(s).`
      : "No outcomes review has been built.";
  }

  function refreshOutcomes() {
    const core = global.MethodzMeetingOutcomesCore;
    if (!core || typeof core.buildMeetingOutcomes !== "function") {
      setStatus("Meeting Outcomes core is unavailable.", "error");
      return;
    }
    try {
      currentReport = core.buildMeetingOutcomes(readRecordsFailClosed(), {
        maximumRecords: 500,
        maximumDecisionsPerRecord: 100,
        maximumTasksPerRecord: 250
      });
      setFiltersEnabled(true);
      renderMetrics(currentReport);
      renderMeetings();
      const warnings = [];
      if (currentReport.truncation.records) warnings.push("record bound reached");
      if (currentReport.truncation.decisionLists) warnings.push(`${currentReport.truncation.decisionLists} decision list(s) exceeded the bound`);
      if (currentReport.truncation.taskLists) warnings.push(`${currentReport.truncation.taskLists} task list(s) exceeded the bound`);
      setStatus(
        `Outcomes refreshed for ${currentReport.counts.inReview} completed or archived meeting(s).${warnings.length ? ` Manual review required: ${warnings.join("; ")}.` : ""}`,
        warnings.length ? "warning" : "success"
      );
    } catch (error) {
      console.error("Unable to build Meeting Outcomes Review", error);
      currentReport = null;
      visibleMeetings = [];
      setFiltersEnabled(false);
      byId("downloadMeetingOutcomesCsv").disabled = true;
      byId("meetingOutcomesMetrics").replaceChildren();
      renderMeetings();
      setStatus("Saved meeting records could not be read. No records were changed.", "error");
    }
  }

  function spreadsheetSafe(value) {
    const normalized = String(value ?? "");
    return /^[=+\-@]/.test(normalized) ? `'${normalized}` : normalized;
  }

  function csvCell(value) {
    return `"${spreadsheetSafe(value).replace(/"/g, '""')}"`;
  }

  function csvRows() {
    const header = [
      "Meeting Number",
      "Meeting Title",
      "Meeting Date",
      "Meeting Status",
      "Outcome State",
      "Summary Recorded",
      "Structured Decisions",
      "Approved Decisions",
      "Proposed Decisions",
      "Deferred Decisions",
      "Reversed Decisions",
      "Other Decision Statuses",
      "Decision Entries Needing Review",
      "Free-Form Decision Capture Present",
      "Follow-Up Tasks",
      "Completed Tasks",
      "Incomplete Tasks",
      "Tasks With Setup Issues"
    ];
    const rows = visibleMeetings.map((meeting) => [
      meeting.meetingNumber,
      meeting.title,
      meeting.date,
      meeting.status,
      meeting.outcomeLabel,
      meeting.summaryPresent ? "Yes" : "No",
      meeting.structuredDecisionCount,
      meeting.decisionLanes.approved,
      meeting.decisionLanes.proposed,
      meeting.decisionLanes.deferred,
      meeting.decisionLanes.reversed,
      meeting.decisionLanes.other,
      meeting.decisionLanes.needsReview,
      meeting.freeFormDecisionPresent ? "Yes" : "No",
      meeting.taskCounts.total,
      meeting.taskCounts.completed,
      meeting.taskCounts.incomplete,
      meeting.taskCounts.setupIssues
    ]);
    return [header, ...rows];
  }

  function downloadCsv() {
    if (!currentReport || !visibleMeetings.length) return;
    const csv = csvRows().map((row) => row.map(csvCell).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `methodz-meeting-outcomes-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    setStatus("Visible Meeting Outcomes CSV downloaded. Protect it as business data.", "success");
  }

  function initialize() {
    setFiltersEnabled(false);
    byId("refreshMeetingOutcomes").addEventListener("click", refreshOutcomes);
    byId("outcomesStateFilter").addEventListener("change", renderMeetings);
    byId("outcomesSearchFilter").addEventListener("input", renderMeetings);
    byId("downloadMeetingOutcomesCsv").addEventListener("click", downloadCsv);
    renderMeetings();
  }

  global.MethodzMeetingOutcomesWorkspace = Object.freeze({
    version: VERSION,
    refreshOutcomes,
    renderMeetings
  });

  document.addEventListener("DOMContentLoaded", initialize, { once: true });
})(window);
