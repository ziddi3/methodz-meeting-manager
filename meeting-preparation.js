/* Read-only browser presentation for the Methodz Meeting Preparation Brief. */
(function initializeMeetingPreparationWorkspace(global) {
  "use strict";

  const PREFERENCE_KEY = "methodzMeetingPreparationPreferencesV1";
  const DEFAULT_HORIZON = 14;
  let currentReport = null;

  const byId = (id) => document.getElementById(id);

  function element(tag, className, content) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content !== undefined) node.textContent = content;
    return node;
  }

  function readPreference() {
    try {
      const parsed = JSON.parse(global.localStorage.getItem(PREFERENCE_KEY)) || {};
      return [7, 14, 30, 60].includes(Number(parsed.horizonDays)) ? Number(parsed.horizonDays) : DEFAULT_HORIZON;
    } catch (_error) {
      return DEFAULT_HORIZON;
    }
  }

  function savePreference(horizonDays) {
    try {
      global.localStorage.setItem(PREFERENCE_KEY, JSON.stringify({ horizonDays }));
    } catch (_error) {
      // Display preferences are optional. Meeting records are never changed here.
    }
  }

  function readLocalRecordsFailClosed() {
    const key = global.METHODZ_MEETING_CONFIG?.storageKeys?.records || "methodzMeetingRecords";
    const raw = global.localStorage.getItem(key);
    if (raw === null || raw === "") return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new TypeError("Saved meeting storage is not an array.");
    return parsed;
  }

  function readRecords() {
    if (global.MethodzMeetingData && typeof global.MethodzMeetingData.listRecords === "function") {
      const adapterId = typeof global.MethodzMeetingData.getAdapterInfo === "function"
        ? global.MethodzMeetingData.getAdapterInfo().id
        : "local-storage";
      if (adapterId === "local-storage") return readLocalRecordsFailClosed();
      const records = global.MethodzMeetingData.listRecords();
      if (!Array.isArray(records)) throw new TypeError("Meeting data adapter did not return an array.");
      return records;
    }
    return readLocalRecordsFailClosed();
  }

  function setStatus(message, tone = "neutral") {
    const status = byId("preparationStatus");
    status.textContent = message;
    status.dataset.tone = tone;
  }

  function metric(label, value) {
    const card = element("div", "preparation-metric");
    card.append(element("strong", "preparation-metric-value", String(value)));
    card.append(element("span", "preparation-metric-label", label));
    return card;
  }

  function renderMetrics(report) {
    const container = byId("preparationMetrics");
    container.replaceChildren(
      metric("Meetings in brief", report.counts.inBrief),
      metric("Need preparation", report.counts.needsPreparation),
      metric("Need scheduling", report.counts.needsScheduling),
      metric("Same-day pressure", report.counts.scheduleCollisions),
      metric("Carryover tasks", report.counts.carryoverTasks)
    );
  }

  function readinessList(meeting) {
    const list = element("ul", "preparation-checklist");
    Object.entries(meeting.readiness.state).forEach(([key, complete]) => {
      const labels = {
        title: "Meeting title",
        date: "Meeting date",
        location: "Location or video link",
        facilitator: "Meeting facilitator",
        organizations: "Organizations present",
        attendees: "Attendee setup",
        agenda: "Agenda setup"
      };
      const item = element("li", complete ? "is-ready" : "needs-work");
      item.textContent = `${complete ? "Ready" : "Missing"}: ${labels[key]}`;
      list.append(item);
    });
    return list;
  }

  function carryoverList(meeting) {
    const section = element("section", "preparation-carryovers");
    const heading = element("h4", "", `Carryover tasks (${meeting.carryovers.total})`);
    section.append(heading);
    if (!meeting.carryovers.items.length) {
      section.append(element("p", "helper-text", "No unresolved tasks from earlier meetings are due by this meeting."));
      return section;
    }
    const list = element("ul", "preparation-task-list");
    meeting.carryovers.items.forEach((item) => {
      const row = element("li", "preparation-task");
      row.append(element("strong", "", item.task || "Untitled follow-up"));
      const details = [
        item.assignedTo ? `Assigned To: ${item.assignedTo}` : "Assigned To missing",
        item.due ? `Due: ${item.due}` : "Due date missing",
        `From: ${item.sourceMeetingTitle}`
      ];
      row.append(element("span", "", details.join(" · ")));
      list.append(row);
    });
    section.append(list);
    if (meeting.carryovers.truncated) section.append(element("p", "helper-text", "Carryover list is bounded; additional tasks are not shown."));
    return section;
  }

  function meetingCard(meeting) {
    const article = element("article", "card preparation-card");
    const header = element("div", "preparation-card-header");
    const identity = element("div", "");
    identity.append(element("p", "eyebrow", meeting.lane === "needs-scheduling" ? "Needs scheduling" : `${meeting.daysUntilMeeting} day${meeting.daysUntilMeeting === 1 ? "" : "s"} away`));
    identity.append(element("h3", "", `${meeting.meetingNumber ? `Meeting #${meeting.meetingNumber}: ` : ""}${meeting.title}`));
    identity.append(element("p", "helper-text", [meeting.date || "No valid date", meeting.location || "No location", meeting.facilitator || "No facilitator"].join(" · ")));
    const score = element("div", `preparation-score ${meeting.readiness.percent === 100 ? "is-complete" : ""}`);
    score.append(element("strong", "", `${meeting.readiness.percent}%`));
    score.append(element("span", "", "ready"));
    header.append(identity, score);
    article.append(header);

    if (meeting.scheduleCollision) {
      article.append(element("p", "preparation-alert", `${meeting.sameDayMeetingCount} active meetings share ${meeting.date}. Review timing and travel requirements.`));
    }

    const grid = element("div", "preparation-card-grid");
    const readiness = element("section", "");
    readiness.append(element("h4", "", "Preparation checklist"), readinessList(meeting));
    grid.append(readiness, carryoverList(meeting));
    article.append(grid);
    return article;
  }

  function renderMeetings(report) {
    const container = byId("preparationMeetings");
    container.replaceChildren();
    if (!report.meetings.length) {
      const empty = element("section", "card preparation-empty");
      empty.append(element("h2", "", "No meetings in this horizon"));
      empty.append(element("p", "helper-text", "The brief found no active scheduled meetings in the selected window and no active meetings missing a valid date."));
      container.append(empty);
      return;
    }
    report.meetings.forEach((meeting) => container.append(meetingCard(meeting)));
    if (report.truncated) container.append(element("p", "helper-text", "The preparation brief is bounded; additional meetings are not shown."));
  }

  function refreshBrief() {
    const core = global.MethodzMeetingPreparationCore;
    if (!core || typeof core.buildMeetingPreparationBrief !== "function") {
      setStatus("Preparation core is unavailable.", "error");
      return;
    }
    try {
      const horizonDays = Number(byId("preparationHorizon").value) || DEFAULT_HORIZON;
      savePreference(horizonDays);
      currentReport = core.buildMeetingPreparationBrief(readRecords(), {
        horizonDays,
        maximumMeetings: 40,
        maximumCarryovers: 20
      });
      renderMetrics(currentReport);
      renderMeetings(currentReport);
      byId("downloadPreparationCsv").disabled = currentReport.meetings.length === 0;
      setStatus(`Prepared ${currentReport.meetings.length} meeting${currentReport.meetings.length === 1 ? "" : "s"} through ${currentReport.horizonEnd}.`, "success");
    } catch (error) {
      console.error("Unable to build Meeting Preparation Brief", error);
      currentReport = null;
      byId("downloadPreparationCsv").disabled = true;
      byId("preparationMetrics").replaceChildren();
      byId("preparationMeetings").replaceChildren();
      setStatus("Saved meeting records could not be read. No records were changed.", "error");
    }
  }

  function csvCell(value) {
    return `"${String(value ?? "").replace(/"/g, '""')}"`;
  }

  function downloadCsv() {
    if (!currentReport?.meetings?.length) return;
    const header = ["Meeting Number", "Title", "Date", "Status", "Location", "Facilitator", "Readiness Percent", "Missing Setup", "Same-Day Meeting Count", "Carryover Tasks"];
    const rows = currentReport.meetings.map((meeting) => [
      meeting.meetingNumber,
      meeting.title,
      meeting.date,
      meeting.status,
      meeting.location,
      meeting.facilitator,
      meeting.readiness.percent,
      meeting.readiness.missing.join("; "),
      meeting.sameDayMeetingCount,
      meeting.carryovers.total
    ]);
    const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `methodz-meeting-preparation-${currentReport.today}.csv`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    setStatus("Preparation CSV downloaded. Protect it as business data.", "success");
  }

  function initialize() {
    byId("preparationHorizon").value = String(readPreference());
    byId("refreshPreparationBrief").addEventListener("click", refreshBrief);
    byId("preparationHorizon").addEventListener("change", refreshBrief);
    byId("downloadPreparationCsv").addEventListener("click", downloadCsv);
    refreshBrief();
  }

  document.addEventListener("DOMContentLoaded", initialize, { once: true });
})(window);
