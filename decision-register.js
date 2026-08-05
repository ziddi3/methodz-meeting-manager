/* Read-only browser presentation for the Methodz Meeting Manager Decision Register. */
(function initializeMethodzDecisionRegister(global) {
  "use strict";

  const VERSION = "1.0.0";
  const PREFERENCE_KEY = "methodzDecisionRegisterPreferencesV1";
  const DEFAULT_LANE = "all";
  const VALID_LANES = new Set(["all", "needs-review", "proposed", "deferred", "approved", "reversed", "other", "unstructured"]);
  let currentReport = null;

  const byId = (id) => document.getElementById(id);
  const text = (value) => String(value ?? "").trim();

  function element(tag, className, content) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content !== undefined) node.textContent = content;
    return node;
  }

  function readPreference() {
    try {
      const parsed = JSON.parse(global.localStorage.getItem(PREFERENCE_KEY)) || {};
      return VALID_LANES.has(parsed.lane) ? parsed.lane : DEFAULT_LANE;
    } catch (_error) {
      return DEFAULT_LANE;
    }
  }

  function savePreference(lane) {
    try {
      global.localStorage.setItem(PREFERENCE_KEY, JSON.stringify({ lane }));
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
    const status = byId("decisionRegisterStatus");
    status.textContent = message;
    status.dataset.tone = tone;
  }

  function metric(label, value) {
    const card = element("div", "decision-register-metric");
    card.append(element("strong", "decision-register-metric-value", String(value)));
    card.append(element("span", "decision-register-metric-label", label));
    return card;
  }

  function renderMetrics(report) {
    byId("decisionRegisterMetrics").replaceChildren(
      metric("Structured decisions", report.counts.structuredDecisions),
      metric("Needs Review", report.counts.needsReview),
      metric("Proposed", report.counts.proposed),
      metric("Deferred", report.counts.deferred),
      metric("Approved", report.counts.approved),
      metric("Reversed", report.counts.reversed),
      metric("Free-form source reviews", report.counts.freeFormOnlyRecords)
    );
  }

  function laneLabel(lane) {
    return {
      "needs-review": "Needs Review",
      proposed: "Proposed",
      deferred: "Deferred",
      approved: "Approved",
      reversed: "Reversed",
      other: "Other",
      unstructured: "Free-form Source Review"
    }[lane] || "Decision";
  }

  function issueLabel(issue) {
    return {
      "missing-decision": "Decision text missing",
      "missing-approved-by": "Approved / Confirmed By missing",
      "missing-date": "Decision date missing",
      "invalid-date": "Decision date invalid",
      "missing-status": "Decision status missing",
      "unsupported-status": "Decision status is outside the configured register lanes"
    }[issue] || issue;
  }

  function sourceDescription(item) {
    return [
      item.meetingNumber ? `Meeting #${item.meetingNumber}` : "Meeting number unavailable",
      item.meetingDate || "Meeting date unavailable",
      item.meetingStatus || "Meeting status unavailable"
    ].join(" · ");
  }

  function sourceLink(item) {
    const launchCore = global.MethodzMeetingPreparationLaunchCore;
    if (!item.recordId || !launchCore || typeof launchCore.createPreparationLaunchHash !== "function") {
      return element("span", "helper-text", "Source record cannot be opened from this entry.");
    }
    const link = element("a", "button-like", "Open Source Meeting");
    link.href = `meeting.html${launchCore.createPreparationLaunchHash(item.recordId, "decisions", "decision-register")}`;
    link.setAttribute("aria-label", `Open ${item.meetingTitle} decisions`);
    return link;
  }

  function decisionCard(entry) {
    const article = element("article", `card decision-register-card lane-${entry.lane}`);
    const header = element("div", "decision-register-card-header");
    const identity = element("div", "");
    identity.append(element("p", "eyebrow", laneLabel(entry.lane)));
    identity.append(element("h3", "", entry.decision || "Structured decision text missing"));
    identity.append(element("p", "helper-text", `${entry.meetingTitle} · ${sourceDescription(entry)}`));
    const badge = element("span", `decision-register-badge lane-${entry.lane}`, entry.status || laneLabel(entry.lane));
    header.append(identity, badge);
    article.append(header);

    const details = element("dl", "decision-register-details");
    const addDetail = (label, value) => {
      details.append(element("dt", "", label), element("dd", "", value || "Not recorded"));
    };
    addDetail("Decision date", entry.decisionDate);
    addDetail("Approved / Confirmed By", entry.approvedBy);
    addDetail("Conditions / Notes", entry.notes);
    article.append(details);

    if (entry.issues.length) {
      const review = element("section", "decision-register-review");
      review.append(element("h4", "", "Review required"));
      const list = element("ul", "");
      entry.issues.forEach((issue) => list.append(element("li", "", issueLabel(issue))));
      review.append(list);
      article.append(review);
    }
    if (entry.truncatedFields.length) {
      article.append(element("p", "decision-register-warning", "This register entry is bounded. Open the source meeting to review the complete value."));
    }

    const actions = element("div", "decision-register-actions");
    actions.append(sourceLink(entry));
    article.append(actions);
    return article;
  }

  function unstructuredCard(item) {
    const article = element("article", "card decision-register-card lane-unstructured");
    const header = element("div", "decision-register-card-header");
    const identity = element("div", "");
    identity.append(element("p", "eyebrow", laneLabel("unstructured")));
    identity.append(element("h3", "", item.meetingTitle));
    identity.append(element("p", "helper-text", sourceDescription(item)));
    header.append(identity, element("span", "decision-register-badge lane-unstructured", "Source Review"));
    article.append(header);
    article.append(element("p", "decision-register-unstructured-copy", "This meeting contains free-form decision notes but no structured decision entries. The register does not interpret or copy that prose."));
    const actions = element("div", "decision-register-actions");
    actions.append(sourceLink(item));
    article.append(actions);
    return article;
  }

  function searchableText(item, type) {
    if (type === "unstructured") {
      return [item.meetingNumber, item.meetingTitle, item.meetingDate, item.meetingStatus, "free-form source review"].join(" ").toLowerCase();
    }
    return [item.meetingNumber, item.meetingTitle, item.meetingDate, item.meetingStatus, item.decision, item.approvedBy, item.decisionDate, item.status, item.notes, ...item.issues].join(" ").toLowerCase();
  }

  function getVisibleItems() {
    if (!currentReport) return [];
    const lane = byId("decisionStatusFilter")?.value || DEFAULT_LANE;
    const query = text(byId("decisionSearchFilter")?.value).toLowerCase();
    const items = [
      ...currentReport.entries.map((entry) => ({ type: "structured", lane: entry.lane, item: entry })),
      ...currentReport.unstructured.map((item) => ({ type: "unstructured", lane: "unstructured", item }))
    ];
    return items.filter((candidate) => {
      if (lane !== "all" && candidate.lane !== lane) return false;
      return !query || searchableText(candidate.item, candidate.type).includes(query);
    });
  }

  function renderVisible() {
    const container = byId("decisionRegisterResults");
    const visible = getVisibleItems();
    container.replaceChildren();

    if (!visible.length) {
      const empty = element("section", "card decision-register-empty");
      empty.append(element("h2", "", "No decisions match this view"));
      empty.append(element("p", "helper-text", "Change the lane or text filter, or refresh after saving structured decisions in the Meeting Manager."));
      container.append(empty);
    } else {
      visible.forEach((candidate) => container.append(candidate.type === "unstructured" ? unstructuredCard(candidate.item) : decisionCard(candidate.item)));
    }

    const truncation = currentReport?.truncation;
    if (truncation && Object.values(truncation).some((value) => value === true)) {
      container.prepend(element("p", "decision-register-warning", "The Decision Register reached a configured processing bound. Open source meetings and review the documented limits before treating this as a complete register."));
    }

    byId("downloadDecisionRegisterCsv").disabled = visible.length === 0;
    setStatus(`Showing ${visible.length} of ${currentReport.entries.length + currentReport.unstructured.length} register item${currentReport.entries.length + currentReport.unstructured.length === 1 ? "" : "s"}.`, "success");
    return visible;
  }

  function refreshRegister() {
    const core = global.MethodzDecisionRegisterCore;
    if (!core || typeof core.buildDecisionRegister !== "function") {
      setStatus("Decision Register core is unavailable.", "error");
      return;
    }
    try {
      currentReport = core.buildDecisionRegister(readRecords(), {
        maximumRecords: 500,
        maximumDecisionsPerRecord: 100,
        maximumEntries: 500,
        maximumUnstructuredRecords: 100
      });
      renderMetrics(currentReport);
      renderVisible();
    } catch (error) {
      console.error("Unable to build Decision Register", error);
      currentReport = null;
      byId("decisionRegisterMetrics").replaceChildren();
      byId("decisionRegisterResults").replaceChildren();
      byId("downloadDecisionRegisterCsv").disabled = true;
      setStatus("Saved meeting records could not be read. No records were changed.", "error");
    }
  }

  function csvCell(value) {
    return `"${String(value ?? "").replace(/"/g, '""')}"`;
  }

  function buildCsv(items = getVisibleItems()) {
    const header = [
      "Entry Type",
      "Source Meeting Number",
      "Source Meeting Title",
      "Meeting Date",
      "Meeting Status",
      "Decision Lane",
      "Decision Status",
      "Decision Date",
      "Decision",
      "Approved / Confirmed By",
      "Decision Conditions / Notes",
      "Review Issues"
    ];
    const rows = items.map(({ type, lane, item }) => type === "unstructured"
      ? ["Free-form source review", item.meetingNumber, item.meetingTitle, item.meetingDate, item.meetingStatus, laneLabel(lane), "", "", "Free-form decision notes require source review", "", "", "Not automatically parsed"]
      : ["Structured decision", item.meetingNumber, item.meetingTitle, item.meetingDate, item.meetingStatus, laneLabel(lane), item.status, item.decisionDate, item.decision, item.approvedBy, item.notes, item.issues.map(issueLabel).join("; ")]);
    return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
  }

  function downloadCsv() {
    const visible = getVisibleItems();
    if (!visible.length) return;
    const blob = new Blob([buildCsv(visible)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `methodz-decision-register-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    setStatus("Visible Decision Register CSV downloaded. Protect it as business data.", "success");
  }

  function initialize() {
    byId("decisionStatusFilter").value = readPreference();
    byId("refreshDecisionRegister").addEventListener("click", refreshRegister);
    byId("decisionStatusFilter").addEventListener("change", (event) => {
      savePreference(event.target.value);
      renderVisible();
    });
    byId("decisionSearchFilter").addEventListener("input", renderVisible);
    byId("downloadDecisionRegisterCsv").addEventListener("click", downloadCsv);
    refreshRegister();
  }

  global.MethodzDecisionRegisterV1617 = Object.freeze({
    version: VERSION,
    refreshRegister,
    renderVisible,
    getVisibleItems,
    buildCsv,
    downloadCsv
  });

  document.addEventListener("DOMContentLoaded", initialize, { once: true });
})(window);
